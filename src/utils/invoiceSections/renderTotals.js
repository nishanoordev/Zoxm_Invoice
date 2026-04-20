/**
 * renderTotals.js
 * Renders the two-column totals grid: Terms+Notes (left) | Calc (right).
 * The calc column shows subtotal → discount → GST → grand total → paid/balance.
 */
import { renderTermsNotes } from './renderTermsNotes';

export function renderTotals(ctx) {
  const {
    config, sym, rawSubtotal, globalDiscountAmount, globalDiscountPercent,
    taxAmount, taxPercent, isInterState, halfTaxPercent, halfTaxAmount,
    total, amountPaid, balanceDue, isEstimate
  } = ctx;

  // ── Calc rows ──
  const subtotalRow = config.showSubtotal
    ? `<div class="calc-row"><span>Subtotal</span><span class="calc-val">${sym} ${rawSubtotal.toFixed(2)}</span></div>`
    : '';

  const discRow = config.showDiscount && globalDiscountAmount > 0
    ? `<div class="calc-row">
         <span>Discount${globalDiscountPercent > 0 ? ` (${globalDiscountPercent}%)` : ''}</span>
         <span class="calc-val" style="color:#22c55e;">- ${sym} ${globalDiscountAmount.toFixed(2)}</span>
       </div>`
    : '';

  let gstRows = '';
  if (config.showGstBreakdown && taxAmount > 0) {
    gstRows = isInterState
      ? `<div class="calc-row"><span>Add: IGST @ ${taxPercent}%</span><span class="calc-val">${sym} ${taxAmount.toFixed(2)}</span></div>`
      : `<div class="calc-row"><span>Add: CGST @ ${halfTaxPercent}%</span><span class="calc-val">${sym} ${halfTaxAmount}</span></div>
         <div class="calc-row"><span>Add: SGST @ ${halfTaxPercent}%</span><span class="calc-val">${sym} ${halfTaxAmount}</span></div>`;
  }

  // ── Grand Total ──
  const grandTotalHtml = `
    <div class="grand-total-bg">
      <span class="grand-label">Grand Total</span>
      <span class="grand-val">${sym} ${total.toFixed(2)}</span>
    </div>`;

  // ── Paid / Balance ──
  let payStatusHtml = '';
  if (config.showPaymentStatus && !isEstimate) {
    if (amountPaid > 0 && balanceDue > 0.01) {
      payStatusHtml = `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1;">
          <div class="calc-row">
            <span style="font-weight:700;">Amount Paid</span>
            <span class="calc-val" style="color:#059669;">- ${sym} ${amountPaid.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;background:#fef2f2;padding:8px 12px;border-radius:6px;margin-top:4px;">
            <span style="font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">Balance Due</span>
            <span style="font-size:16px;font-weight:900;color:#dc2626;">${sym} ${balanceDue.toFixed(2)}</span>
          </div>
        </div>`;
    } else if (amountPaid > 0 && balanceDue <= 0.01) {
      payStatusHtml = `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1;">
          <div style="display:flex;justify-content:space-between;background:#f0fdf4;padding:8px 12px;border-radius:6px;">
            <span style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.05em;">✓ Fully Paid</span>
            <span style="font-size:14px;font-weight:800;color:#059669;">${sym} ${amountPaid.toFixed(2)}</span>
          </div>
        </div>`;
    }
  }

  return `
    <div class="totals-grid">
      ${renderTermsNotes(ctx)}
      <div class="calc-section">
        ${subtotalRow}
        ${discRow}
        ${gstRows}
        ${grandTotalHtml}
        ${payStatusHtml}
      </div>
    </div>`;
}
