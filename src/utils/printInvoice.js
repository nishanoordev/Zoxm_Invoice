import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Generates an HTML invoice and opens the system print dialog / share sheet.
 * @param {object} invoice - The invoice object from the store
 * @param {object} profile - The business profile from the store
 * @param {Array}  payments - All payments (to calculate balance)
 */
export async function printInvoice(invoice, profile, payments = []) {
  const currencySymbol = profile?.currency_symbol || '₹';
  const businessName   = profile?.name || 'Business';
  const businessGstin  = profile?.gstin || '';
  const businessEmail  = profile?.email || '';

  // Calculate paid amount from payments
  const totalPaid = payments
    .filter(p => p.invoiceId === invoice.id || p.invoice_id === invoice.id)
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const balance = Math.max(0, (parseFloat(invoice.total) || 0) - totalPaid);

  const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || '—';
  const customerName  = invoice.customerName  || invoice.customer_name  || '—';
  const date          = invoice.date || new Date().toLocaleDateString();
  const status        = invoice.status || '—';
  const total         = parseFloat(invoice.total || 0).toFixed(2);
  const tax           = parseFloat(invoice.taxAmount || invoice.tax_amount || 0).toFixed(2);
  const discount      = parseFloat(invoice.discountAmount || invoice.discount_amount || 0).toFixed(2);

  const statusColor = {
    Paid: '#16a34a', Partial: '#d97706', Overdue: '#dc2626',
    Draft: '#64748b', Sent: '#2563eb', Unpaid: '#dc2626',
  }[status] || '#64748b';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 28px; font-weight: 900; color: #262A56; letter-spacing: -1px; }
    .brand-sub { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
    .inv-meta { text-align: right; }
    .inv-meta h2 { font-size: 22px; font-weight: 900; color: #262A56; }
    .inv-meta p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .divider { border: none; border-top: 2px solid #f1f5f9; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .info-block h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
    .info-block p { font-size: 14px; font-weight: 700; color: #1e293b; }
    .info-block p.sub { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px; }
    .status-badge {
      display: inline-block; padding: 4px 12px; border-radius: 999px;
      font-size: 10px; font-weight: 800; letter-spacing: 1px;
      text-transform: uppercase; background: ${statusColor}22; color: ${statusColor};
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;
         padding: 10px 12px; text-align: left; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    th.right, td.right { text-align: right; }
    td { font-size: 13px; padding: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    td.name { font-weight: 700; color: #1e293b; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b; }
    .totals-row.total { font-size: 17px; font-weight: 900; color: #262A56; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 6px; }
    .totals-row.balance { font-size: 15px; font-weight: 800; color: #dc2626; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${businessName}</div>
      ${businessGstin ? `<div class="brand-sub">GSTIN: ${businessGstin}</div>` : ''}
      ${businessEmail ? `<div class="brand-sub">${businessEmail}</div>` : ''}
    </div>
    <div class="inv-meta">
      <h2>${(invoice.type === 'estimate') ? 'ESTIMATE' : 'INVOICE'}</h2>
      <p>${invoiceNumber}</p>
      <p>${date}</p>
      <br/>
      <span class="status-badge">${status}</span>
    </div>
  </div>

  <hr class="divider"/>

  <div class="info-row">
    <div class="info-block">
      <h4>Bill To</h4>
      <p>${customerName}</p>
      ${invoice.customerPhone ? `<p class="sub">${invoice.customerPhone}</p>` : ''}
      ${invoice.customer_gstin ? `<p class="sub">GSTIN: ${invoice.customer_gstin}</p>` : ''}
    </div>
    <div class="info-block" style="text-align:right">
      <h4>Invoice Details</h4>
      <p>${invoiceNumber}</p>
      <p class="sub">Date: ${date}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.items || []).length > 0
        ? (invoice.items || []).map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="name">${item.name || '—'}<br/><span style="font-size:11px;color:#94a3b8;font-weight:500">${item.description || ''}</span></td>
            <td class="right">${item.quantity || item.qty || 1}</td>
            <td class="right">${currencySymbol}${parseFloat(item.rate || 0).toFixed(2)}</td>
            <td class="right">${currencySymbol}${parseFloat(item.total || 0).toFixed(2)}</td>
          </tr>`).join('')
        : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">No items</td></tr>`
      }
    </tbody>
  </table>

  <div class="totals">
    ${parseFloat(discount) > 0 ? `
    <div class="totals-row">
      <span>Discount</span>
      <span>- ${currencySymbol}${discount}</span>
    </div>` : ''}
    ${parseFloat(tax) > 0 ? `
    <div class="totals-row">
      <span>Tax (${invoice.taxPercent || invoice.tax_percent || 0}%)</span>
      <span>+ ${currencySymbol}${tax}</span>
    </div>` : ''}
    <div class="totals-row total">
      <span>Total</span>
      <span>${currencySymbol}${total}</span>
    </div>
    ${totalPaid > 0 ? `
    <div class="totals-row">
      <span>Paid</span>
      <span style="color:#16a34a">- ${currencySymbol}${totalPaid.toFixed(2)}</span>
    </div>` : ''}
    ${balance > 0 ? `
    <div class="totals-row balance">
      <span>Balance Due</span>
      <span>${currencySymbol}${balance.toFixed(2)}</span>
    </div>` : ''}
  </div>

  ${invoice.notes ? `
  <div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid #262A56">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px">Notes</div>
    <p style="font-size:13px;color:#475569">${invoice.notes}</p>
  </div>` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px">Generated by ${businessName} • ZOXM Invoice</p>
  </div>
</body>
</html>
`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Try native print dialog first; fall back to sharing if unavailable
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
}
