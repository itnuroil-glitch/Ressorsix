// -----------------------------------------------------------------------------
// TELECOM CONNECTIONS MASTER DATASET (EXACT UI REPLICA)
// Matches live table with Company, Type, Provider, Number, Employee,
// Plan Name, Monthly Amount, Sep 2026 Bill, Excess Flag, and Status.
// -----------------------------------------------------------------------------

export const STATIC_CONNECTION_TYPES = [
  'All Types',
  'SIM',
  'Internet',
  'Landline'
];

export const STATIC_COMPANIES = [
  'All Companies',
  'ASAS Gen Tr LLC',
  'Nuragro FZE',
  'Bynur Agro Trading LLC',
  'Klenplus General Trading LLC'
];

export const STATIC_PROVIDERS = [
  'All Providers',
  'e& (Etisalat)',
  'du',
  'STC Business',
  'Ooredoo'
];

export const STATIC_DATA_UNITS = ['GB', 'MB', 'TB', 'Unlimited'];

export const INITIAL_TELECOM_CONNECTIONS = [];

// Audit logs for History button
export const STATIC_TELECOM_HISTORY_LOGS = [
  { id: 'LOG-1', action: 'Created Connection', line: '0527901846', user: 'Krish', date: '15 Oct 2026 15:42', details: 'Added new SIM connection under ASAS Gen Tr LLC' },
  { id: 'LOG-2', action: 'Bill Audited', line: '0501070455', user: 'Automated Billing OCR', date: '01 Oct 2026 09:15', details: 'Sep 2026 excess usage flagged: AED 941.70 (+741.70 over plan)' },
  { id: 'LOG-3', action: 'Employee De-assigned', line: '0586942412', user: 'HR Admin', date: '30 Sep 2026 17:00', details: 'Line moved to UNASSIGNED after Leena Thomas departure' },
  { id: 'LOG-4', action: 'Plan Upgraded', line: '04-2856310', user: 'IT Director', date: '01 Jun 2026 11:30', details: 'Upgraded from 200 Mbps to Business Fibre 500 Mbps' },
  { id: 'LOG-5', action: 'Excess Alert', line: '06-5351769', user: 'System', date: '01 Oct 2026 09:15', details: 'Sep 2026 excess usage: AED 286.30 (+136.30 over plan)' }
];

export const STATIC_EMPLOYEES = [
  { id: 'EMP-1', name: 'Ahmed Rashid', company: 'ASAS Gen Tr LLC', joinDate: '01/01/2026' },
  { id: 'EMP-2', name: 'Priya Nair', company: 'ASAS Gen Tr LLC', joinDate: '04/12/2024' },
  { id: 'EMP-3', name: 'Head office', company: 'ASAS Gen Tr LLC', joinDate: '01/06/2024' },
  { id: 'EMP-4', name: 'Omar Khalid', company: 'Nuragro FZE', joinDate: '15/03/2025' },
  { id: 'EMP-5', name: 'Sara Ali', company: 'Nuragro FZE', joinDate: '10/02/2026' },
  { id: 'EMP-6', name: 'Warehouse Depot', company: 'Nuragro FZE', joinDate: '01/05/2025' },
  { id: 'EMP-7', name: 'Reception', company: 'Bynur Agro Trading LLC', joinDate: '10/08/2024' },
  { id: 'EMP-8', name: 'Dubai Head Office', company: 'Bynur Agro Trading LLC', joinDate: '01/01/2024' },
  { id: 'EMP-9', name: 'Tariq Mansoor', company: 'Klenplus General Trading LLC', joinDate: '15/01/2025' },
  { id: 'EMP-10', name: 'Fatima Al Zahra', company: 'ASAS Gen Tr LLC', joinDate: '01/02/2025' },
  { id: 'EMP-11', name: 'Unassigned', company: 'All', joinDate: '' },
];

