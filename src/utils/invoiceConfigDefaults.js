/**
 * invoiceConfigDefaults.js
 * Default configuration object for the invoice template system.
 * All values here are the "factory" defaults — identical to the original
 * hardcoded invoice look, so existing users see no change on upgrade.
 */

export const DEFAULT_INVOICE_CONFIG = {
  // ── Template ─────────────────────────────────────────────────────────────
  template: 'modern',       // 'modern' | 'classic' | 'minimal'

  // ── Brand / Colors ────────────────────────────────────────────────────────
  primaryColor: '#121642',
  accentColor:  '#ec5b13',
  fontFamily:   'Helvetica, Arial, sans-serif',

  // ── Logo ──────────────────────────────────────────────────────────────────
  showLogo:      true,
  logoPosition:  'center',   // 'left' | 'center' | 'right'
  logoMaxHeight: 55,

  // ── Document Title ────────────────────────────────────────────────────────
  documentTitle: null,       // null = auto ('TAX INVOICE' / 'ESTIMATE')

  // ── Header Fields ─────────────────────────────────────────────────────────
  showInvoiceNumber: true,
  showDate:          true,
  showDueDate:       true,

  // ── Seller Block ──────────────────────────────────────────────────────────
  showSellerAddress: true,
  showSellerPhone:   true,
  showSellerEmail:   false,
  showGstin:         true,
  showPan:           true,
  showSellerState:   false,

  // ── Buyer Block ───────────────────────────────────────────────────────────
  showBuyerAddress: true,
  showBuyerPhone:   true,
  showBuyerEmail:   false,
  showBuyerGstin:   true,
  showBuyerState:   false,

  // ── Line Item Table Columns ───────────────────────────────────────────────
  showHsnColumn:            true,
  showDiscountColumn:       true,
  showGstColumn:            true,   // auto-hidden when all items have 0 GST
  showUnitColumn:           true,
  showDescriptionUnderName: true,

  // ── Totals Section ────────────────────────────────────────────────────────
  showSubtotal:      true,
  showDiscount:      true,
  showGstBreakdown:  true,
  showAmountInWords: true,
  showPaymentStatus: true,

  // ── Payment Section ───────────────────────────────────────────────────────
  showPaymentInfo: true,
  showUpiQr:       true,

  // ── Signature / Footer ────────────────────────────────────────────────────
  showSignature:   true,
  showDeclaration: true,

  // ── Terms & Conditions ────────────────────────────────────────────────────
  termsEnabled: true,
  termsText: '1. Payments are due within 14 days of invoice.\n2. Goods/Services once sold will not be taken back.\n3. Interest @ 18% will be charged if payment is delayed.',

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesLabel:       'Notes',
  showNotesSection: true,

  // ── Custom Fields ─────────────────────────────────────────────────────────
  // Each: { id, label, source, position }
  // source: 'profile.field_name' | 'invoice.field_name' | 'static:value'
  // position: 'seller_block' | 'buyer_block' | 'header_meta' | 'footer'
  customFields: [],
};

/**
 * Deep-merge a user config patch over the defaults.
 * Unknown keys in the patch are preserved (forward-compat).
 */
export function mergeConfig(defaults, patch) {
  if (!patch || typeof patch !== 'object') return { ...defaults };
  return { ...defaults, ...patch };
}
