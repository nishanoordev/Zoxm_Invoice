/**
 * renderHeader.js
 * Renders the top bar: document title (left) + invoice meta (right).
 */
import { renderCustomFields } from './renderCustomFields';

export function renderHeader(ctx) {
  const { config, isEstimate, invNumber, invDate, dueDate } = ctx;

  const title = config.documentTitle
    || (isEstimate ? 'ESTIMATE' : 'TAX INVOICE');

  const numberBlock = config.showInvoiceNumber
    ? `<div style="margin-bottom:8px;">
         <p class="meta-label">${isEstimate ? 'ESTIMATE NO:' : 'INVOICE NO:'}</p>
         <p class="meta-val">${invNumber}</p>
       </div>`
    : '';

  const dateBlock = config.showDate
    ? `<div style="margin-bottom:8px;">
         <p class="meta-label">DATE:</p>
         <p class="meta-val">${invDate}</p>
       </div>`
    : '';

  const dueDateBlock = config.showDueDate && dueDate
    ? `<div>
         <p class="meta-label">DUE DATE:</p>
         <p class="meta-val">${dueDate}</p>
       </div>`
    : '';

  const customHeaderMeta = renderCustomFields(ctx, 'header_meta');

  return `
    <div class="header">
      <h1 class="tax-label">${title}</h1>
      <div class="inv-meta">
        ${numberBlock}
        ${dateBlock}
        ${dueDateBlock}
        ${customHeaderMeta}
      </div>
    </div>`;
}
