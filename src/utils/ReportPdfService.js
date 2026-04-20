/**
 * ReportPdfService.js
 *
 * Generates beautiful, branded PDF exports for all 16 report types.
 * Uses expo-print to render HTML → PDF and expo-sharing to share.
 *
 * Usage:
 *   await ReportPdfService.export({ reportType, rows, title, dateLabel, profile, currSym });
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── Palette / Brand ──────────────────────────────────────────────────────────

const BRAND = '#262A56';
const ACCENT_MAP = {
  customer_ledger:       '#262A56',
  customer_transactions: '#6366f1',
  outstanding_dues:      '#f43f5e',
  customer_list:         '#6366f1',
  sales_report:          '#10b981',
  purchase_report:       '#f97316',
  cashbook:              '#0891b2',
  gstr1:                 '#dc2626',
  gstr2:                 '#dc2626',
  gstr3b:                '#7c3aed',
  sales_daywise:         '#7c3aed',
  purchase_daywise:      '#ea580c',
  stock_summary:         '#ea580c',
  low_stock:             '#f59e0b',
  profit_loss:           '#10b981',
  supplier_transactions: '#0891b2',
  supplier_list:         '#0891b2',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtAmt(n, sym) {
  if (typeof n !== 'number' || isNaN(n)) return `${sym}0.00`;
  return `${sym}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nowStr() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Table Builders per Report Type ──────────────────────────────────────────

function buildTableHtml(reportType, rows, sym) {
  switch (reportType) {

    case 'customer_ledger':
      return tableHtml(
        ['#', 'Customer', 'Phone', 'Total Invoiced', 'Amount Paid', 'Net Balance', 'Status'],
        rows.map((r, i) => [
          i + 1,
          r.name,
          r.phone || '—',
          fmtAmt(r.invoiced, sym),
          fmtAmt(r.paid, sym),
          `<span style="color:${r.color};font-weight:700">${r.net < 0 ? '-' : ''}${fmtAmt(Math.abs(r.net), sym)}</span>`,
          `<span style="color:${r.color};font-weight:700">${
            r.status === 'you_get' ? "You'll Get" :
            r.status === 'you_give' ? "You'll Give" : 'Settled'
          }</span>`,
        ])
      );

    case 'customer_transactions':
    case 'supplier_transactions':
      return tableHtml(
        ['#', 'Date', reportType === 'customer_transactions' ? 'Customer' : 'Supplier', 'Type', 'Reference', 'Amount', 'Status'],
        rows.map((r, i) => [
          i + 1,
          fmtDate(r.date),
          r.customer || r.supplier || '—',
          r.type || '—',
          r.ref || '—',
          fmtAmt(r.amount, sym),
          r.status || '—',
        ])
      );

    case 'outstanding_dues':
      return tableHtml(
        ['#', 'Customer', 'Total Invoiced', 'Amount Paid', 'Outstanding Due'],
        rows.map((r, i) => [i + 1, r.customer, fmtAmt(r.invoiced, sym), fmtAmt(r.paid, sym), `<span style="color:#f43f5e;font-weight:700">${fmtAmt(r.due, sym)}</span>`])
      );

    case 'customer_list':
      return tableHtml(
        ['#', 'Name', 'Phone', 'Email', 'Address'],
        rows.map((r, i) => [i + 1, r.name, r.phone, r.email || '—', r.address || '—'])
      );

    case 'sales_report':
      return tableHtml(
        ['Month', 'Invoices', 'Revenue', 'Tax Collected', 'Discount'],
        rows.map(r => [r.label, r.count, fmtAmt(r.revenue, sym), fmtAmt(r.tax || 0, sym), fmtAmt(r.discount || 0, sym)])
      );

    case 'purchase_report':
      return tableHtml(
        ['Month', 'Purchases', 'Total Amount'],
        rows.map(r => [r.label, r.count, fmtAmt(r.total || 0, sym)])
      );

    case 'cashbook':
      return tableHtml(
        ['#', 'Date', 'Party', 'Type', 'Description', 'Amount'],
        rows.map((r, i) => [
          i + 1,
          fmtDate(r.date),
          r.customer || r.supplier || '—',
          `<span style="color:${r.type === 'in' ? '#10b981' : '#f43f5e'};font-weight:700">${r.type === 'in' ? '▼ Inflow' : '▲ Outflow'}</span>`,
          r.sub || '—',
          `<span style="color:${r.type === 'in' ? '#10b981' : '#f43f5e'};font-weight:700">${fmtAmt(r.amount, sym)}</span>`,
        ])
      );

    case 'gstr1':
    case 'gstr2':
      return tableHtml(
        ['GST Rate', 'Transactions', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'],
        rows.map(r => [
          `${r.rate}%`, r.count,
          fmtAmt(r.taxable, sym),
          fmtAmt(r.cgst, sym),
          fmtAmt(r.sgst, sym),
          fmtAmt(r.igst, sym),
          fmtAmt(r.cgst + r.sgst + r.igst, sym),
        ])
      );

    case 'gstr3b':
      return tableHtml(
        ['Component', 'Amount'],
        rows.map(r => [r.label, `<span style="color:${r.color};font-weight:700">${fmtAmt(r.amount, sym)}</span>`])
      );

    case 'sales_daywise':
      return tableHtml(
        ['Date', 'Invoices', 'Revenue', 'Paid Amount'],
        rows.map(r => [fmtDate(r.date), r.count, fmtAmt(r.revenue, sym), fmtAmt(r.paid || 0, sym)])
      );

    case 'purchase_daywise':
      return tableHtml(
        ['Date', 'Purchases', 'Total Amount'],
        rows.map(r => [fmtDate(r.date), r.count, fmtAmt(r.total, sym)])
      );

    case 'stock_summary':
      return tableHtml(
        ['#', 'Item Name', 'SKU', 'Unit', 'Stock Qty', 'Unit Price', 'Stock Value'],
        rows.map((r, i) => [i + 1, r.name, r.sku, r.unit || 'pcs', r.qty, fmtAmt(r.price, sym), fmtAmt(r.value, sym)])
      );

    case 'low_stock':
      return tableHtml(
        ['#', 'Item Name', 'Current Qty', 'Minimum Threshold', 'Status'],
        rows.map((r, i) => [
          i + 1, r.name, r.qty, r.threshold || 5,
          `<span style="color:#f59e0b;font-weight:700">⚠ Low Stock</span>`,
        ])
      );

    case 'profit_loss':
      return tableHtml(
        ['Component', 'Amount', 'Notes'],
        rows.map(r => [
          r.label,
          `<span style="color:${r.color};font-weight:700">${r.amount < 0 ? '-' : ''}${fmtAmt(Math.abs(r.amount), sym)}</span>`,
          r.sub || '—',
        ])
      );

    case 'supplier_list':
      return tableHtml(
        ['#', 'Name', 'Phone', 'GSTIN', 'State'],
        rows.map((r, i) => [i + 1, r.name, r.phone, r.gstin || '—', r.state || '—'])
      );

    default:
      return tableHtml(['Entry'], rows.map(r => [JSON.stringify(r)]));
  }
}

// Generic HTML table builder
function tableHtml(headers, dataRows) {
  const headerCells = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = dataRows.map(row => {
    const cells = row.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="99" style="text-align:center;color:#94a3b8;padding:32px">No data for this period</td></tr>'}</tbody>
    </table>
  `;
}

// ─── Summary Section Builder ───────────────────────────────────────────────────

function buildSummaryHtml(reportType, rows, sym, accent) {
  let items = [];

  switch (reportType) {
    case 'customer_ledger': {
      const youllGet  = rows.filter(r => r.status === 'you_get').reduce((s, r) => s + r.net, 0);
      const youllGive = rows.filter(r => r.status === 'you_give').reduce((s, r) => s + Math.abs(r.net), 0);
      items = [
        { label: "You'll Get",       value: fmtAmt(youllGet, sym) },
        { label: "You'll Give",      value: fmtAmt(youllGive, sym) },
        { label: 'Net Balance',      value: fmtAmt(youllGet - youllGive, sym) },
        { label: 'Total Customers',  value: rows.length },
      ]; break;
    }
    case 'customer_transactions': {
      const inv = rows.filter(r => r.type === 'Invoice').reduce((s, r) => s + r.amount, 0);
      const pay = rows.filter(r => r.type === 'Payment').reduce((s, r) => s + r.amount, 0);
      items = [
        { label: 'Total Invoiced', value: fmtAmt(inv, sym) },
        { label: 'Received', value: fmtAmt(pay, sym) },
        { label: 'Transactions', value: rows.length },
      ]; break;
    }
    case 'outstanding_dues': {
      const total = rows.reduce((s, r) => s + r.due, 0);
      items = [
        { label: 'Total Outstanding', value: fmtAmt(total, sym) },
        { label: 'Customers', value: rows.length },
      ]; break;
    }
    case 'sales_report': {
      const rev = rows.reduce((s, r) => s + r.revenue, 0);
      const tax = rows.reduce((s, r) => s + (r.tax || 0), 0);
      items = [
        { label: 'Total Revenue', value: fmtAmt(rev, sym) },
        { label: 'Tax Collected', value: fmtAmt(tax, sym) },
        { label: 'Months', value: rows.length },
      ]; break;
    }
    case 'purchase_report': {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      items = [{ label: 'Total Purchased', value: fmtAmt(total, sym) }, { label: 'Months', value: rows.length }]; break;
    }
    case 'cashbook': {
      const inflow  = rows.filter(r => r.type === 'in').reduce((s, r) => s + r.amount, 0);
      const outflow = rows.filter(r => r.type === 'out').reduce((s, r) => s + r.amount, 0);
      items = [
        { label: 'Total Inflow', value: fmtAmt(inflow, sym) },
        { label: 'Total Outflow', value: fmtAmt(outflow, sym) },
        { label: 'Net Cash', value: fmtAmt(inflow - outflow, sym) },
      ]; break;
    }
    case 'gstr1':
    case 'gstr2': {
      const taxable = rows.reduce((s, r) => s + r.taxable, 0);
      const tax = rows.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);
      items = [
        { label: 'Total Taxable', value: fmtAmt(taxable, sym) },
        { label: 'Total Tax', value: fmtAmt(tax, sym) },
        { label: 'Tax Slabs', value: rows.length },
      ]; break;
    }
    case 'gstr3b': {
      const payable = rows.filter(r => r.label.startsWith('Net')).reduce((s, r) => s + r.amount, 0);
      items = [{ label: 'Net Tax Payable', value: fmtAmt(payable, sym) }]; break;
    }
    case 'sales_daywise': {
      const rev = rows.reduce((s, r) => s + r.revenue, 0);
      items = [{ label: 'Total Revenue', value: fmtAmt(rev, sym) }, { label: 'Days', value: rows.length }]; break;
    }
    case 'purchase_daywise': {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      items = [{ label: 'Total Purchases', value: fmtAmt(total, sym) }, { label: 'Days', value: rows.length }]; break;
    }
    case 'stock_summary': {
      const value = rows.reduce((s, r) => s + (r.value || 0), 0);
      items = [{ label: 'Stock Value', value: fmtAmt(value, sym) }, { label: 'Items', value: rows.length }]; break;
    }
    case 'low_stock': {
      items = [{ label: 'Low Stock Items', value: rows.length }]; break;
    }
    case 'profit_loss': {
      const gp = rows.find(r => r.label === 'Gross Profit');
      items = [{ label: 'Gross Profit', value: fmtAmt(gp ? gp.amount : 0, sym) }]; break;
    }
    default: {
      items = [{ label: 'Total Entries', value: rows.length }]; break;
    }
  }

  const cards = items.map(item => `
    <div class="summary-card">
      <div class="summary-label">${item.label}</div>
      <div class="summary-value">${item.value}</div>
    </div>
  `).join('');

  return `<div class="summary-row">${cards}</div>`;
}

// ─── Full HTML Builder ────────────────────────────────────────────────────────

function buildReportHtml({ reportType, rows, title, dateLabel, profile, currSym }) {
  const sym    = currSym || '₹';
  const accent = ACCENT_MAP[reportType] || BRAND;
  const biz    = profile?.business_name || profile?.name || 'My Business';
  const gstin  = profile?.gstin ? `GSTIN: ${profile.gstin}` : '';
  const phone  = profile?.phone || '';
  const addr   = [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', ');
  const now    = nowStr();

  const tableContent = buildTableHtml(reportType, rows, sym);
  const summaryHtml  = buildSummaryHtml(reportType, rows, sym, accent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; color: #1e293b; font-size: 12px; }

    /* Page Header */
    .page-header {
      background: linear-gradient(135deg, ${BRAND} 0%, #1a1f45 100%);
      color: white;
      padding: 28px 32px 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .biz-name { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
    .biz-sub  { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 4px; }
    .report-badge {
      background: ${accent};
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Report Title */
    .report-title-bar {
      background: ${accent};
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .report-title { color: white; font-size: 16px; font-weight: 900; letter-spacing: -0.3px; }
    .report-meta  { color: rgba(255,255,255,0.75); font-size: 11px; font-weight: 600; }

    /* Summary Cards */
    .summary-row {
      display: flex;
      gap: 14px;
      padding: 20px 32px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
    }
    .summary-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .summary-value { font-size: 18px; font-weight: 900; color: ${accent}; letter-spacing: -0.5px; }

    /* Table */
    .table-section { padding: 20px 32px; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    thead { background: ${accent}; }
    thead th { color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 12px 14px; text-align: left; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #fafbfd; }
    tbody td { padding: 11px 14px; font-size: 11.5px; color: #334155; vertical-align: middle; }

    /* Footer */
    .page-footer {
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    .footer-text { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .footer-brand { font-size: 10px; color: ${BRAND}; font-weight: 900; }

    /* Print adjustments */
    @media print {
      body { background: white; }
      .table-section { padding: 10px 20px; }
    }
  </style>
</head>
<body>

  <!-- Page Header -->
  <div class="page-header">
    <div>
      <div class="biz-name">${biz}</div>
      <div class="biz-sub">${[addr, phone, gstin].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="report-badge">Financial Report</div>
  </div>

  <!-- Report Title Bar -->
  <div class="report-title-bar">
    <div class="report-title">${title}</div>
    <div class="report-meta">Period: ${dateLabel} &nbsp;·&nbsp; Generated: ${now}</div>
  </div>

  <!-- Summary Cards -->
  ${summaryHtml}

  <!-- Data Table -->
  <div class="table-section">
    ${tableContent}
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <div class="footer-text">Zoxm Invoice · This report was auto-generated · ${now}</div>
    <div class="footer-brand">ZOXM INVOICE</div>
  </div>

</body>
</html>`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const ReportPdfService = {
  /**
   * Generate PDF and open the share sheet.
   * @param {{ reportType, rows, title, dateLabel, profile, currSym }} opts
   */
  async export({ reportType, rows, title, dateLabel, profile, currSym }) {
    const html = buildReportHtml({ reportType, rows, title, dateLabel, profile, currSym });

    // printToFileAsync returns a temp file URI — directly sharable, no copy needed
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) throw new Error('Sharing is not available on this device');

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title || 'Export Report',
      UTI: 'com.adobe.pdf',
    });

    return uri;
  },

  /**
   * Print directly via system print dialog (iOS/Android).
   */
  async print({ reportType, rows, title, dateLabel, profile, currSym }) {
    const html = buildReportHtml({ reportType, rows, title, dateLabel, profile, currSym });
    await Print.printAsync({ html });
  },
};
