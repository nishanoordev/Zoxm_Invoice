/**
 * renderItemsTable.js
 * Renders the line-item table with configurable columns.
 * Columns: # | Description | HSN | Qty (Unit) | Rate | Disc% | GST% | Amount
 */

export function renderItemsTable(ctx) {
  const { config, lineItems, sym, taxPercent } = ctx;

  // Determine which optional columns to show
  const showHsn  = config.showHsnColumn;
  const showDisc = config.showDiscountColumn;
  const showGst  = config.showGstColumn &&
    (taxPercent > 0 || (lineItems || []).some(i => parseFloat(i.tax_percent || i.gst_percent || 0) > 0));
  const showUnit = config.showUnitColumn;
  const showDesc = config.showDescriptionUnderName;

  // Count total columns for colspan footer cell
  let colCount = 4; // #, description, qty, amount — always present
  if (showHsn)  colCount++;
  if (showDisc) colCount++;
  if (showGst)  colCount++;

  const headerCells = [
    `<th style="width:30px;text-align:center;">#</th>`,
    `<th style="text-align:left;">Description</th>`,
    showHsn  ? `<th style="width:80px;text-align:center;">HSN Code</th>` : '',
    `<th style="width:60px;text-align:center;">Qty</th>`,
    `<th style="width:90px;text-align:right;">Rate</th>`,
    showDisc ? `<th style="width:50px;text-align:center;">Disc%</th>` : '',
    showGst  ? `<th style="width:50px;text-align:center;">GST%</th>` : '',
    `<th style="width:100px;text-align:right;">Amount</th>`,
  ].join('');

  const bodyRows = (lineItems || []).map((item, i) => {
    const rate  = parseFloat(item.rate || 0);
    const qty   = parseFloat(item.quantity || item.qty || 1);
    const unit  = item.unit || 'pcs';
    const disc  = parseFloat(item.mrp_discount || item.mrpDiscount || 0);
    const gstPt = parseFloat(item.tax_percent || item.gst_percent || 0);
    const total = parseFloat(item.total || (rate * qty * (1 - disc / 100)));

    const descHtml = showDesc && item.description
      ? `<p style="font-size:9px;color:#575c83;margin:0;">${item.description}</p>` : '';

    const unitHtml = showUnit && unit !== 'pcs'
      ? ` <span style="font-size:9px;color:#94a3b8;">${unit}</span>` : '';

    return `
      <tr>
        <td style="padding:10px 8px;text-align:center;font-size:11px;color:#575c83;">${i + 1}</td>
        <td style="padding:10px 8px;vertical-align:top;">
          <p style="font-weight:bold;margin:0 0 2px;font-size:12px;">${item.name || ''}</p>
          ${descHtml}
        </td>
        ${showHsn  ? `<td style="padding:10px 8px;text-align:center;color:#575c83;font-size:11px;">${item.hsn_code || item.hsnCode || '-'}</td>` : ''}
        <td style="padding:10px 8px;text-align:center;font-weight:600;font-size:12px;">${qty}${unitHtml}</td>
        <td style="padding:10px 8px;text-align:right;font-size:12px;">${sym} ${rate.toFixed(2)}</td>
        ${showDisc ? `<td style="padding:10px 8px;text-align:center;font-size:11px;">${disc > 0 ? disc + '%' : '-'}</td>` : ''}
        ${showGst  ? `<td style="padding:10px 8px;text-align:center;color:#575c83;font-size:11px;">${gstPt > 0 ? gstPt + '%' : taxPercent > 0 ? taxPercent + '%' : '-'}</td>` : ''}
        <td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:12px;">${sym} ${total.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const footerColspan = colCount - 2;

  return `
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr style="height:28px;">
          <td colspan="${footerColspan}" style="padding:4px;"></td>
          <td style="text-align:center;vertical-align:bottom;padding:4px;font-size:9px;font-weight:800;text-transform:uppercase;">Total</td>
          <td></td>
        </tr>
      </tbody>
    </table>`;
}
