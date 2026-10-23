const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const PAGE = [612, 792];
const MARGIN = 42;
const CONTENT = PAGE[0] - MARGIN * 2;
const C = {
  ink: rgb(0.10, 0.15, 0.23), muted: rgb(0.39, 0.46, 0.56), line: rgb(0.82, 0.86, 0.90),
  soft: rgb(0.96, 0.97, 0.98), green: rgb(0.03, 0.31, 0.22), greenSoft: rgb(0.91, 0.97, 0.94),
  red: rgb(0.80, 0.18, 0.14), redSoft: rgb(1, 0.92, 0.91), blue: rgb(0.27, 0.43, 0.66),
  grey: rgb(0.69, 0.73, 0.78), white: rgb(1, 1, 1),
};

const clean = value => String(value == null ? '' : value)
  .replace(/[\u2010-\u2015]/g, '-').replace(/[\u2022\u00b7]/g, '-')
  .replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = value => value == null ? 'Needs review' : num(value).toFixed(2);
const dec = (value, places = 1) => num(value).toFixed(places);
const percent = (value, total) => total > 0 ? Math.round(num(value) / total * 100) : 0;
const abovePlan = (value) => value == null ? 'N/A' : num(value).toFixed(2) + '%';

const wrap = (value, font, size, width, maxLines = 99) => {
  const words = clean(value).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const next = current ? current + ' ' + word : word;
    if (!current || font.widthOfTextAtSize(next, size) <= width) current = next;
    else { lines.push(current); current = word; }
  });
  if (current) lines.push(current);
  if (!lines.length) return ['-'];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && font.widthOfTextAtSize(last + '...', size) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = last + '...';
  return kept;
};

const text = (page, value, x, y, options) => {
  const output = clean(value) || '-';
  const width = options.font.widthOfTextAtSize(output, options.size || 8);
  const drawX = options.align === 'right' ? x - width : options.align === 'center' ? x - width / 2 : x;
  page.drawText(output, {
    x: drawX, y, font: options.font, size: options.size || 8,
    color: options.color || C.ink,
  });
};
const rule = (page, x1, y, x2, color = C.line, thickness = 0.6) => page.drawLine({
  start: { x: x1, y }, end: { x: x2, y }, color, thickness,
});
const box = (page, x, y, width, height, fill = C.white, border = C.line) => page.drawRectangle({
  x, y, width, height, color: fill, borderColor: border, borderWidth: 0.7,
});
const paragraph = (page, fonts, value, x, y, width, options = {}) => {
  const size = options.size || 8.5;
  const leading = options.leading || size + 3;
  const lines = wrap(value, options.font || fonts.regular, size, width, options.maxLines || 99);
  lines.forEach((line, index) => text(page, line, x, y - index * leading, {
    font: options.font || fonts.regular, size, color: options.color || C.ink,
  }));
  return y - lines.length * leading;
};
const footer = (page, fonts, pageNo, company, phone) => {
  rule(page, MARGIN, 24, PAGE[0] - MARGIN);
  text(page, 'Trakio - Monthly Usage Report | ' + clean(company) + ' | ' + clean(phone), MARGIN, 12, {
    font: fonts.regular, size: 6.3, color: C.muted,
  });
  text(page, 'Page ' + pageNo, PAGE[0] - MARGIN, 12, {
    font: fonts.regular, size: 6.3, color: C.muted, align: 'right',
  });
};
const section = (page, fonts, number, title, subtitle, y) => {
  text(page, number + '. ' + title, MARGIN, y, { font: fonts.bold, size: 13 });
  if (subtitle) text(page, subtitle, MARGIN, y - 15, { font: fonts.regular, size: 7.3, color: C.muted });
  return y - (subtitle ? 29 : 18);
};

const table = (page, fonts, options) => {
  const x = options.x == null ? MARGIN : options.x;
  const width = options.width || CONTENT;
  const aligns = options.aligns || [];
  const fontSize = options.fontSize || 7.3;
  const rows = options.rows || [];
  const headerHeight = 20;
  page.drawRectangle({ x, y: options.top - headerHeight, width, height: headerHeight, color: C.soft });
  let cursor = x;
  options.headers.forEach((header, index) => {
    const col = width * options.widths[index];
    text(page, header, aligns[index] === 'right' ? cursor + col - 5 : cursor + 5, options.top - 13, {
      font: fonts.bold, size: 6.3, color: C.muted, align: aligns[index] || 'left',
    });
    cursor += col;
  });
  let y = options.top - headerHeight;
  rows.forEach((row, rowIndex) => {
    const cellLines = row.map((cell, index) => wrap(cell, fonts.regular, fontSize, width * options.widths[index] - 10, 3));
    const height = Math.max(20, Math.max(...cellLines.map(lines => lines.length)) * (fontSize + 2) + 8);
    y -= height;
    if (rowIndex % 2) page.drawRectangle({ x, y, width, height, color: rgb(0.985, 0.988, 0.992) });
    rule(page, x, y, x + width);
    cursor = x;
    row.forEach((cell, index) => {
      const col = width * options.widths[index];
      cellLines[index].forEach((line, lineIndex) => {
        const danger = String(cell).startsWith('Extra usage') || String(cell).startsWith('Mismatch');
        text(page, line, aligns[index] === 'right' ? cursor + col - 5 : cursor + 5, y + height - 13 - lineIndex * (fontSize + 2), {
          font: index === 0 || danger ? fonts.bold : fonts.regular,
          size: fontSize, color: danger ? C.red : C.ink, align: aligns[index] || 'left',
        });
      });
      cursor += col;
    });
  });
  return y;
};

const summary = report => {
  const selected = report.selected || {};
  const kpi = selected.kpis || {};
  const sources = (selected.sources || []).slice().sort((a, b) => num(b.amount) - num(a.amount));
  const start = selected.status === 'over'
    ? 'Bill excluding VAT is AED ' + money(kpi.bill_excl_vat) + ' against the applicable plan excluding VAT of AED ' + money(kpi.plan) + '. Excess excluding VAT is AED ' + money(kpi.extra) + ' (' + abovePlan(kpi.extra_pct) + ' above plan).'
    : 'Bill excluding VAT is AED ' + money(kpi.bill_excl_vat) + ' and is within the AED ' + money(kpi.plan) + ' plan.';
  return sources.length
    ? start + ' The largest reconciled extra-charge component is ' + sources[0].name + ' at AED ' + money(sources[0].amount) + ' excluding VAT.'
    : start;
};
const rankedRows = items => (items || []).slice(0, 10).map((item, index) => [
  String(index + 1), item.number, String(num(item.calls)), dec(item.total_min),
  dec(item.uncharged_min), dec(item.charged_call_min), money(item.charged_amount),
]);
const drawRank = (page, fonts, title, items, x, y, width, metricName, color) => {
  text(page, title, x, y, { font: fonts.bold, size: 7.6 });
  const list = (items || []).slice(0, 10);
  const valueOf = item => metricName === 'calls' ? num(item.calls) : metricName === 'time' ? num(item.total_min) : num(item.charged_amount);
  const max = Math.max(1, ...list.map(valueOf));
  list.forEach((item, index) => {
    const rowY = y - 17 - index * 13;
    const value = valueOf(item);
    text(page, item.number || '-', x, rowY, { font: fonts.regular, size: 6, color: C.muted });
    page.drawRectangle({ x: x + 60, y: rowY - 1, width: Math.max(1, (width - 90) * value / max), height: 7, color });
    text(page, metricName === 'calls' ? String(num(value)) : dec(value, metricName === 'extra' ? 2 : 1), x + width - 2, rowY, {
      font: fonts.regular, size: 6, color: C.muted, align: 'right',
    });
  });
};
const appendix = (pdf, fonts, config, context, startPageNo) => {
  let index = 0;
  let pageNo = startPageNo;
  while (index < config.rows.length) {
    const page = pdf.addPage(PAGE);
    text(page, config.title, MARGIN, 744, { font: fonts.bold, size: 18 });
    text(page, config.subtitle, MARGIN, 726, { font: fonts.regular, size: 7.5, color: C.muted });
    rule(page, MARGIN, 714, PAGE[0] - MARGIN, C.green, 2);
    const rows = config.rows.slice(index, index + config.rowsPerPage);
    table(page, fonts, {
      top: 692, headers: config.headers, rows, widths: config.widths, aligns: config.aligns, fontSize: 7,
    });
    footer(page, fonts, pageNo, context.company, context.phone);
    index += rows.length;
    pageNo += 1;
  }
  return pageNo;
};

exports.createUsageReportPdf = async report => {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const selected = report.selected || {};
  const bill = selected.bill || {};
  const connection = report.connection || {};
  const kpi = selected.kpis || {};
  const calls = selected.calls || {};
  const allowance = selected.allowance || {};
  const company = bill.company || connection.company || '';
  const phone = report.number || connection.number || '';
  const employee = connection.employee || 'Unassigned';
  const period = selected.label || selected.month || '';
  const sources = selected.sources || [];
  const lines = selected.lines || [];
  const sourceTotal = sources.reduce((sum, item) => sum + num(item.amount), 0);
  const context = { company, phone };

  const page1 = pdf.addPage(PAGE);
  text(page1, period + ' Mobile Bill Report', MARGIN, 746, { font: fonts.bold, size: 20 });
  const badge = selected.status === 'over' ? 'Over plan - AED ' + money(kpi.extra) + ' extra' : selected.status === 'within' ? 'Within plan' : 'Needs review';
  const badgeWidth = Math.min(170, fonts.bold.widthOfTextAtSize(badge, 7.2) + 18);
  box(page1, PAGE[0] - MARGIN - badgeWidth, 740, badgeWidth, 20, selected.status === 'over' ? C.redSoft : C.greenSoft, selected.status === 'over' ? C.redSoft : C.greenSoft);
  text(page1, badge, PAGE[0] - MARGIN - badgeWidth / 2, 747, {
    font: fonts.bold, size: 7.2, color: selected.status === 'over' ? C.red : C.green, align: 'center',
  });
  let y = paragraph(page1, fonts,
    (bill.provider || connection.provider || 'Provider not stated') + ' - ' + phone + ' - ' + company +
    ' - Employee: ' + employee + ' - Bill ' + (bill.bill_number || '-') + ' - Period ' +
    (bill.period_from || '-') + ' to ' + (bill.period_to || '-') + (bill.due_date ? ' - Due ' + bill.due_date : ''),
    MARGIN, 722, CONTENT, { size: 7.4, color: C.muted, maxLines: 2 });
  y -= 10;
  box(page1, MARGIN, y - 70, CONTENT, 78, selected.status === 'over' ? rgb(1, 0.97, 0.96) : C.greenSoft, selected.status === 'over' ? C.redSoft : C.greenSoft);
  text(page1, 'IN SHORT', MARGIN + 10, y - 8, { font: fonts.bold, size: 7.5, color: selected.status === 'over' ? C.red : C.green });
  paragraph(page1, fonts, summary(report), MARGIN + 10, y - 24, CONTENT - 20, { size: 8.2, leading: 11, maxLines: 4 });
  y -= 86;

  const kpis = [
    ['Bill incl. VAT', 'AED ' + money(kpi.bill_incl_vat), 'current period'],
    ['Plan excl. VAT', 'AED ' + money(kpi.plan), 'applicable plan'],
    ['Excess excl. VAT', 'AED ' + money(kpi.extra), 'Above plan ' + abovePlan(kpi.extra_pct)],
    ['Actual talk time', dec(calls.actual_total_minutes, 2) + ' min', 'summed from seconds'],
    ['Premium SMS', String(num(kpi.premium_sms)), 'AED ' + money(kpi.premium_sms_amount)],
    ['Data used', dec(kpi.data_gb, 2) + ' GB', allowance.data_limit_gb != null ? 'plan ' + dec(allowance.data_limit_gb, 2) + ' GB' : 'limit not stated'],
  ];
  const kpiWidth = CONTENT / kpis.length;
  kpis.forEach((item, index) => {
    const x = MARGIN + index * kpiWidth;
    box(page1, x, y - 59, kpiWidth, 59);
    text(page1, item[0], x + 7, y - 15, { font: fonts.regular, size: 6.3, color: C.muted });
    text(page1, item[1], x + 7, y - 35, { font: fonts.bold, size: 10.6, color: index === 2 && selected.status === 'over' ? C.red : C.ink });
    text(page1, item[2], x + 7, y - 49, { font: fonts.regular, size: 5.6, color: C.muted });
  });
  y -= 84;
  y = section(page1, fonts, 1, 'Where the money went', 'Invoice charge lines. Extra components remain separate from the parent total.', y);
  const lineRows = lines.slice(0, 5).map(item => [item.description, item.part || item.type || '-', 'AED ' + money(item.amount)]);
  y = table(page1, fonts, {
    top: y, headers: ['Bill line', 'Part', 'Amount'],
    rows: lineRows.length ? lineRows : [['No itemized lines available', '-', '-']],
    widths: [0.58, 0.22, 0.20], aligns: ['left', 'left', 'right'], fontSize: 7,
  }) - 18;
  text(page1, 'Extra by source', MARGIN, y, { font: fonts.bold, size: 9 });
  y -= 10;
  const sourceRows = sources.slice(0, 3).map(item => [item.name, 'AED ' + money(item.amount), percent(item.amount, sourceTotal) + '%']);
  y = table(page1, fonts, {
    top: y, headers: ['Source (excluding VAT)', 'Amount', 'Share of extra'],
    rows: sourceRows.length ? sourceRows : [['No extra charge this month', 'AED 0.00', '0%']],
    widths: [0.62, 0.19, 0.19], aligns: ['left', 'right', 'right'], fontSize: 7,
  }) - 16;
  y = section(page1, fonts, 2, 'Usage summary', 'Data, SMS, parking, and invoice call categories.', y);
  const categoryReview = new Map((calls.category_reconciliation || []).map(item => [item.category, item]));
  const categoryRows = (calls.category_aggregates || []).slice(0, 5).map(item => [
    item.category + (categoryReview.get(item.category)?.status === 'mismatch' ? ' - Needs review' : ''), String(num(item.call_count)), dec(num(item.total_duration_seconds) / 60, 2) + ' min',
    'AED ' + money(item.amount_excl_vat),
  ]);
  const usageRows = [
    ['Data used', '-', dec(allowance.data_used_gb, 2) + ' GB', allowance.data_limit_gb != null ? 'Plan ' + dec(allowance.data_limit_gb, 2) + ' GB; difference ' + dec(allowance.data_difference_gb, 2) + ' GB; charge AED ' + money(allowance.invoice_data_charge_excl_vat) : 'Limit not stated'],
    ['Premium SMS', String(num(allowance.premium_sms)), 'messages', 'AED ' + money(allowance.premium_sms_amount)],
    ['mParking', '-', 'service', 'AED ' + money(allowance.parking_amount)],
    ...categoryRows,
  ];
  table(page1, fonts, {
    top: y, headers: ['Service / category', 'Count', 'Usage', 'Amount / allowance'],
    rows: usageRows, widths: [0.39, 0.12, 0.22, 0.27],
    aligns: ['left', 'right', 'right', 'right'], fontSize: 6.1,
  });
  footer(page1, fonts, 1, company, phone);

  const page2 = pdf.addPage(PAGE);
  y = section(page2, fonts, 3, 'Calls: actual duration and invoice charges',
    'Calls are split by invoice amount; no tariff rate or chargeable-minute assumption is inferred.', 746);
  const callRows = [
    ['Calls without charges', String(num(calls.uncharged_calls)), dec(calls.uncharged_minutes, 2) + ' min', 'AED 0.00'],
    ['Calls with charges', String(num(calls.calls_with_charges)), dec(calls.duration_of_calls_with_charges_minutes, 2) + ' min', 'AED ' + money(calls.charged_amount)],
    ['Total actual talk time (incl. incoming roaming)', String(num(calls.total_calls)), dec(calls.actual_total_minutes, 2) + ' min', '-'],
  ];
  y = table(page2, fonts, {
    top: y, headers: ['Period type', 'Calls', 'Actual duration', 'Invoice call charges'],
    rows: callRows, widths: [0.43, 0.13, 0.22, 0.22], aligns: ['left', 'right', 'right', 'right'],
  }) - 18;
  text(page2, 'Daily talk-time pattern', MARGIN, y, { font: fonts.bold, size: 8.5 });
  text(page2, 'Grey: calls without charges. Red: duration of calls with charges.', MARGIN, y - 13, { font: fonts.regular, size: 6.5, color: C.muted });
  const daily = selected.daily || [];
  const chartY = y - 112;
  const chartMax = Math.max(1, ...daily.map(item => num(item.uncharged_min) + num(item.charged_call_min)));
  rule(page2, MARGIN, chartY, PAGE[0] - MARGIN);
  const slot = CONTENT / Math.max(daily.length, 1);
  daily.slice(0, 31).forEach((item, index) => {
    const free = num(item.uncharged_min);
    const charged = num(item.charged_call_min);
    const total = free + charged;
    const height = Math.max(1, total / chartMax * 82);
    const chargedHeight = total ? height * charged / total : 0;
    const x = MARGIN + index * slot + Math.max(1, slot * 0.18);
    const width = Math.max(2, Math.min(12, slot * 0.64));
    page2.drawRectangle({ x, y: chartY, width, height, color: C.grey });
    if (chargedHeight) page2.drawRectangle({ x, y: chartY + height - chargedHeight, width, height: chargedHeight, color: C.red });
    text(page2, item.day || '', x + width / 2, chartY - 10, { font: fonts.regular, size: 5.2, color: C.muted, align: 'center' });
  });
  y = section(page2, fonts, 4, 'Top 10 numbers called', 'Ranked three ways. Monetary amounts are excluding VAT.', chartY - 32);
  const gap = 10;
  const panelWidth = (CONTENT - gap * 2) / 3;
  drawRank(page2, fonts, 'Most calls', selected.top_numbers && selected.top_numbers.by_calls, MARGIN, y, panelWidth, 'calls', C.blue);
  drawRank(page2, fonts, 'Longest total time (min)', selected.top_numbers && selected.top_numbers.by_time, MARGIN + panelWidth + gap, y, panelWidth, 'time', C.blue);
  drawRank(page2, fonts, 'Highest call charge (AED)', selected.top_numbers && selected.top_numbers.by_extra, MARGIN + (panelWidth + gap) * 2, y, panelWidth, 'extra', C.red);
  y -= 158;
  text(page2, 'Top 10 by call charge, in detail', MARGIN, y, { font: fonts.bold, size: 8.5 });
  y = table(page2, fonts, {
    top: y - 8, headers: ['#', 'Number', 'Calls', 'Total min', 'No-charge min', 'Charged-call min', 'Charge AED'],
    rows: rankedRows(selected.top_numbers && selected.top_numbers.by_extra),
    widths: [0.05, 0.25, 0.10, 0.14, 0.15, 0.17, 0.14],
    aligns: ['right', 'left', 'right', 'right', 'right', 'right', 'right'], fontSize: 6.5,
  }) - 15;
  y = section(page2, fonts, 5, 'Bill history', 'Monthly totals including VAT from available imported bills.', y);
  const history = (report.months || []).slice(-8);
  const historyMax = Math.max(1, ...history.map(item => num(item.total)));
  const historyBottom = 54;
  const historyHeight = Math.max(35, Math.min(86, y - historyBottom - 22));
  rule(page2, MARGIN, historyBottom, PAGE[0] - MARGIN);
  const historySlot = CONTENT / Math.max(history.length, 1);
  history.forEach((item, index) => {
    const x = MARGIN + index * historySlot + historySlot * 0.2;
    const width = Math.max(12, Math.min(42, historySlot * 0.6));
    const height = Math.max(2, num(item.total) / historyMax * historyHeight);
    const planShare = num(item.total) > 0 ? Math.min(1, num(item.plan) / num(item.total)) : 0;
    page2.drawRectangle({ x, y: historyBottom, width, height, color: item.status === 'over' ? C.red : C.green });
    if (planShare) page2.drawRectangle({ x, y: historyBottom, width, height: height * planShare, color: C.grey });
    text(page2, money(item.total), x + width / 2, historyBottom + height + 5, { font: fonts.bold, size: 6.2, align: 'center' });
    text(page2, item.label || item.key, x + width / 2, historyBottom - 11, { font: fonts.regular, size: 5.8, color: C.muted, align: 'center' });
  });
  footer(page2, fonts, 2, company, phone);

  let nextPage = 3;
  if (lines.length > 5) {
    nextPage = appendix(pdf, fonts, {
      title: 'Complete Invoice Charge Lines', subtitle: 'All selected-invoice lines, without fixed row limits.',
      rows: lines.map(item => [item.description, item.part || item.type || '-', 'AED ' + money(item.amount)]),
      headers: ['Bill line', 'Classification', 'Amount'], widths: [0.60, 0.22, 0.18],
      aligns: ['left', 'left', 'right'], rowsPerPage: 22,
    }, context, nextPage);
  }
  if (sources.length > 3) {
    nextPage = appendix(pdf, fonts, {
      title: 'Complete Extra-Charge Breakdown', subtitle: 'All reconciled components, excluding VAT.',
      rows: sources.map(item => [item.name, 'AED ' + money(item.amount), percent(item.amount, sourceTotal) + '%']),
      headers: ['Source', 'Amount', 'Share'], widths: [0.65, 0.19, 0.16],
      aligns: ['left', 'right', 'right'], rowsPerPage: 24,
    }, context, nextPage);
  }
  if ((calls.category_aggregates || []).length > 5) {
    nextPage = appendix(pdf, fonts, {
      title: 'Complete Call Category Summary', subtitle: 'All invoice-derived call categories.',
      rows: calls.category_aggregates.map(item => [
        item.category, String(num(item.call_count)), dec(num(item.total_duration_seconds) / 60, 2) + ' min',
        'AED ' + money(item.amount_excl_vat),
      ]),
      headers: ['Category', 'Count', 'Actual duration', 'Amount excl. VAT'],
      widths: [0.44, 0.14, 0.21, 0.21], aligns: ['left', 'right', 'right', 'right'], rowsPerPage: 24,
    }, context, nextPage);
  }
  if ((report.months || []).length > 8) {
    appendix(pdf, fonts, {
      title: 'Complete Bill History', subtitle: 'Every imported bill available for this connection.',
      rows: report.months.map(item => [
        item.label, item.bill_number || '-', 'AED ' + money(item.plan), 'AED ' + money(item.bill_excl_vat),
        'AED ' + money(item.vat), 'AED ' + money(item.total), 'AED ' + money(item.extra),
      ]),
      headers: ['Month', 'Bill no.', 'Plan excl.', 'Bill excl.', 'VAT', 'Bill incl.', 'Excess'],
      widths: [0.14, 0.20, 0.13, 0.13, 0.10, 0.14, 0.16],
      aligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right'], rowsPerPage: 24,
    }, context, nextPage);
  }

  pdf.setTitle('Tele Report - ' + clean(phone) + ' - ' + clean(period));
  pdf.setAuthor('Trakio');
  pdf.setSubject('Monthly telecom usage report');
  return pdf.save();
};
