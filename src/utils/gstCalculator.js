/**
 * gstCalculator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-function Indian GST utilities for ZOXM Invoice.
 *
 * Key concepts:
 *  • Intra-state sale  →  CGST (rate/2) + SGST (rate/2)
 *  • Inter-state sale  →  IGST (full rate)
 *  • Exclusive tax (default): tax is ADDED on top of item price.
 *  • Inclusive tax: tax is EMBEDDED inside the item price; price / (1 + rate/100).
 *
 * All functions are stateless and safe for use inside React useMemo().
 */

// ─── Indian States & UTs ──────────────────────────────────────────────────────
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// ─── GST Rate slabs (common reference) ───────────────────────────────────────
export const GST_RATE_SLABS = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 14, 18, 28];

// ─── GSTIN Validation ─────────────────────────────────────────────────────────
/**
 * Validates a GSTIN string.
 * Format: 2-digit state code + 10-char PAN + entity number + Z + check digit
 * e.g.  07AAAAA0000A1Z5
 *
 * @param {string} gstin
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateGstin(gstin) {
  if (!gstin || gstin.trim() === '') {
    return { valid: false, error: null }; // blank = not provided, not invalid
  }
  const cleaned = gstin.toUpperCase().trim();
  if (cleaned.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters.' };
  }
  // Regex: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alphanumeric + Z + 1 alphanumeric
  const gstinRegex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
  if (!gstinRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid GSTIN format. Expected format: 07AAAAA0000A1Z5' };
  }
  return { valid: true, error: null };
}

// ─── Validate HSN Code ────────────────────────────────────────────────────────
/**
 * Basic HSN/SAC code format check (4, 6, or 8 digits).
 * @param {string} hsn
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateHsn(hsn) {
  if (!hsn || hsn.trim() === '') return { valid: true, error: null }; // optional
  const cleaned = hsn.trim();
  if (!/^\d{4}(\d{2})?(\d{2})?$/.test(cleaned)) {
    return { valid: false, error: 'HSN code must be 4, 6, or 8 digits.' };
  }
  return { valid: true, error: null };
}

// ─── Inter-state determination ────────────────────────────────────────────────
/**
 * Returns true if the sale is inter-state (IGST applies).
 * If either state is empty/unknown, defaults to false (CGST+SGST).
 *
 * @param {string} sellerState  — from profile.state
 * @param {string} buyerState   — from customer.state or invoice.customer_state
 * @returns {boolean}
 */
export function isInterState(sellerState, buyerState) {
  const s = (sellerState || '').trim().toLowerCase();
  const b = (buyerState || '').trim().toLowerCase();
  if (!s || !b) return false; // unknown → safe default = CGST+SGST
  return s !== b;
}

// ─── GST Rate Split ───────────────────────────────────────────────────────────
/**
 * Given a total GST rate (e.g. 18), returns the component rates.
 *
 * @param {number} totalRate     — e.g. 18
 * @param {boolean} interState
 * @returns {{ cgstRate: number, sgstRate: number, igstRate: number }}
 */
export function splitGstRate(totalRate, interState) {
  const rate = parseFloat(totalRate) || 0;
  if (interState) {
    return { cgstRate: 0, sgstRate: 0, igstRate: rate };
  }
  const half = rate / 2;
  return { cgstRate: half, sgstRate: half, igstRate: 0 };
}

// ─── Per-item GST calculation ─────────────────────────────────────────────────
/**
 * Calculates GST amounts for a single line-item.
 *
 * @param {object} item           — line-item with { total, tax_percent }
 *   item.total         — line total AFTER item-level discount (Qty × Rate × (1 - disc%))
 *   item.tax_percent   — GST rate for this item (e.g. 18)
 * @param {'exclusive'|'inclusive'} taxMode
 * @param {boolean} interState
 * @returns {{
 *   taxableValue: number,   — base amount on which tax is calculated
 *   cgstAmt: number,
 *   sgstAmt: number,
 *   igstAmt: number,
 *   totalTax: number,
 *   lineTotal: number       — final line amount (taxable + tax for exclusive; same as total for inclusive)
 * }}
 */
export function calcItemGst(item, taxMode = 'exclusive', interState = false) {
  const itemTotal = parseFloat(item.total) || 0;
  const rate = parseFloat(item.tax_percent) || 0;
  const { cgstRate, sgstRate, igstRate } = splitGstRate(rate, interState);

  let taxableValue, cgstAmt, sgstAmt, igstAmt;

  if (taxMode === 'inclusive') {
    // Tax is already baked into the price
    // taxable = price / (1 + rate/100)
    const divisor = 1 + rate / 100;
    taxableValue = divisor > 0 ? itemTotal / divisor : itemTotal;
    if (interState) {
      igstAmt = itemTotal - taxableValue;
      cgstAmt = 0;
      sgstAmt = 0;
    } else {
      igstAmt = 0;
      // CGST and SGST each = taxable × half_rate / 100
      cgstAmt = taxableValue * (cgstRate / 100);
      sgstAmt = taxableValue * (sgstRate / 100);
    }
  } else {
    // Exclusive: tax is added on top
    taxableValue = itemTotal;
    cgstAmt = taxableValue * (cgstRate / 100);
    sgstAmt = taxableValue * (sgstRate / 100);
    igstAmt = taxableValue * (igstRate / 100);
  }

  const r2 = (v) => Math.round(v * 100) / 100;

  taxableValue = r2(taxableValue);
  cgstAmt      = r2(cgstAmt);
  sgstAmt      = r2(sgstAmt);
  igstAmt      = r2(igstAmt);
  const totalTax = r2(cgstAmt + sgstAmt + igstAmt);

  return {
    taxableValue,
    cgstAmt,
    sgstAmt,
    igstAmt,
    totalTax,
    lineTotal: taxMode === 'inclusive' ? r2(itemTotal) : r2(itemTotal + totalTax),
  };
}

// ─── Full invoice GST summary ─────────────────────────────────────────────────
/**
 * Aggregates GST across all line-items for an invoice.
 *
 * Items use their own `tax_percent` (from inventory).
 * If an item has no `tax_percent` and a `fallbackRate` is provided, that is used.
 *
 * @param {object[]} items            — array of line-items
 * @param {number}   discountPercent  — global discount % (applied to subtotal)
 * @param {'exclusive'|'inclusive'} taxMode
 * @param {boolean}  interState
 * @param {number}   [fallbackRate=0] — global rate applied when item.tax_percent is 0
 *
 * @returns {{
 *   grossSubtotal: number,   — sum of (rate × qty) before item discounts
 *   itemDiscountTotal: number,
 *   subtotal: number,        — sum of item.total after item discounts
 *   globalDiscountAmount: number,
 *   taxableAmount: number,   — subtotal after global discount, before tax (exclusive) or taxable part (inclusive)
 *   totalCgst: number,
 *   totalSgst: number,
 *   totalIgst: number,
 *   totalTax: number,
 *   grandTotal: number,
 *   isInterState: boolean,
 *   itemGstDetails: object[] — per-item GST breakdown
 * }}
 */
export function calcInvoiceGst(
  items = [],
  discountPercent = 0,
  taxMode = 'exclusive',
  interState = false,
  fallbackRate = 0
) {
  const r2 = (v) => Math.round(v * 100) / 100;

  // 1. Gross subtotal (rate × qty, no discounts)
  const grossSubtotal = r2(
    items.reduce((sum, it) => sum + (parseFloat(it.rate) * parseFloat(it.qty || it.quantity) || 0), 0)
  );

  // 2. Net subtotal = sum of item.total (after item-level discounts)
  const subtotal = r2(items.reduce((sum, it) => sum + (parseFloat(it.total) || 0), 0));

  const itemDiscountTotal = r2(grossSubtotal - subtotal);

  // 3. Global discount applied against the subtotal
  const globalDiscountAmount = r2(subtotal * ((parseFloat(discountPercent) || 0) / 100));
  const afterGlobalDiscount = r2(subtotal - globalDiscountAmount);

  // 4. Per-item GST — apply global discount proportionally, then calc GST
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let taxableAmount = 0;

  const itemGstDetails = items.map((it) => {
    // Effective item total after proportional global discount
    const itemTotal = parseFloat(it.total) || 0;
    const proportion = subtotal > 0 ? itemTotal / subtotal : 0;
    const discountedItemTotal = r2(itemTotal - globalDiscountAmount * proportion);

    const effectiveRate = parseFloat(it.tax_percent) > 0
      ? parseFloat(it.tax_percent)
      : parseFloat(fallbackRate) || 0;

    const gstItem = calcItemGst(
      { total: discountedItemTotal, tax_percent: effectiveRate },
      taxMode,
      interState
    );

    taxableAmount += gstItem.taxableValue;
    totalCgst += gstItem.cgstAmt;
    totalSgst += gstItem.sgstAmt;
    totalIgst += gstItem.igstAmt;

    return {
      name: it.name || '',
      hsn_code: it.hsn_code || '',
      taxRate: effectiveRate,
      ...gstItem,
    };
  });

  taxableAmount = r2(taxableAmount);
  totalCgst     = r2(totalCgst);
  totalSgst     = r2(totalSgst);
  totalIgst     = r2(totalIgst);
  const totalTax = r2(totalCgst + totalSgst + totalIgst);

  // Grand total:
  //   exclusive → discounted subtotal + tax
  //   inclusive → discounted subtotal (tax already inside)
  const grandTotal = taxMode === 'inclusive'
    ? r2(afterGlobalDiscount)
    : r2(afterGlobalDiscount + totalTax);

  return {
    grossSubtotal,
    itemDiscountTotal,
    subtotal,
    globalDiscountAmount,
    taxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    isInterState: interState,
    itemGstDetails,
  };
}
