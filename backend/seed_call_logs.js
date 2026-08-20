const db = require('./src/config/db');

async function seedCallLogs() {
  try {
    const logs = [
      ['14 Jul 2026', '22:28:06', '0502060426', '00:00:15'],
      ['14 Jul 2026', '22:35:23', '0523909665', '00:00:29'],
      ['15 Jul 2026', '09:15:19', '0564275455', '00:00:26'],
      ['15 Jul 2026', '09:32:48', '0561779401', '00:01:02'],
      ['15 Jul 2026', '09:50:26', '0502220388', '00:04:19'],
      ['15 Jul 2026', '10:01:57', '0564275455', '00:02:10'],
      ['15 Jul 2026', '10:34:12', '0521861963', '00:03:47'],
      ['15 Jul 2026', '11:14:18', '0521861963', '00:02:34'],
      ['15 Jul 2026', '12:08:12', '0502220388', '00:00:47'],
      ['15 Jul 2026', '12:34:45', '0521861963', '00:01:06'],
      ['15 Jul 2026', '12:59:43', '0558405473', '00:00:44'],
      ['15 Jul 2026', '13:35:10', '0524806401', '00:00:12'],
      ['15 Jul 2026', '13:38:45', '0561779401', '00:01:16'],
      ['15 Jul 2026', '13:41:15', '0524806401', '00:00:18'],
      ['15 Jul 2026', '14:14:58', '0558405473', '00:00:50'],
      ['15 Jul 2026', '14:16:02', '0551188101', '00:00:30'],
      ['15 Jul 2026', '16:09:53', '0555934544', '00:00:21'],
      ['15 Jul 2026', '16:21:37', '0521861963', '00:02:17'],
      ['15 Jul 2026', '16:27:41', '0555934544', '00:00:12'],
      ['15 Jul 2026', '17:52:00', '0558405473', '00:00:25'],
      ['15 Jul 2026', '18:00:25', '0521861963', '00:00:23'],
      ['15 Jul 2026', '18:09:38', '0556062513', '00:00:31'],
      ['15 Jul 2026', '19:02:22', '0555934544', '00:01:10'],
      ['15 Jul 2026', '19:30:28', '0565659983', '00:00:20'],
      ['15 Jul 2026', '22:12:49', '0565659983', '00:00:26']
    ];

    await db.query('DELETE FROM tbl_telecome_call_logs');

    for (const l of logs) {
      await db.query(
        `INSERT INTO tbl_telecome_call_logs 
          (tele_bill_id, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [3, 'INV2045264801', '0522486345', l[0], l[1], l[2], l[3], 'Calls to Mobile', 0.00]
      );

      await db.query(
        `INSERT INTO tbl_telecome_call_logs 
          (tele_bill_id, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [4, 'I4008352339', '0524806401', l[0], l[1], l[2], l[3], 'Calls to Mobile', 0.00]
      );
    }

    console.log('SEEDED 25 REALISTIC CALL LOGS FOR EACH BILL SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding call logs:', err);
    process.exit(1);
  }
}

seedCallLogs();
