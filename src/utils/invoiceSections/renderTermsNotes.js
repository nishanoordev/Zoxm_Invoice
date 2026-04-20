/**
 * renderTermsNotes.js
 * Renders the Terms & Conditions block and the per-invoice Notes block.
 * Called from renderTotals.js as the left column of the totals grid.
 */

export function renderTermsNotes(ctx) {
  const { config, invoiceNotes, paymentInstructions } = ctx;

  const termsHtml = config.termsEnabled && config.termsText
    ? `<div class="terms-block">
         <p class="sec-title" style="margin-bottom:8px;">Terms &amp; Conditions:</p>
         <div class="terms-text">
           ${escHtml(config.termsText).replace(/\n/g, '<br/>')}
           ${paymentInstructions
             ? `<br/>${escHtml(paymentInstructions).replace(/\n/g, '<br/>')}`
             : ''}
         </div>
       </div>`
    : '';

  const notesHtml = config.showNotesSection && invoiceNotes
    ? `<div class="notes-block">
         <p class="notes-label">${escHtml(config.notesLabel || 'Notes')}</p>
         <p class="notes-text">${escHtml(invoiceNotes).replace(/\n/g, '<br/>')}</p>
       </div>`
    : '';

  return `<div class="terms-section">${termsHtml}${notesHtml}</div>`;
}

/** Minimal HTML escaping to prevent XSS in user-supplied text. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
