// -----------------------------------------------------------------------------
// TELECOM REFERENCE & AUDITED MONTHLY DATASETS (JUN, AUG, SEP 2026)
// Integrated with Group Line Management (Connections) Metadata
// -----------------------------------------------------------------------------

export const CONNECTION_LINES = [
  {
    mobile: '0527901846',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Unassigned (Assigned to Fatima Zahra)',
    holderType: 'Employee',
    employeeId: 'EMP-1042',
    department: 'HR',
    costCenter: 'CC-210',
    grade: 'G6',
    lineManager: 'Priya Nair',
    plan: 'Standard 100 AED Plan',
    limit: 100,
    contractTo: '24 Nov 2026',
    renewalStatus: '45 days left',
    status: 'Active',
    handoverNote: 'SIM handed over with company handset.',
    policyVersion: 'v2 (effective 01 Jan 2026)'
  },
  {
    mobile: '0586942412',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Ahmed Rashid',
    holderType: 'Employee',
    department: 'Sales',
    costCenter: 'CC-102',
    grade: 'G5',
    lineManager: 'Sales Director',
    plan: 'Normal 100 AED Plan',
    limit: 150,
    contractTo: '12 Mar 2027',
    renewalStatus: '153 days',
    status: 'Active'
  },
  {
    mobile: '0555934544',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Priya Nair',
    holderType: 'Employee',
    department: 'Finance',
    costCenter: 'CC-101',
    grade: 'G7',
    lineManager: 'CFO',
    plan: 'Standard 200 AED Plan',
    limit: 200,
    contractTo: '03 Dec 2026',
    renewalStatus: 'Renewal in progress',
    status: 'Active'
  },
  {
    mobile: '0523409157',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Nadia Yousef',
    holderType: 'Employee',
    department: 'Accounts',
    costCenter: 'CC-103',
    grade: 'G5',
    lineManager: 'Priya Nair',
    plan: 'Normal 100 AED Plan',
    limit: 100,
    contractTo: '30 Sep 2026',
    renewalStatus: 'Expired 10 days ago',
    status: 'Active'
  },
  {
    mobile: '0543051035',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Sharjah warehouse',
    holderType: 'Site',
    department: 'Logistics',
    costCenter: 'CC-104',
    grade: 'Site Router / Terminal',
    lineManager: 'Warehouse In-charge',
    plan: 'Special SMB offer5 / National Business (10.5 GB)',
    limit: 100,
    contractTo: '21 Aug 2027',
    renewalStatus: '315 days',
    status: 'Active'
  },
  {
    mobile: '0522486345',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Fatima Zahra',
    holderType: 'Employee',
    employeeId: 'EMP-1042',
    department: 'HR & Executive Relations',
    costCenter: 'CC-210',
    grade: 'G6',
    lineManager: 'Priya Nair',
    plan: 'Business Special (24 GB)',
    limit: 100,
    contractTo: '24 Nov 2026',
    renewalStatus: '45 days left',
    status: 'Active'
  },
  {
    mobile: '0569255721',
    account: 'Acct 3208 1190',
    company: 'Bynur Agro Trading L.L.C',
    provider: 'e& (Etisalat)',
    holder: 'Joseph Mathew',
    holderType: 'Employee',
    department: 'Operations',
    costCenter: 'CC-310',
    grade: 'G5',
    lineManager: 'Operations Director',
    plan: 'Business First Plus (7.5 GB)',
    limit: 100,
    contractTo: '14 Nov 2026',
    renewalStatus: '35 days left',
    status: 'Active'
  },
  {
    mobile: '0507385301',
    account: 'Acct 3104 7712',
    company: 'Nuragro FZE',
    provider: 'e& (Etisalat)',
    holder: 'Sara Ali',
    holderType: 'Employee',
    department: 'Admin',
    costCenter: 'CC-401',
    grade: 'G6',
    lineManager: 'General Manager',
    plan: 'Standard 100 AED Plan',
    limit: 200,
    contractTo: '05 Feb 2027',
    renewalStatus: '118 days',
    status: 'Active'
  },
  {
    mobile: '0569936095',
    account: 'Acct 3001 2845',
    company: 'ASAS Gen Tr LLC',
    provider: 'e& (Etisalat)',
    holder: 'Unassigned (Pool)',
    holderType: 'Pool',
    department: 'Company Pool',
    costCenter: 'CC-999',
    grade: 'Pool',
    lineManager: 'IT Admin',
    plan: 'Standard 200 AED Plan',
    limit: 200,
    contractTo: '18 Jun 2027',
    renewalStatus: '251 days',
    status: 'Pool'
  }
];

export const TELECOM_DATASETS = {
  // ---------------------------------------------------------------------------
  // 1. ASAS GEN TR LLC · 054 305 1035 · August 2026 (AED 258.81)
  // ---------------------------------------------------------------------------
  'ASAS-0543051035-AUG2026': {
    id: 'ASAS-0543051035-AUG2026',
    key: 'ASAS-0543051035-AUG2026',
    account: {
      companyName: 'ASAS GEN TR LLC',
      mobileNumber: '054 305 1035',
      billNumber: 'INV2048551311',
      billingPeriod: '1–31 August 2026',
      periodLabel: 'Aug 2026',
      dueDate: '15 Sep 2026',
      provider: 'e& (Etisalat)',
      auditor: '@Navaneetha Krishnan',
      reportDate: 'Oct 3, 2026',
      planName: 'Special SMB offer5 (10.5 GB)',
      holder: 'Sharjah warehouse',
      holderType: 'Site',
      costCenter: 'CC-104 (Logistics)',
      grade: 'Site Router / Terminal',
      lineManager: 'Warehouse In-charge',
      approvedLimit: '100.00',
      contractTo: '21 Aug 2027',
      contractDays: '315 days left',
      lineStatus: 'Active',
      connectionType: 'Mobile voice + Data SIM',
      excessPolicy: 'Company absorbed (Operations)',
      policyVersion: 'v2 (effective 01 Jan 2026)'
    },
    billSummary: {
      totalBill: '258.81',
      planAmountExclVat: '100.00',
      planAmountInclVat: '105.00',
      totalExclVat: '247.72',
      totalVat: '11.09',
      extraUsageAmount: '153.81',
      extraCallChargesBeforeVat: '117.92',
      parkingTotalInclVat: '29.99',
      dataAddonInclVat: '0.00',
      includedMinutesEstimated: 900,
      minutesUsedTotal: 1374,
      exhaustionDate: '17 Aug 2026',
      exhaustionTime: '15:27',
      dataUsedGB: '10.01',
      dataIncludedGB: '10.5',
      previousBalance: '0.00',
      paymentsReceived: '0.00',
      balanceCarriedForward: '0.00',
      totalCalls: 640,
      uniqueNumbers: 75,
      avgCallDuration: '2:09'
    },
    budgetSplit: [
      { name: 'Contractual Plan', amt: '105.00', pct: '40.6%', color: '#1E293B' },
      { name: 'Extra Mobile Calls', amt: '120.71', pct: '46.6%', color: '#E11D48' },
      { name: 'Sharjah Parking & SMS', amt: '29.99', pct: '11.6%', color: '#D97706' },
      { name: 'Landline 06-5995922', amt: '3.11', pct: '1.2%', color: '#7C3AED' },
    ],
    billItems: [
      { id: '1', item: 'Monthly plan (Special SMB offer5, 10.5 GB)', amt: '100.00', vat: '5.00', total: '105.00', category: 'Plan Subscription', isPlan: true, taxRate: '5%' },
      { id: '2', item: 'Extra calls to mobiles (after free minutes ran out)', amt: '114.96', vat: '5.75', total: '120.71', category: 'Extra Local Calls', isPlan: false, taxRate: '5%' },
      { id: '3', item: 'Extra calls to landline 06-5995922', amt: '2.96', vat: '0.15', total: '3.11', category: 'Extra Landline Calls', isPlan: false, taxRate: '5%' },
      { id: '4', item: 'Parking SMS to 05566 (10 SMS)', amt: '3.80', vat: '0.19', total: '3.99', category: 'Parking SMS Carrier Fee', isPlan: false, taxRate: '5%' },
      { id: '5', item: 'Sharjah mParking fees (no VAT)', amt: '26.00', vat: '0.00', total: '26.00', category: 'Sharjah mParking Municipal Fee', isPlan: false, taxRate: '0%' },
    ],
    dialledNumbers: [
      { rank: 1, number: '052 503 8532', calls: 131, totalDuration: '3:33:39', avgDuration: '1:38', longestCall: '0:17:28', daysCalled: 28, chargedDuration: '1:09:00', extraCost: 20.82, totalMinutes: 213.7, chargedMinutes: 69.0, notes: 'Called most often (20.5% of all calls). Active on 28 of 31 days.' },
      { rank: 2, number: '052 480 6401', calls: 79, totalDuration: '1:38:52', avgDuration: '1:15', longestCall: '0:11:35', daysCalled: 24, chargedDuration: '0:29:54', extraCost: 8.73, totalMinutes: 98.9, chargedMinutes: 29.9, notes: 'Top 3 frequency contact (12.3% of calls).' },
      { rank: 3, number: '056 842 1267', calls: 69, totalDuration: '2:44:15', avgDuration: '2:23', longestCall: '0:28:02', daysCalled: 22, chargedDuration: '1:09:42', extraCost: 21.02, totalMinutes: 164.2, chargedMinutes: 69.7, notes: 'Highest cost driver (AED 21.02 extra).' },
      { rank: 4, number: '052 390 9665', calls: 54, totalDuration: '4:46:21', avgDuration: '5:18', longestCall: '0:26:24', daysCalled: 19, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 286.4, chargedMinutes: 0.0, notes: 'Longest talk time (286 min, 20.8% of talk time); all calls fell inside plan before 17 Aug.' },
      { rank: 5, number: '055 974 2427', calls: 42, totalDuration: '0:45:36', avgDuration: '1:05', longestCall: '0:05:02', daysCalled: 18, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 45.6, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 6, number: '050 272 8659', calls: 24, totalDuration: '1:25:45', avgDuration: '3:34', longestCall: '0:31:49', daysCalled: 15, chargedDuration: '0:00:00', extraCost: 0.00, isFreeNumber: true, totalMinutes: 85.8, chargedMinutes: 0.0, notes: 'Designated free/favourite number on plan (AED 0.00 throughout month).' },
      { rank: 7, number: '050 283 4282', calls: 20, totalDuration: '0:58:47', avgDuration: '2:56', longestCall: '0:09:17', daysCalled: 12, chargedDuration: '0:40:06', extraCost: 12.08, totalMinutes: 58.8, chargedMinutes: 40.1, notes: 'Overage in 2nd half of month.' },
      { rank: 8, number: '054 217 2643', calls: 18, totalDuration: '0:22:08', avgDuration: '1:14', longestCall: '0:06:24', daysCalled: 11, chargedDuration: '0:03:02', extraCost: 0.91, totalMinutes: 22.1, chargedMinutes: 3.0, notes: 'Frequent check-in calls.' },
      { rank: 9, number: '052 439 9757', calls: 16, totalDuration: '0:28:55', avgDuration: '1:48', longestCall: '0:06:08', daysCalled: 10, chargedDuration: '0:09:54', extraCost: 3.00, totalMinutes: 28.9, chargedMinutes: 9.9, notes: 'Partial overage charged.' },
      { rank: 10, number: '055 692 1813', calls: 16, totalDuration: '0:28:39', avgDuration: '1:47', longestCall: '0:07:23', daysCalled: 10, chargedDuration: '0:07:42', extraCost: 2.33, totalMinutes: 28.6, chargedMinutes: 7.7, notes: 'Partial overage charged.' },
    ],
    parkingLogs: [
      { id: '1', date: '20 Aug 2026', time: '23:02', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '2', date: '13 Aug 2026', time: '19:51', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '3', date: '13 Aug 2026', time: '18:49', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '4', date: '13 Aug 2026', time: '17:53', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '5', date: '13 Aug 2026', time: '09:51', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '6', date: '13 Aug 2026', time: '01:45', sms: '0.38', parking: '5.00', total: '5.38', operator: 'Sharjah' },
      { id: '7', date: '12 Aug 2026', time: '13:15', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '8', date: '11 Aug 2026', time: '12:36', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '9', date: '10 Aug 2026', time: '13:36', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '10', date: '02 Aug 2026', time: '20:42', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
    ]
  },

  // ---------------------------------------------------------------------------
  // 2. ASAS GEN TR LLC · 054 305 1035 · June 2026 (AED 545.09)
  // ---------------------------------------------------------------------------
  'ASAS-0543051035-JUN2026': {
    id: 'ASAS-0543051035-JUN2026',
    key: 'ASAS-0543051035-JUN2026',
    account: {
      companyName: 'ASAS Gen Tr LLC',
      mobileNumber: '054 305 1035',
      billNumber: 'INV2039279589',
      billingPeriod: '1–30 June 2026',
      periodLabel: 'Jun 2026',
      dueDate: '15 Jul 2026',
      provider: 'e& (Etisalat)',
      auditor: '@Navaneetha Krishnan',
      reportDate: 'Jul 15, 2026',
      planName: 'National Business Special (10.5 GB)',
      holder: 'Sharjah warehouse',
      holderType: 'Site',
      costCenter: 'CC-104 (Logistics)',
      grade: 'Site Router / Terminal',
      lineManager: 'Warehouse In-charge',
      approvedLimit: '100.00',
      contractTo: '21 Aug 2027',
      contractDays: '315 days left',
      lineStatus: 'Active',
      connectionType: 'Mobile voice + Data SIM',
      excessPolicy: 'Company absorbed (Operations)',
      policyVersion: 'v2 (effective 01 Jan 2026)'
    },
    billSummary: {
      totalBill: '545.09',
      planAmountExclVat: '100.00',
      planAmountInclVat: '105.00',
      totalExclVat: '519.13',
      totalVat: '25.96',
      extraUsageAmount: '440.09',
      extraCallChargesBeforeVat: '283.31',
      parkingTotalInclVat: '70.17',
      dataAddonInclVat: '72.45',
      includedMinutesEstimated: 965,
      minutesUsedTotal: 1906,
      exhaustionDate: '15 Jun 2026',
      exhaustionTime: '13:56',
      dataUsedGB: '17.81',
      dataIncludedGB: '30.5',
      previousBalance: '79.21',
      paymentsReceived: '-79.21',
      balanceCarriedForward: '0.00',
      totalCalls: 780,
      uniqueNumbers: 90,
      avgCallDuration: '2:26'
    },
    budgetSplit: [
      { name: 'Contractual Plan', amt: '105.00', pct: '19.3%', color: '#1E293B' },
      { name: 'Extra Calls (Mobiles & Landlines)', amt: '297.47', pct: '54.6%', color: '#E11D48' },
      { name: '20 GB Data Add-on', amt: '72.45', pct: '13.3%', color: '#059669' },
      { name: 'Sharjah mParking & SMS', amt: '70.17', pct: '12.8%', color: '#D97706' },
    ],
    billItems: [
      { id: '1', item: 'Plan rental (National Business Special 10.5GB)', amt: '100.00', vat: '5.00', total: '105.00', category: 'Plan Subscription', isPlan: true, taxRate: '5%' },
      { id: '2', item: 'Extra calls to mobiles (after 965 free mins)', amt: '282.09', vat: '14.10', total: '296.19', category: 'Extra Local Calls', isPlan: false, taxRate: '5%' },
      { id: '3', item: 'Extra calls to landlines', amt: '1.22', vat: '0.06', total: '1.28', category: 'Extra Landline Calls', isPlan: false, taxRate: '5%' },
      { id: '4', item: '20 GB data add-on (bought 15 Jun)', amt: '69.00', vat: '3.45', total: '72.45', category: 'Data Add-on', isPlan: false, taxRate: '5%' },
      { id: '5', item: 'mParking (Sharjah - 26 sessions)', amt: '59.00', vat: '0.00', total: '59.00', category: 'Sharjah Municipal Fee', isPlan: false, taxRate: '0%' },
      { id: '6', item: 'Premium SMS (parking confirmations - 28 SMS)', amt: '10.64', vat: '0.53', total: '11.17', category: 'Carrier SMS Fee', isPlan: false, taxRate: '5%' },
    ],
    dialledNumbers: [
      { rank: 1, number: '052 390 9665', calls: 60, totalDuration: '6:49:24', avgDuration: '6:49', longestCall: '0:31:00', daysCalled: 24, chargedDuration: '3:46:42', extraCost: 68.09, totalMinutes: 409.4, chargedMinutes: 226.7, notes: 'Highest cost driver (AED 68.09 extra). Single 31-min call cost AED 9.30.' },
      { rank: 2, number: '052 503 8532', calls: 156, totalDuration: '4:39:06', avgDuration: '1:47', longestCall: '0:18:12', daysCalled: 27, chargedDuration: '3:07:54', extraCost: 56.56, totalMinutes: 279.1, chargedMinutes: 187.9, notes: 'Most frequent contact (156 calls, 20% of all calls).' },
      { rank: 3, number: '052 480 6401', calls: 84, totalDuration: '2:30:54', avgDuration: '1:47', longestCall: '0:12:45', daysCalled: 21, chargedDuration: '1:37:42', extraCost: 29.43, totalMinutes: 150.9, chargedMinutes: 97.7, notes: 'Significant talk time and overage.' },
      { rank: 4, number: '055 974 2427', calls: 59, totalDuration: '1:51:42', avgDuration: '1:53', longestCall: '0:09:20', daysCalled: 18, chargedDuration: '1:22:24', extraCost: 24.82, totalMinutes: 111.7, chargedMinutes: 82.4, notes: 'Heavy calling post-exhaustion.' },
      { rank: 5, number: '054 217 2643', calls: 80, totalDuration: '1:18:54', avgDuration: '0:59', longestCall: '0:06:12', daysCalled: 22, chargedDuration: '0:35:54', extraCost: 10.89, totalMinutes: 78.9, chargedMinutes: 35.9, notes: 'Regular warehouse check-ins.' },
      { rank: 6, number: '056 776 4865', calls: 66, totalDuration: '1:06:06', avgDuration: '1:00', longestCall: '0:05:40', daysCalled: 19, chargedDuration: '0:31:12', extraCost: 9.42, totalMinutes: 66.1, chargedMinutes: 31.2, notes: 'Daily coordination calls.' },
      { rank: 7, number: '050 814 3664', calls: 7, totalDuration: '0:30:48', avgDuration: '4:24', longestCall: '0:08:15', daysCalled: 6, chargedDuration: '0:30:48', extraCost: 9.26, totalMinutes: 30.8, chargedMinutes: 30.8, notes: '100% charged in overage.' },
      { rank: 8, number: '050 283 4282', calls: 31, totalDuration: '5:49:48', avgDuration: '11:17', longestCall: '0:34:10', daysCalled: 15, chargedDuration: '0:26:24', extraCost: 7.95, totalMinutes: 349.8, chargedMinutes: 26.4, notes: 'Very long calls; partly covered before 15 Jun.' },
      { rank: 9, number: '056 107 3669', calls: 8, totalDuration: '0:22:42', avgDuration: '2:50', longestCall: '0:06:30', daysCalled: 7, chargedDuration: '0:22:42', extraCost: 6.83, totalMinutes: 22.7, chargedMinutes: 22.7, notes: 'All charged in overage.' },
      { rank: 10, number: '050 705 0063', calls: 9, totalDuration: '0:39:30', avgDuration: '4:23', longestCall: '0:11:02', daysCalled: 8, chargedDuration: '0:21:54', extraCost: 6.59, totalMinutes: 39.5, chargedMinutes: 21.9, notes: 'Partial overage charged.' },
    ],
    parkingLogs: [
      { id: '1', date: '04 Jun 2026', time: '07:57', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '2', date: '04 Jun 2026', time: '09:21', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '3', date: '04 Jun 2026', time: '10:23', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '4', date: '04 Jun 2026', time: '11:13', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '5', date: '04 Jun 2026', time: '12:14', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '6', date: '05 Jun 2026', time: '07:55', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '7', date: '06 Jun 2026', time: '11:43', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '8', date: '07 Jun 2026', time: '08:41', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '9', date: '07 Jun 2026', time: '09:27', sms: '0.38', parking: '3.00', total: '3.38', operator: 'Sharjah' },
      { id: '10', date: '07 Jun 2026', time: '14:47', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
    ]
  },

  // ---------------------------------------------------------------------------
  // 3. ASAS GEN TR LLC · 052 248 6345 · September 2026 (AED 311.63)
  // ---------------------------------------------------------------------------
  'ASAS-0522486345-SEP2026': {
    id: 'ASAS-0522486345-SEP2026',
    key: 'ASAS-0522486345-SEP2026',
    account: {
      companyName: 'ASAS Gen Tr LLC',
      mobileNumber: '052 248 6345',
      billNumber: 'INV2053797513',
      billingPeriod: '1–30 September 2026',
      periodLabel: 'Sep 2026',
      dueDate: '15 Oct 2026',
      provider: 'e& (Etisalat)',
      auditor: '@Navaneetha Krishnan',
      reportDate: 'Oct 15, 2026',
      planName: 'Business Special (24 GB)',
      holder: 'Fatima Zahra',
      holderType: 'Employee (EMP-1042)',
      costCenter: 'CC-210 (HR)',
      grade: 'Grade G6',
      lineManager: 'Priya Nair',
      approvedLimit: '100.00',
      contractTo: '24 Nov 2026',
      contractDays: '45 days left',
      lineStatus: 'Active',
      connectionType: 'Mobile voice SIM',
      excessPolicy: 'Decide case by case',
      policyVersion: 'v2 (effective 01 Jan 2026)'
    },
    billSummary: {
      totalBill: '311.63',
      planAmountExclVat: '200.00',
      planAmountInclVat: '210.00',
      totalExclVat: '301.22',
      totalVat: '10.41',
      extraUsageAmount: '101.63',
      extraCallChargesBeforeVat: '0.00',
      parkingTotalInclVat: '101.63',
      dataAddonInclVat: '0.00',
      includedMinutesEstimated: 1500,
      minutesUsedTotal: 1476,
      exhaustionDate: 'N/A (All within plan)',
      exhaustionTime: '',
      dataUsedGB: '7.56',
      dataIncludedGB: '24.0',
      previousBalance: '474.97',
      paymentsReceived: '-474.97',
      balanceCarriedForward: '0.00',
      totalCalls: 1029,
      uniqueNumbers: 125,
      avgCallDuration: '1:26'
    },
    budgetSplit: [
      { name: 'Contractual Plan', amt: '210.00', pct: '67.4%', color: '#1E293B' },
      { name: 'Sharjah & Dubai RTA Parking', amt: '93.20', pct: '29.9%', color: '#D97706' },
      { name: 'Parking SMS Carrier Fees', amt: '8.43', pct: '2.7%', color: '#7C3AED' },
      { name: 'Calls & Data (100% in plan)', amt: '0.00', pct: '0.0%', color: '#059669' },
    ],
    billItems: [
      { id: '1', item: 'Plan rental (Business Special 24GB)', amt: '200.00', vat: '10.00', total: '210.00', category: 'Plan Subscription', isPlan: true, taxRate: '5%' },
      { id: '2', item: 'mParking (Sharjah 13 & RTA Dubai 9 sessions)', amt: '93.20', vat: '0.00', total: '93.20', category: 'Municipal Parking Fees', isPlan: false, taxRate: '0%' },
      { id: '3', item: 'Premium SMS (23 parking confirmations)', amt: '8.02', vat: '0.41', total: '8.43', category: 'Parking SMS Carrier Fee', isPlan: false, taxRate: '5%' },
      { id: '4', item: 'Local, international & roaming calls (1,029 calls)', amt: '0.00', vat: '0.00', total: '0.00', category: 'Plan Included Voice', isPlan: false, taxRate: '0%' },
      { id: '5', item: 'Mobile Data (7.56 GB of 24 GB quota)', amt: '0.00', vat: '0.00', total: '0.00', category: 'Plan Included Data', isPlan: false, taxRate: '0%' },
    ],
    dialledNumbers: [
      { rank: 1, number: '052 186 1963', calls: 128, totalDuration: '5:33:12', avgDuration: '2:36', longestCall: '0:16:30', daysCalled: 26, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 333.2, chargedMinutes: 0.0, notes: 'Local mobile & Roaming Hong Kong. 100% within plan.' },
      { rank: 2, number: '054 308 9343', calls: 67, totalDuration: '2:21:24', avgDuration: '2:07', longestCall: '0:11:45', daysCalled: 21, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 141.4, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 3, number: '054 537 9779', calls: 50, totalDuration: '1:32:42', avgDuration: '1:51', longestCall: '0:08:12', daysCalled: 19, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 92.7, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 4, number: '054 714 6131', calls: 37, totalDuration: '1:08:06', avgDuration: '1:50', longestCall: '0:07:05', daysCalled: 17, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 68.1, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 5, number: '054 749 9303', calls: 45, totalDuration: '0:44:24', avgDuration: '0:59', longestCall: '0:04:15', daysCalled: 16, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 44.4, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 6, number: '052 278 2396', calls: 34, totalDuration: '0:43:42', avgDuration: '1:17', longestCall: '0:05:30', daysCalled: 15, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 43.7, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 7, number: '050 868 1460', calls: 40, totalDuration: '0:41:00', avgDuration: '1:01', longestCall: '0:04:45', daysCalled: 14, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 41.0, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 8, number: '054 793 6994', calls: 30, totalDuration: '0:39:06', avgDuration: '1:18', longestCall: '0:05:10', daysCalled: 13, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 39.1, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 9, number: '056 415 8068', calls: 5, totalDuration: '0:36:30', avgDuration: '7:18', longestCall: '0:18:20', daysCalled: 4, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 36.5, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
      { rank: 10, number: '052 503 8532', calls: 29, totalDuration: '0:32:48', avgDuration: '1:08', longestCall: '0:04:12', daysCalled: 12, chargedDuration: '0:00:00', extraCost: 0.00, totalMinutes: 32.8, chargedMinutes: 0.0, notes: 'Covered within base plan.' },
    ],
    parkingLogs: [
      { id: '1', date: '05 Sep 2026', time: '18:11', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '2', date: '06 Sep 2026', time: '00:08', sms: '0.38', parking: '8.00', total: '8.38', operator: 'Sharjah' },
      { id: '3', date: '06 Sep 2026', time: '10:43', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '4', date: '06 Sep 2026', time: '22:01', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '5', date: '07 Sep 2026', time: '08:27', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '6', date: '07 Sep 2026', time: '13:53', sms: '0.38', parking: '2.00', total: '2.38', operator: 'Sharjah' },
      { id: '7', date: '08 Sep 2026', time: '20:29', sms: '0.30', parking: '2.10', total: '2.40', operator: 'RTA (Dubai)' },
      { id: '8', date: '08 Sep 2026', time: '21:29', sms: '0.30', parking: '3.15', total: '3.45', operator: 'RTA (Dubai)' },
      { id: '9', date: '12 Sep 2026', time: '01:19', sms: '0.38', parking: '5.00', total: '5.38', operator: 'Sharjah' },
      { id: '10', date: '12 Sep 2026', time: '19:23', sms: '0.30', parking: '10.50', total: '10.80', operator: 'RTA (Dubai)' },
    ]
  },

  // ---------------------------------------------------------------------------
  // 4. BYNUR AGRO TRADING L.L.C · 056 925 5721 · August 2026 (AED 409.18)
  // ---------------------------------------------------------------------------
  'BYNUR-0569255721-AUG2026': {
    id: 'BYNUR-0569255721-AUG2026',
    key: 'BYNUR-0569255721-AUG2026',
    account: {
      companyName: 'Bynur Agro Trading L.L.C',
      mobileNumber: '056 925 5721',
      billNumber: 'INV2048734446',
      billingPeriod: '1–31 August 2026',
      periodLabel: 'Aug 2026',
      dueDate: '15 Sep 2026',
      provider: 'e& (Etisalat)',
      auditor: '@Navaneetha Krishnan',
      reportDate: 'Sep 15, 2026',
      planName: 'Business First Plus (7.5 GB)',
      holder: 'Joseph Mathew',
      holderType: 'Employee',
      costCenter: 'CC-310 (Operations)',
      grade: 'Grade G5',
      lineManager: 'Operations Director',
      approvedLimit: '100.00',
      contractTo: '14 Nov 2026',
      contractDays: '35 days left',
      lineStatus: 'Active',
      connectionType: 'Mobile voice SIM',
      excessPolicy: 'Deduct from payroll over limit',
      policyVersion: 'v2 (effective 01 Jan 2026)'
    },
    billSummary: {
      totalBill: '409.18',
      planAmountExclVat: '77.00',
      planAmountInclVat: '80.85',
      totalExclVat: '389.69',
      totalVat: '19.49',
      extraUsageAmount: '328.33',
      extraCallChargesBeforeVat: '312.69',
      parkingTotalInclVat: '0.00',
      dataAddonInclVat: '0.00',
      includedMinutesEstimated: 742,
      minutesUsedTotal: 1781,
      exhaustionDate: '11 Aug 2026',
      exhaustionTime: '23:17',
      dataUsedGB: '2.95',
      dataIncludedGB: '7.5',
      previousBalance: '209.16',
      paymentsReceived: '-209.16',
      balanceCarriedForward: '0.00',
      totalCalls: 653,
      uniqueNumbers: 113,
      avgCallDuration: '2:44'
    },
    budgetSplit: [
      { name: 'Fixed Plan (incl discount)', amt: '80.85', pct: '19.8%', color: '#1E293B' },
      { name: 'Extra Calls to Mobiles', amt: '324.06', pct: '79.2%', color: '#E11D48' },
      { name: 'Extra Calls to Landlines', amt: '4.27', pct: '1.0%', color: '#7C3AED' },
    ],
    billItems: [
      { id: '1', item: 'Plan rental (Business First Plus 7.5GB)', amt: '110.00', vat: '5.50', total: '115.50', category: 'Plan Subscription', isPlan: true, taxRate: '5%' },
      { id: '2', item: 'Monthly rental discount', amt: '-33.00', vat: '-1.65', total: '-34.65', category: 'Contractual Discount', isPlan: true, taxRate: '5%' },
      { id: '3', item: 'Extra calls to mobiles (after 742 free mins ran out)', amt: '308.63', vat: '15.43', total: '324.06', category: 'Extra Local Calls', isPlan: false, taxRate: '5%' },
      { id: '4', item: 'Extra calls to landlines', amt: '4.06', vat: '0.20', total: '4.26', category: 'Extra Landline Calls', isPlan: false, taxRate: '5%' },
    ],
    dialledNumbers: [
      { rank: 1, number: '055 894 1004', calls: 17, totalDuration: '2:51:12', avgDuration: '10:04', longestCall: '0:44:00', daysCalled: 12, chargedDuration: '1:55:18', extraCost: 34.60, totalMinutes: 171.2, chargedMinutes: 115.3, notes: 'Highest cost driver (AED 34.60 extra). Single 44-min call cost AED 13.12.' },
      { rank: 2, number: '055 327 5027', calls: 23, totalDuration: '2:14:54', avgDuration: '5:51', longestCall: '0:22:15', daysCalled: 14, chargedDuration: '1:52:00', extraCost: 33.66, totalMinutes: 134.9, chargedMinutes: 112.0, notes: 'Heavy overage in 2nd half of month.' },
      { rank: 3, number: '056 408 8182', calls: 50, totalDuration: '2:03:18', avgDuration: '2:27', longestCall: '0:14:30', daysCalled: 19, chargedDuration: '1:25:00', extraCost: 25.62, totalMinutes: 123.3, chargedMinutes: 85.0, notes: 'High call frequency (50 calls).' },
      { rank: 4, number: '055 501 2200', calls: 30, totalDuration: '2:28:36', avgDuration: '4:57', longestCall: '0:19:10', daysCalled: 16, chargedDuration: '1:19:12', extraCost: 23.80, totalMinutes: 148.6, chargedMinutes: 79.2, notes: 'Significant operational talk time.' },
      { rank: 5, number: '054 998 0593', calls: 44, totalDuration: '2:26:12', avgDuration: '3:19', longestCall: '0:15:40', daysCalled: 18, chargedDuration: '1:11:24', extraCost: 21.47, totalMinutes: 146.2, chargedMinutes: 71.4, notes: 'Regular operational calls.' },
      { rank: 6, number: '056 597 0829', calls: 3, totalDuration: '0:40:48', avgDuration: '13:36', longestCall: '0:21:05', daysCalled: 3, chargedDuration: '0:39:48', extraCost: 11.94, totalMinutes: 40.8, chargedMinutes: 39.8, notes: 'Long single calls charged in overage.' },
      { rank: 7, number: '054 180 3944', calls: 16, totalDuration: '0:49:54', avgDuration: '3:07', longestCall: '0:11:15', daysCalled: 10, chargedDuration: '0:33:24', extraCost: 10.04, totalMinutes: 49.9, chargedMinutes: 33.4, notes: 'High cost driver.' },
      { rank: 8, number: '050 808 8154', calls: 8, totalDuration: '0:32:36', avgDuration: '4:04', longestCall: '0:09:20', daysCalled: 6, chargedDuration: '0:32:36', extraCost: 9.80, totalMinutes: 32.6, chargedMinutes: 32.6, notes: '100% charged in overage.' },
      { rank: 9, number: '056 534 5381', calls: 34, totalDuration: '1:22:24', avgDuration: '2:25', longestCall: '0:12:30', daysCalled: 15, chargedDuration: '0:31:12', extraCost: 9.39, totalMinutes: 82.4, chargedMinutes: 31.2, notes: 'Frequent caller.' },
      { rank: 10, number: '050 279 5271', calls: 8, totalDuration: '0:29:00', avgDuration: '3:37', longestCall: '0:07:45', daysCalled: 6, chargedDuration: '0:29:00', extraCost: 8.71, totalMinutes: 29.0, chargedMinutes: 29.0, notes: 'All charged in overage.' },
    ],
    parkingLogs: []
  },

  // ---------------------------------------------------------------------------
  // 5. BYNUR AGRO TRADING L.L.C · 056 925 5721 · September 2026 (AED 586.61)
  // ---------------------------------------------------------------------------
  'BYNUR-0569255721-SEP2026': {
    id: 'BYNUR-0569255721-SEP2026',
    key: 'BYNUR-0569255721-SEP2026',
    account: {
      companyName: 'Bynur Agro Trading L.L.C',
      mobileNumber: '056 925 5721',
      billNumber: 'INV2054243009',
      billingPeriod: '1–30 September 2026',
      periodLabel: 'Sep 2026',
      dueDate: '15 Oct 2026',
      provider: 'e& (Etisalat)',
      auditor: '@Navaneetha Krishnan',
      reportDate: 'Oct 15, 2026',
      planName: 'Business First Plus (7.5 GB)',
      holder: 'Joseph Mathew',
      holderType: 'Employee',
      costCenter: 'CC-310 (Operations)',
      grade: 'Grade G5',
      lineManager: 'Operations Director',
      approvedLimit: '100.00',
      contractTo: '14 Nov 2026',
      contractDays: '35 days left',
      lineStatus: 'Active',
      connectionType: 'Mobile voice SIM',
      excessPolicy: 'Deduct from payroll over limit',
      policyVersion: 'v2 (effective 01 Jan 2026)'
    },
    billSummary: {
      totalBill: '586.61',
      planAmountExclVat: '110.00',
      planAmountInclVat: '115.50',
      totalExclVat: '558.68',
      totalVat: '27.93',
      extraUsageAmount: '471.11',
      extraCallChargesBeforeVat: '448.68',
      parkingTotalInclVat: '0.00',
      dataAddonInclVat: '0.00',
      includedMinutesEstimated: 745,
      minutesUsedTotal: 2237,
      exhaustionDate: '12 Sep 2026',
      exhaustionTime: '14:35',
      dataUsedGB: '4.46',
      dataIncludedGB: '7.5',
      previousBalance: '409.18',
      paymentsReceived: '-409.18',
      balanceCarriedForward: '0.00',
      totalCalls: 839,
      uniqueNumbers: 192,
      avgCallDuration: '2:40'
    },
    budgetSplit: [
      { name: 'Fixed Plan', amt: '115.50', pct: '19.7%', color: '#1E293B' },
      { name: 'Extra Calls to Mobiles', amt: '445.08', pct: '75.9%', color: '#E11D48' },
      { name: 'Extra Calls to Landlines', amt: '26.03', pct: '4.4%', color: '#7C3AED' },
    ],
    billItems: [
      { id: '1', item: 'Plan rental (Business First Plus 7.5GB)', amt: '110.00', vat: '5.50', total: '115.50', category: 'Plan Subscription', isPlan: true, taxRate: '5%' },
      { id: '2', item: 'Extra calls to mobiles (after 745 free mins ran out)', amt: '423.89', vat: '21.19', total: '445.08', category: 'Extra Local Calls', isPlan: false, taxRate: '5%' },
      { id: '3', item: 'Extra calls to landlines', amt: '24.79', vat: '1.24', total: '26.03', category: 'Extra Landline Calls', isPlan: false, taxRate: '5%' },
    ],
    dialledNumbers: [
      { rank: 1, number: '055 151 1430', calls: 22, totalDuration: '2:20:24', avgDuration: '6:22', longestCall: '0:22:40', daysCalled: 14, chargedDuration: '2:02:12', extraCost: 36.70, totalMinutes: 140.4, chargedMinutes: 122.2, notes: 'Highest cost driver (AED 36.70 extra).' },
      { rank: 2, number: '054 559 0490', calls: 30, totalDuration: '1:40:54', avgDuration: '3:21', longestCall: '0:14:10', daysCalled: 18, chargedDuration: '1:40:54', extraCost: 30.33, totalMinutes: 100.9, chargedMinutes: 100.9, notes: '100% of calls charged in extra minutes.' },
      { rank: 3, number: '055 494 1622', calls: 22, totalDuration: '1:34:06', avgDuration: '4:16', longestCall: '0:18:25', daysCalled: 15, chargedDuration: '1:34:06', extraCost: 28.27, totalMinutes: 94.1, chargedMinutes: 94.1, notes: 'Heavy overage cost.' },
      { rank: 4, number: '055 894 1004', calls: 11, totalDuration: '1:43:36', avgDuration: '9:25', longestCall: '0:32:15', daysCalled: 8, chargedDuration: '1:19:30', extraCost: 23.86, totalMinutes: 103.6, chargedMinutes: 79.5, notes: 'Long conversation times.' },
      { rank: 5, number: '050 244 0709', calls: 3, totalDuration: '0:52:54', avgDuration: '17:38', longestCall: '0:51:00', daysCalled: 3, chargedDuration: '0:52:54', extraCost: 15.88, totalMinutes: 52.9, chargedMinutes: 52.9, notes: 'Single 51-min call on 27 Sep cost AED 15.28.' },
      { rank: 6, number: '055 532 2380', calls: 10, totalDuration: '0:54:30', avgDuration: '5:27', longestCall: '0:16:40', daysCalled: 8, chargedDuration: '0:50:48', extraCost: 15.28, totalMinutes: 54.5, chargedMinutes: 50.8, notes: 'Regular operational meetings.' },
      { rank: 7, number: '054 998 0593', calls: 23, totalDuration: '1:10:24', avgDuration: '3:03', longestCall: '0:12:15', daysCalled: 14, chargedDuration: '0:44:42', extraCost: 13.43, totalMinutes: 70.4, chargedMinutes: 44.7, notes: 'Over plan minutes.' },
      { rank: 8, number: '058 893 4163', calls: 34, totalDuration: '1:05:12', avgDuration: '1:55', longestCall: '0:07:30', daysCalled: 17, chargedDuration: '0:42:24', extraCost: 12.80, totalMinutes: 65.2, chargedMinutes: 42.4, notes: 'High frequency caller.' },
      { rank: 9, number: '055 361 8778', calls: 10, totalDuration: '0:40:12', avgDuration: '4:01', longestCall: '0:11:00', daysCalled: 7, chargedDuration: '0:40:12', extraCost: 12.08, totalMinutes: 40.2, chargedMinutes: 40.2, notes: 'All charged in overage.' },
      { rank: 10, number: '050 467 7102', calls: 7, totalDuration: '0:38:30', avgDuration: '5:30', longestCall: '0:14:20', daysCalled: 6, chargedDuration: '0:38:30', extraCost: 11.56, totalMinutes: 38.5, chargedMinutes: 38.5, notes: '100% in overage.' },
    ],
    parkingLogs: []
  }
};

export const getMatchingDataset = (company, mobile, period) => {
  const normMob = (mobile || '').replace(/[\s\-\(\)]/g, '');
  const normComp = (company || '').toLowerCase();
  const normPeriod = (period || '').toLowerCase();

  // Try exact key match
  for (const [key, d] of Object.entries(TELECOM_DATASETS)) {
    const dMob = d.account.mobileNumber.replace(/[\s\-\(\)]/g, '');
    const dComp = d.account.companyName.toLowerCase();
    const dPeriod = d.account.periodLabel.toLowerCase();

    const matchMob = !normMob || normMob === 'all' || dMob.includes(normMob);
    const matchComp = !normComp || normComp === 'all' || dComp.includes(normComp) || normComp.includes(dComp);
    const matchPeriod = !normPeriod || normPeriod === 'all' || normPeriod === 'all periods' || dPeriod.includes(normPeriod) || normPeriod.includes(dPeriod);

    if (matchMob && matchComp && matchPeriod) {
      return d;
    }
  }

  // Fallback to closest match
  for (const [key, d] of Object.entries(TELECOM_DATASETS)) {
    const dMob = d.account.mobileNumber.replace(/[\s\-\(\)]/g, '');
    if (normMob && normMob !== 'all' && dMob.includes(normMob)) {
      return d;
    }
  }

  return TELECOM_DATASETS['ASAS-0543051035-AUG2026'];
};
