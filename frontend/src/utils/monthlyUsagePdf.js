const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => value === null || value === undefined ? 'Needs review' : numberValue(value).toFixed(2);
const decimal = (value, places = 1) => numberValue(value).toFixed(places);
const integer = (value) => Math.round(numberValue(value)).toLocaleString('en-US');

const tableRows = (rows, renderRow, emptyColumns) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return `<tr><td class="empty" colspan="${emptyColumns}">No data available for this section.</td></tr>`;
  }
  return rows.map(renderRow).join('');
};

const createHistoryChart = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="empty-chart">No billing history available.</div>';
  }

  const max = Math.max(...items.map((item) => numberValue(item.total)), 1);
  return items.map((item) => {
    const total = numberValue(item.total);
    const plan = Math.min(numberValue(item.plan), total);
    const extra = Math.max(0, total - plan);
    const totalHeight = Math.max(4, (total / max) * 108);
    const planHeight = total > 0 ? (plan / total) * totalHeight : 0;
    const extraHeight = total > 0 ? (extra / total) * totalHeight : 0;

    return `
      <div class="chart-column">
        <div class="chart-value">${money(total)}</div>
        <div class="bar" style="height:${totalHeight.toFixed(1)}px">
          <div class="bar-extra" style="height:${extraHeight.toFixed(1)}px"></div>
          <div class="bar-plan" style="height:${planHeight.toFixed(1)}px"></div>
        </div>
        <div class="chart-label">${escapeHtml(item.label || item.month || '')}</div>
      </div>`;
  }).join('');
};

const createSourceRows = (sources) => tableRows(sources, (source) => `
  <tr>
    <td><span class="source-dot" style="background:${escapeHtml(source.color || '#D12E26')}"></span>${escapeHtml(source.name)}</td>
    <td class="num">${money(source.amount)}</td>
    <td class="num">${integer(source.pct)}%</td>
  </tr>`, 3);

const createAllowanceRows = (allowances) => tableRows(allowances, (item) => `
  <div class="allowance-row">
    <div class="allowance-line"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.used_label)}</span></div>
    <div class="progress"><span style="width:${Math.min(100, Math.max(0, numberValue(item.pct)))}%;background:${escapeHtml(item.color || '#0B6548')}"></span></div>
    <div class="muted">${escapeHtml(item.note)}</div>
  </div>`, 1);

const createMonthlyRows = (rows) => tableRows(rows, (row) => {
  const over = String(row.status || '').toLowerCase().includes('over');
  return `
    <tr class="${row.selected ? 'selected-row' : ''}">
      <td><strong>${escapeHtml(row.month)}</strong></td>
      <td class="mono">${escapeHtml(row.bill_no)}</td>
      <td class="num">${money(row.plan)}</td>
      <td class="num">${money(row.total)}</td>
      <td class="num">${money(row.vat)}</td>
      <td class="num">${money(row.bill_incl_vat)}</td>
      <td class="num ${over ? 'danger' : ''}">${money(row.extra)}</td>
      <td class="num">${integer(row.call_min)}</td>
      <td class="num">${decimal(row.data_gb)}</td>
      <td class="num">${integer(row.premium_sms)}</td>
      <td><span class="status ${over ? 'status-over' : 'status-ok'}">${escapeHtml(row.status)}</span></td>
    </tr>`;
}, 11);

const createTopNumberRows = (rows) => tableRows(rows, (row) => `
  <tr>
    <td class="num">${integer(row.rank)}</td>
    <td class="mono">${escapeHtml(row.number)}</td>
    <td class="num">${integer(row.calls)}</td>
    <td class="num">${decimal(row.total_min)}</td>
    <td class="num">${decimal(row.uncharged_min)}</td>
    <td class="num danger">${decimal(row.charged_call_min)}</td>
    <td class="num danger">${money(row.charged_aed)}</td>
  </tr>`, 7);

const createChargeRows = (rows) => tableRows(rows, (row) => `
  <tr>
    <td>${escapeHtml(row.line)}</td>
    <td class="num ${row.is_extra ? 'danger' : ''}">${money(row.amount)}</td>
    <td>${row.is_extra ? '<span class="status status-over">Extra usage</span>' : '<span class="status status-ok">Plan base</span>'}</td>
  </tr>`, 3);

export const buildMonthlyUsagePrintHtml = (data, selectedMonth) => {
  const kpis = data?.kpis || {};
  const historyTotals = data?.history_totals || {};
  const safePhone = String(data?.number || 'report').replace(/\D/g, '') || 'report';
  const reportMonth = String(selectedMonth || data?.period_label || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const title = `Monthly_Usage_${safePhone}_${reportMonth}`;
  const isOver = String(data?.status || '').toLowerCase() === 'over';
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 11mm 12mm; }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; color: #10233f; background: #fff; font: 10px/1.38 Arial, Helvetica, sans-serif; }
    .report { width: 100%; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #07563f; padding: 0 0 8px; margin-bottom: 10px; }
    .brand { color: #6b0021; font-size: 17px; font-weight: 800; letter-spacing: -.3px; }
    h1 { margin: 2px 0 1px; font-size: 23px; line-height: 1.1; letter-spacing: -.5px; }
    .subtitle, .muted { color: #66758a; }
    .header-meta { text-align: right; color: #56657a; font-size: 9px; }
    .badge { display: inline-block; margin-top: 4px; padding: 3px 8px; border-radius: 999px; font-weight: 700; }
    .badge-over { color: #a51f1b; background: #feeceb; }
    .badge-ok { color: #07563f; background: #e8f5ef; }
    .identity { display: grid; grid-template-columns: 1.15fr .9fr .9fr .9fr .85fr; gap: 7px; margin-bottom: 9px; }
    .identity-item, .kpi, .card { border: 1px solid #dce4ec; border-radius: 7px; background: #fff; }
    .identity-item { padding: 7px 9px; }
    .label { color: #718096; font-size: 8px; font-weight: 700; letter-spacing: .45px; text-transform: uppercase; }
    .value { margin-top: 2px; font-weight: 700; font-size: 10px; overflow-wrap: anywhere; }
    .summary { border-left: 4px solid ${isOver ? '#d12e26' : '#15936b'}; background: ${isOver ? '#fff5f4' : '#f1faf6'}; border-radius: 6px; padding: 8px 10px; margin-bottom: 9px; }
    .summary strong { display: block; margin-bottom: 2px; text-transform: uppercase; font-size: 8px; letter-spacing: .5px; }
    .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; margin-bottom: 9px; }
    .kpi { padding: 8px; min-height: 58px; }
    .kpi-title { color: #66758a; font-weight: 700; font-size: 8px; }
    .kpi-value { font-size: 15px; font-weight: 800; margin-top: 5px; white-space: nowrap; }
    .danger { color: #c92c25 !important; font-weight: 700; }
    .two-col { display: grid; grid-template-columns: 1.55fr 1fr; gap: 9px; margin-bottom: 9px; }
    .equal-col { grid-template-columns: 1fr 1fr; }
    .card { padding: 9px; break-inside: avoid; }
    h2 { margin: 0 0 2px; font-size: 13px; }
    .card-subtitle { color: #718096; margin-bottom: 7px; font-size: 9px; }
    .chart { height: 145px; display: flex; align-items: flex-end; justify-content: space-evenly; gap: 10px; border-bottom: 1px solid #ccd6e0; padding: 18px 12px 0; background: repeating-linear-gradient(to top, transparent 0, transparent 35px, #edf1f5 36px); }
    .chart-column { flex: 1; height: 126px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 36px; }
    .chart-value { font-size: 8px; font-weight: 700; margin-bottom: 3px; }
    .bar { width: 28px; display: flex; flex-direction: column; justify-content: flex-end; border-radius: 3px 3px 0 0; overflow: hidden; }
    .bar-extra { background: #d12e26; }
    .bar-plan { background: #b9c5d1; }
    .chart-label { margin-top: 3px; font-weight: 700; font-size: 8px; }
    .legend { display: flex; gap: 13px; margin-top: 7px; color: #66758a; }
    .legend i, .source-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .source-dot { border-radius: 50%; }
    .allowance-row { margin: 8px 0; }
    .allowance-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .progress { height: 6px; background: #edf1f5; border-radius: 5px; overflow: hidden; }
    .progress span { display: block; height: 100%; border-radius: 5px; }
    .section { break-before: page; }
    .section-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 7px; border-bottom: 2px solid #10233f; padding-bottom: 4px; }
    .section-title h2 { font-size: 15px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th { background: #eef3f6; color: #4b5e74; font-size: 7.5px; text-align: left; text-transform: uppercase; letter-spacing: .25px; padding: 6px 5px; border-bottom: 1px solid #ccd6e0; }
    td { padding: 6px 5px; border-bottom: 1px solid #e5eaf0; vertical-align: middle; overflow-wrap: anywhere; }
    tr { break-inside: avoid; }
    tbody tr:nth-child(even) { background: #fafbfd; }
    .selected-row { background: #edf8f3 !important; }
    .num { text-align: right; white-space: nowrap; }
    .mono { font-family: Consolas, 'Courier New', monospace; }
    .status { display: inline-block; padding: 2px 5px; border-radius: 999px; font-size: 8px; font-weight: 700; white-space: nowrap; }
    .status-over { color: #a51f1b; background: #feeceb; }
    .status-ok { color: #07563f; background: #e8f5ef; }
    .total-row td { background: #eef3f6; border-top: 2px solid #b7c3ce; font-weight: 800; }
    .money-table td:first-child { width: 62%; }
    .empty, .empty-chart { text-align: center; color: #718096; padding: 18px; }
    .notes { margin-top: 8px; padding: 7px 9px; background: #f6f8fa; border-radius: 5px; color: #66758a; font-size: 8px; }
    .footer { display: flex; justify-content: space-between; margin-top: 8px; border-top: 1px solid #d7dfe7; padding-top: 4px; color: #7a8796; font-size: 7px; }
    @media screen { body { background: #e9edf1; padding: 20px; } .report { max-width: 1120px; margin: auto; background: #fff; padding: 28px; box-shadow: 0 3px 18px rgba(15,35,63,.15); } }
    @media print { body { background: #fff; } .report { padding: 0; } }
  </style>
</head>
<body>
  <main class="report">
    <header class="report-header">
      <div>
        <div class="brand">Trakio</div>
        <h1>Monthly Usage Report</h1>
        <div class="subtitle">Telecom cost and usage analysis</div>
      </div>
      <div class="header-meta">
        <strong>${escapeHtml(data?.period_label)}</strong><br />
        Generated ${escapeHtml(generatedAt)}<br />
        <span class="badge ${isOver ? 'badge-over' : 'badge-ok'}">${isOver ? `Over plan - AED ${money(kpis.extra)} extra` : 'Within plan'}</span>
      </div>
    </header>

    <section class="identity">
      <div class="identity-item"><div class="label">Mobile number</div><div class="value">${escapeHtml(data?.number)}</div></div>
      <div class="identity-item"><div class="label">Company</div><div class="value">${escapeHtml(data?.company)}</div></div>
      <div class="identity-item"><div class="label">Employee / holder</div><div class="value">${escapeHtml(data?.employee)}</div></div>
      <div class="identity-item"><div class="label">Plan</div><div class="value">${escapeHtml(data?.plan_name)}</div></div>
      <div class="identity-item"><div class="label">Invoice / due date</div><div class="value">${escapeHtml(data?.bill_number)}<br />${escapeHtml(data?.due_date)}</div></div>
    </section>

    <section class="summary"><strong>Executive summary</strong>${escapeHtml(data?.summary_text)}</section>

    <section class="kpis">
      <div class="kpi"><div class="kpi-title">Plan — excluding VAT</div><div class="kpi-value">AED ${money(kpis.plan)}</div></div>
      <div class="kpi"><div class="kpi-title">Bill — excluding VAT</div><div class="kpi-value">AED ${money(kpis.bill_excl_vat)}</div></div>
      <div class="kpi"><div class="kpi-title">VAT</div><div class="kpi-value">AED ${money(kpis.vat)}</div></div>
      <div class="kpi"><div class="kpi-title">Bill — including VAT</div><div class="kpi-value">AED ${money(kpis.bill_incl_vat)}</div></div>
      <div class="kpi"><div class="kpi-title">Excess — excluding VAT</div><div class="kpi-value danger">AED ${money(kpis.extra)}</div></div>
      <div class="kpi"><div class="kpi-title">Duration of calls with charges</div><div class="kpi-value">${decimal(kpis.charged_call_duration_minutes, 2)} min</div></div>
    </section>

    <section class="two-col">
      <div class="card">
        <h2>Bill history - month wise</h2>
        <div class="card-subtitle">Plan and bill compared on the same excluding-VAT basis.</div>
        <div class="chart">${createHistoryChart(data?.chart_months)}</div>
        <div class="legend"><span><i style="background:#b9c5d1"></i>Fixed plan</span><span><i style="background:#d12e26"></i>Extra usage</span></div>
      </div>
      <div>
        <div class="card" style="margin-bottom:9px">
          <h2>Extra usage by source</h2>
          <div class="card-subtitle">Charges above the fixed plan, AED excluding VAT.</div>
          <table><thead><tr><th>Source</th><th class="num">Amount</th><th class="num">Share</th></tr></thead><tbody>${createSourceRows(data?.sources)}</tbody></table>
        </div>
        <div class="card">
          <h2>Plan allowance used</h2>
          ${createAllowanceRows(data?.allowances)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="report-header">
        <div><div class="brand">Trakio</div><h1>Usage Detail</h1></div>
        <div class="header-meta">${escapeHtml(data?.number)}<br />${escapeHtml(data?.period_label)}</div>
      </div>
      <div class="section-title"><h2>Month-wise report</h2><span class="muted">Amounts in AED</span></div>
      <table>
        <thead><tr><th>Month</th><th>Bill no.</th><th class="num">Plan — excl. VAT</th><th class="num">Bill — excl. VAT</th><th class="num">VAT</th><th class="num">Bill — incl. VAT</th><th class="num">Excess — excl. VAT</th><th class="num">Call min</th><th class="num">Data GB</th><th class="num">Prem. SMS</th><th>Status</th></tr></thead>
        <tbody>
          ${createMonthlyRows(data?.month_wise_history)}
          <tr class="total-row"><td colspan="2">Total</td><td class="num">${money(historyTotals.plan)}</td><td class="num">${money(historyTotals.total)}</td><td colspan="2"></td><td class="num danger">${money(historyTotals.extra)}</td><td class="num">${integer(historyTotals.call_min)}</td><td class="num">${decimal(historyTotals.data_gb)}</td><td class="num">${integer(historyTotals.premium_sms)}</td><td></td></tr>
        </tbody>
      </table>

      <div class="two-col equal-col" style="margin-top:12px">
        <div class="card">
          <h2>Top numbers called</h2>
          <div class="card-subtitle">Ranked by report usage.</div>
          <table>
            <thead><tr><th class="num">#</th><th>Number</th><th class="num">Calls</th><th class="num">Actual min</th><th class="num">No-charge min</th><th class="num">Charged-call min</th><th class="num">Call charges</th></tr></thead>
            <tbody>${createTopNumberRows(data?.top_10_numbers)}</tbody>
          </table>
        </div>
        <div class="card">
          <h2>Where the money went</h2>
          <div class="card-subtitle">Itemized bill charge summary.</div>
          <table class="money-table">
            <thead><tr><th>Charge line</th><th class="num">Amount AED</th><th>Classification</th></tr></thead>
            <tbody>
              ${createChargeRows(data?.where_money_went)}
              <tr class="total-row"><td>Total amount due</td><td class="num">${money(data?.total_amount_due)}</td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="notes">Invoice-stated current-period totals and VAT are preserved. Excess excluding VAT = max(0, bill excluding VAT − applicable plan excluding VAT); it is flagged only above AED 10.00.</div>
    </section>

    <div class="footer"><span>Trakio - Monthly Usage Report</span><span>${escapeHtml(data?.company)} | ${escapeHtml(data?.number)}</span></div>
  </main>
  <script>
    window.addEventListener('load', function () {
      window.setTimeout(function () { window.print(); }, 350);
    });
  </script>
</body>
</html>`;
};

export const openMonthlyUsagePdf = (data, selectedMonth) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildMonthlyUsagePrintHtml(data, selectedMonth));
  printWindow.document.close();
  return true;
};
