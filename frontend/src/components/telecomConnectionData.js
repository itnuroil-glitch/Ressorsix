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
export const STATIC_TELECOM_HISTORY_LOGS = [];

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

