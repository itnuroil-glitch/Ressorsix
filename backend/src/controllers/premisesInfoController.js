const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');


// @desc    Get next auto-generated premise code (e.g. PRE-0001)
// @route   GET /api/premises-info/next-code
// @access  Public
exports.getNextPremiseCode = async (req, res) => {
  try {
    const seqRes = await db.query("SELECT nextval('seq_premise_code') AS next_val");
    const nextVal = seqRes.rows[0].next_val;
    const code = `PRE-${String(nextVal).padStart(4, '0')}`;
    res.status(200).json({ code });
  } catch (error) {
    console.error('Error getting next premise code:', error);
    // Fallback: check count from table
    try {
      const countRes = await db.query('SELECT COUNT(*) FROM tbl_premises_info');
      const fallbackCode = `PRE-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
      return res.status(200).json({ code: fallbackCode });
    } catch (e) {
      res.status(500).json({ message: 'Error generating premise code' });
    }
  }
};

// @desc    Get all premises info records
// @route   GET /api/premises-info
// @access  Public
exports.getAllPremises = async (req, res) => {
  try {
    const { clientid, company_id, search } = req.query;

    let query = `
      SELECT 
        p.*,
        c.company_name,
        d.department_name,
        COALESCE(NULLIF(TRIM(e.first_name || ' ' || COALESCE(e.last_name, '')), ''), e.full_name, e.first_name, e.email) AS responsible_person_name
      FROM tbl_premises_info p
      LEFT JOIN company c ON p.company_id = c.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN employee e ON p.responsible_person_id = e.id
      WHERE (p.is_deleted = false OR p.is_deleted IS NULL)
    `;
    const params = [];

    if (clientid) {
      params.push(clientid);
      query += ` AND p.client_id = $${params.length}`;
    }

    if (company_id) {
      params.push(company_id);
      query += ` AND p.company_id = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        p.premise_name ILIKE $${params.length} 
        OR p.premise_code ILIKE $${params.length} 
        OR p.premise_type ILIKE $${params.length}
        OR c.company_name ILIKE $${params.length}
      )`;
    }

    query += ' ORDER BY p.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching premises info:', error);
    res.status(500).json({ message: 'Error fetching premises info records' });
  }
};

// @desc    Get single premise by ID
// @route   GET /api/premises-info/:id
// @access  Public
exports.getPremiseById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        p.*,
        c.company_name,
        d.department_name,
        COALESCE(NULLIF(TRIM(e.first_name || ' ' || COALESCE(e.last_name, '')), ''), e.full_name, e.first_name, e.email) AS responsible_person_name
      FROM tbl_premises_info p
      LEFT JOIN company c ON p.company_id = c.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN employee e ON p.responsible_person_id = e.id
      WHERE p.id = $1 AND (p.is_deleted = false OR p.is_deleted IS NULL)
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Premise not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching premise by ID:', error);
    res.status(500).json({ message: 'Error fetching premise record' });
  }
};

// @desc    Create new premise info record
// @route   POST /api/premises-info
// @access  Public
// Ensure Step 2: Location & Size columns exist in tbl_premises_info
let tableChecked = false;
async function ensureColumns() {
  if (tableChecked) return;
  try {
    await db.query(`
      ALTER TABLE tbl_premises_info 
        ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'UAE',
        ADD COLUMN IF NOT EXISTS emirate VARCHAR(100),
        ADD COLUMN IF NOT EXISTS area_location VARCHAR(255),
        ADD COLUMN IF NOT EXISTS building_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS plot_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS floor VARCHAR(100),
        ADD COLUMN IF NOT EXISTS makani_map_link TEXT,
        ADD COLUMN IF NOT EXISTS area_sqft NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS handover_date DATE,
        ADD COLUMN IF NOT EXISTS exit_date DATE,
        ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    tableChecked = true;
  } catch (err) {
    console.error('Error ensuring tbl_premises_info columns:', err.message);
  }
}
ensureColumns();

// @desc    Create new premise info record
// @route   POST /api/premises-info
// @access  Public
exports.createPremise = async (req, res) => {
  try {
    await ensureColumns();
    let {
      client_id,
      company_id,
      premise_code,
      premise_name,
      premise_type,
      tenure,
      occupancy_status,
      department_id,
      business_activity,
      responsible_person_id,
      status,
      // Step 2: Location & Size
      country,
      emirate,
      area_location,
      building_name,
      plot_number,
      unit_number,
      floor,
      makani_map_link,
      area_sqft,
      handover_date,
      exit_date,
      notes
    } = req.body;

    // Validate required fields
    if (!company_id) {
      return res.status(400).json({ message: 'Company is required.' });
    }
    if (!premise_name || !premise_name.trim()) {
      return res.status(400).json({ message: 'Premise Name is required.' });
    }
    if (premise_name.trim().length > 150) {
      return res.status(400).json({ message: 'Premise Name cannot exceed 150 characters.' });
    }
    if (!premise_type) {
      return res.status(400).json({ message: 'Premise Type is required.' });
    }
    if (!tenure) {
      return res.status(400).json({ message: 'Tenure is required.' });
    }

    // Rule: Exit Date >= Handover Date
    if (handover_date && exit_date && new Date(exit_date) < new Date(handover_date)) {
      return res.status(400).json({ message: 'Exit Date must be on or after Handover Date.' });
    }

    // Auto-generate premise_code if not supplied
    if (!premise_code || !premise_code.trim()) {
      const seqRes = await db.query("SELECT nextval('seq_premise_code') AS next_val");
      premise_code = `PRE-${String(seqRes.rows[0].next_val).padStart(4, '0')}`;
    }

    const query = `
      INSERT INTO tbl_premises_info (
        client_id, company_id, premise_code, premise_name, premise_type,
        tenure, occupancy_status, department_id, business_activity,
        responsible_person_id, status,
        country, emirate, area_location, building_name,
        plot_number, unit_number, floor, makani_map_link,
        area_sqft, handover_date, exit_date, notes,
        is_deleted, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      client_id || null,
      company_id,
      premise_code.trim(),
      premise_name.trim(),
      premise_type,
      tenure,
      occupancy_status || 'Active',
      department_id || null,
      business_activity || null,
      responsible_person_id || null,
      status || 'Active',
      country || 'UAE',
      emirate || null,
      area_location || null,
      building_name || null,
      plot_number || null,
      unit_number || null,
      floor || null,
      makani_map_link || null,
      area_sqft ? parseFloat(area_sqft) : null,
      handover_date || null,
      exit_date || null,
      notes || null
    ];

    const result = await db.query(query, values);
    const createdRow = result.rows[0];

    // Log creation in audit history
    logAudit({
      req,
      module_name: 'PREMISES',
      record_id: createdRow.id,
      record_title: createdRow.premise_name,
      action_type: 'CREATE',
      action_summary: `Created premise "${createdRow.premise_name}" (${createdRow.premise_code})`,
      new_data: createdRow
    }).catch(e => console.error('Failed to log premise creation audit:', e));

    res.status(201).json(createdRow);
  } catch (error) {
    console.error('Error creating premise:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'A premise with this code already exists.' });
    }
    res.status(500).json({ message: 'Error creating premise record', error: error.message });
  }
};

// @desc    Update premise info record
// @route   PUT /api/premises-info/:id
// @access  Public
exports.updatePremise = async (req, res) => {
  try {
    await ensureColumns();
    const { id } = req.params;
    const {
      client_id,
      company_id,
      premise_code,
      premise_name,
      premise_type,
      tenure,
      occupancy_status,
      department_id,
      business_activity,
      responsible_person_id,
      status,
      // Step 2: Location & Size
      country,
      emirate,
      area_location,
      building_name,
      plot_number,
      unit_number,
      floor,
      makani_map_link,
      area_sqft,
      handover_date,
      exit_date,
      notes
    } = req.body;

    // Check if exists
    const checkRes = await db.query('SELECT * FROM tbl_premises_info WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Premise not found' });
    }
    const oldData = checkRes.rows[0];

    if (premise_name && premise_name.trim().length > 150) {
      return res.status(400).json({ message: 'Premise Name cannot exceed 150 characters.' });
    }

    // Rule: Exit Date >= Handover Date
    if (handover_date && exit_date && new Date(exit_date) < new Date(handover_date)) {
      return res.status(400).json({ message: 'Exit Date must be on or after Handover Date.' });
    }

    const query = `
      UPDATE tbl_premises_info
      SET 
        client_id = COALESCE($1, client_id),
        company_id = COALESCE($2, company_id),
        premise_code = COALESCE($3, premise_code),
        premise_name = COALESCE($4, premise_name),
        premise_type = COALESCE($5, premise_type),
        tenure = COALESCE($6, tenure),
        occupancy_status = COALESCE($7, occupancy_status),
        department_id = $8,
        business_activity = $9,
        responsible_person_id = $10,
        status = COALESCE($11, status),
        country = COALESCE($12, country),
        emirate = $13,
        area_location = $14,
        building_name = $15,
        plot_number = $16,
        unit_number = $17,
        floor = $18,
        makani_map_link = $19,
        area_sqft = $20,
        handover_date = $21,
        exit_date = $22,
        notes = $23,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *
    `;

    const values = [
      client_id || null,
      company_id,
      premise_code ? premise_code.trim() : null,
      premise_name ? premise_name.trim() : null,
      premise_type,
      tenure,
      occupancy_status,
      department_id || null,
      business_activity || null,
      responsible_person_id || null,
      status,
      country || 'UAE',
      emirate || null,
      area_location || null,
      building_name || null,
      plot_number || null,
      unit_number || null,
      floor || null,
      makani_map_link || null,
      area_sqft ? parseFloat(area_sqft) : null,
      handover_date || null,
      exit_date || null,
      notes || null,
      id
    ];

    const result = await db.query(query, values);
    const updatedRow = result.rows[0];

    // Log update in audit history
    logAudit({
      req,
      module_name: 'PREMISES',
      record_id: id,
      record_title: updatedRow.premise_name,
      action_type: 'UPDATE',
      old_data: oldData,
      new_data: updatedRow
    }).catch(e => console.error('Failed to log premise update audit:', e));

    res.status(200).json(updatedRow);
  } catch (error) {
    console.error('Error updating premise:', error);
    res.status(500).json({ message: 'Error updating premise record' });
  }
};

// @desc    Delete premise info record (Soft delete)
// @route   DELETE /api/premises-info/:id
// @access  Public
exports.deletePremise = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE tbl_premises_info 
      SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Premise not found' });
    }

    const deletedRow = result.rows[0];

    // Log deletion in audit history
    logAudit({
      req,
      module_name: 'PREMISES',
      record_id: id,
      record_title: deletedRow?.premise_name || `Premise #${id}`,
      action_type: 'DELETE',
      action_summary: `Deleted premise "${deletedRow?.premise_name || id}" (${deletedRow?.premise_code || ''})`,
      old_data: deletedRow
    }).catch(e => console.error('Failed to log premise deletion audit:', e));

    res.status(200).json({ message: 'Premise record deleted successfully' });

  } catch (error) {
    console.error('Error deleting premise:', error);
    res.status(500).json({ message: 'Error deleting premise record' });
  }
};
