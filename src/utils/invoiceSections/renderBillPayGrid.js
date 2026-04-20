/**
 * renderBillPayGrid.js
 * Renders the two-column grid: Bill To (left) + Payment Info (right).
 */
import { renderCustomFields } from './renderCustomFields';

function renderBillTo(ctx) {
  const { config, customerName, customerAddress, customerPhone, customerEmail, customerGstin, invoice } = ctx;
  const customerState = invoice?.customer_state || invoice?.customerState || '';

  const addressHtml = config.showBuyerAddress && customerAddress
    ? `<p class="cust-detail">${customerAddress.replace(/\n/g, '<br/>')}</p>` : '';
  const phoneHtml = config.showBuyerPhone && customerPhone
    ? `<p class="cust-detail">📞 ${customerPhone}</p>` : '';
  const emailHtml = config.showBuyerEmail && customerEmail
    ? `<p class="cust-detail">✉ ${customerEmail}</p>` : '';
  const gstinHtml = config.showBuyerGstin
    ? `<p class="cust-gst">GSTIN: ${customerGstin || 'Not Provided'}</p>` : '';
  const stateHtml = config.showBuyerState && customerState
    ? `<p class="cust-detail" style="margin-top:4px;">State: ${customerState}</p>` : '';
  const customHtml = renderCustomFields(ctx, 'buyer_block');

  return `
    <div class="bill-section">
      <p class="sec-title">Bill To:</p>
      <p class="cust-name">${customerName.toUpperCase()}</p>
      ${addressHtml}
      ${phoneHtml}
      ${emailHtml}
      ${gstinHtml}
      ${stateHtml}
      ${customHtml}
    </div>`;
}

function renderPaymentInfo(ctx) {
  const { config, paymentMode, bankDetails, upiId, qrUrl } = ctx;
  if (!config.showPaymentInfo) return '<div class="pay-section"></div>';

  let modeDisplay = paymentMode || 'Cash';
  let detailsHtml = '';

  if (paymentMode === 'NEFT' || paymentMode === 'Bank Transfer' || paymentMode === 'NEFT / Bank Transfer') {
    modeDisplay = 'NEFT / Bank Transfer';
    detailsHtml = bankDetails
      ? `<div class="pay-item" style="margin-bottom:0;">
           <p class="pay-label">Bank Details</p>
           <p style="font-size:11px;color:#121642;line-height:1.4;margin:0;">${bankDetails.replace(/\n/g, '<br/>')}</p>
         </div>`
      : '';
  } else if (paymentMode === 'UPI') {
    detailsHtml = upiId
      ? `<div class="pay-item" style="margin-bottom:0;">
           <p class="pay-label">UPI ID</p>
           <p style="font-size:13px;color:#121642;font-weight:600;margin:0;">${upiId}</p>
         </div>`
      : '';
  }

  const qrHtml = config.showUpiQr && qrUrl
    ? `<div style="text-align:center;margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
         <img src="${qrUrl}" alt="QR" style="width:90px;height:90px;margin:0 auto;display:block;"
              onerror="this.parentElement.style.display='none';" />
         <p style="font-size:8px;color:#94a3b8;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Scan to Pay</p>
       </div>`
    : '';

  return `
    <div class="pay-section">
      <p class="sec-title">Payment Info</p>
      <div class="pay-item">
        <p class="pay-label">Payment Mode</p>
        <p class="pay-val">${modeDisplay}</p>
      </div>
      ${detailsHtml}
      ${qrHtml}
    </div>`;
}

export function renderBillPayGrid(ctx) {
  return `
    <div class="bill-pay-grid">
      ${renderBillTo(ctx)}
      ${renderPaymentInfo(ctx)}
    </div>`;
}
