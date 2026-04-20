/**
 * invoicePdf.js  (refactored — config-driven template system)
 * ─────────────────────────────────────────────────────────────────────────────
 * Public API is UNCHANGED:
 *   buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments })
 *   shareInvoiceAsPdf({ ... })
 *   previewInvoiceAsPdf({ ... })
 *   printInvoice({ ... })
 *   numberToWords(num)
 *
 * Internally the monolith is now split into:
 *   invoiceConfigDefaults.js → DEFAULT_INVOICE_CONFIG + mergeConfig()
 *   invoiceTemplates.js      → TEMPLATES preset definitions
 *   invoiceSections/         → 8 composable HTML-string renderers
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { DEFAULT_INVOICE_CONFIG, mergeConfig } from './invoiceConfigDefaults';
import { getTemplate } from './invoiceTemplates';
import { buildStyles }          from './invoiceSections/buildStyles';
import { renderHeader }         from './invoiceSections/renderHeader';
import { renderSellerBlock }    from './invoiceSections/renderSellerBlock';
import { renderBillPayGrid }    from './invoiceSections/renderBillPayGrid';
import { renderItemsTable }     from './invoiceSections/renderItemsTable';
import { renderTotals }         from './invoiceSections/renderTotals';
import { renderSignature }      from './invoiceSections/renderSignature';
import { renderDeclaration }    from './invoiceSections/renderDeclaration';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (kept exactly as before — no changes)
// ─────────────────────────────────────────────────────────────────────────────

export function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
             'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ',
             'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh '  : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Only';
}

function generateUpiLink(upiId, payeeName, amount, invoiceNumber) {
  if (!upiId) return '';
  const params = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName || 'Business')}`,
    amount > 0 ? `am=${amount.toFixed(2)}` : '',
    invoiceNumber ? `tn=${encodeURIComponent(`Payment for ${invoiceNumber}`)}` : '',
    'cu=INR',
  ].filter(Boolean).join('&');
  return `upi://pay?${params}`;
}

function getQrImageUrl(data, size = 120) {
  if (!data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=4`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build render context
// ─────────────────────────────────────────────────────────────────────────────

function buildRenderContext({ invoice, lineItems, profile, documentType, payments }) {
  // ── Config ──
  let config = DEFAULT_INVOICE_CONFIG;
  try {
    const raw = profile?.invoice_config || profile?.invoiceConfig;
    if (raw) config = mergeConfig(DEFAULT_INVOICE_CONFIG, typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch (_) { /* Use defaults on parse error */ }

  // ── Profile fields ──
  const sym     = profile?.currency_symbol || '₹';
  const company = profile?.business_name || profile?.name || 'Business Name';
  const address = profile?.address || '';
  const city    = profile?.city    || '';
  const state   = profile?.state   || '';
  const zip     = profile?.zip_code || '';
  const phone   = profile?.phone   || '';
  const email   = profile?.email   || '';
  const gstin   = profile?.gstin   || '';
  const panNo   = profile?.pan_no  || '';
  const logoUri       = profile?.logo_uri       || '';
  const signatureUri  = profile?.signature_uri  || '';
  const paymentInstructions = profile?.payment_instructions || '';
  const bankDetails   = profile?.bank_details   || '';
  const upiId         = profile?.upi_id         || '';
  const upiQrUri      = profile?.upi_qr_uri     || '';

  const fullAddress = [address, city, state ? `${state} ${zip}` : zip].filter(Boolean).join(', ');

  // ── Invoice fields ──
  const isEstimate  = documentType === 'estimate';
  const invNumber   = invoice?.invoice_number  || invoice?.invoiceNumber  || 'N/A';
  const invDate     = invoice?.date            || '';
  const dueDate     = invoice?.due_date        || invoice?.dueDate        || '';
  const paymentMode = invoice?.payment_mode    || invoice?.paymentMode    || 'Cash';
  const customerName    = invoice?.customer_name  || invoice?.customerName  || 'Walk-in Customer';
  const customerAddress = invoice?.customer_address || invoice?.customerAddress || '';
  const customerPhone   = invoice?.customer_phone  || invoice?.customerPhone   || '';
  const customerEmail   = invoice?.customer_email  || invoice?.customerEmail   || '';
  const customerGstin   = invoice?.customer_gstin  || '';
  const invoiceNotes    = invoice?.notes            || '';

  // ── Tax calculations ──
  const rawSubtotal = (lineItems || []).reduce((s, i) =>
    s + (parseFloat(i.rate || 0) * parseFloat(i.quantity || i.qty || 1)), 0);
  const subtotal              = parseFloat(invoice?.subtotal || rawSubtotal || 0);
  const taxPercent            = parseFloat(invoice?.tax_percent || invoice?.taxPercent || 0);
  const taxAmount             = parseFloat(invoice?.tax_amount  || invoice?.taxAmount  || 0);
  const globalDiscountAmount  = parseFloat(invoice?.discount_amount || invoice?.discountAmount || 0);
  const globalDiscountPercent = parseFloat(invoice?.discount_percent || invoice?.discountPercent || 0);
  const total                 = parseFloat(invoice?.total || 0);

  const customerState  = invoice?.customer_state || invoice?.customerState || '';
  const isInterState   = !!(customerState && state && customerState.toLowerCase() !== state.toLowerCase());
  const halfTaxPercent = (taxPercent / 2).toFixed(1);
  const halfTaxAmount  = (taxAmount  / 2).toFixed(2);

  const totalInWords = numberToWords(Math.floor(total));

  // ── Payments ──
  const invoiceId    = invoice?.id;
  const paidPayments = (payments || []).filter(p =>
    String(p.invoiceId || p.invoice_id) === String(invoiceId) && p.type !== 'credit_note'
  );
  const amountPaid = paidPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const returnAdj  = (payments || []).filter(p =>
    String(p.invoiceId || p.invoice_id) === String(invoiceId) && p.type === 'credit_note'
  ).reduce((s, p) => s + Math.abs(parseFloat(p.amount) || 0) + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0);
  const effectiveTotal = Math.max(0, total - returnAdj);
  const balanceDue     = Math.max(0, effectiveTotal - amountPaid);

  // ── UPI QR ──
  const upiLink = generateUpiLink(upiId, company, total, invNumber);
  const qrUrl   = upiQrUri || (upiLink ? getQrImageUrl(upiLink, 100) : '');

  return {
    // Config + template
    config,
    template: getTemplate(config.template),

    // Profile
    profile, sym, company, fullAddress, address, city, state, zip,
    phone, email, gstin, panNo, logoUri, signatureUri,
    paymentInstructions, bankDetails, upiId, upiQrUri, qrUrl,

    // Invoice
    invoice, isEstimate, invNumber, invDate, dueDate, paymentMode,
    customerName, customerAddress, customerPhone, customerEmail,
    customerGstin, customerState, invoiceNotes,

    // Items
    lineItems: lineItems || [],

    // Tax
    rawSubtotal, subtotal, taxPercent, taxAmount,
    globalDiscountAmount, globalDiscountPercent, total,
    isInterState, halfTaxPercent, halfTaxAmount, totalInWords,

    // Payments
    payments, amountPaid, balanceDue, effectiveTotal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HTML builder (PUBLIC — same signature as before)
// ─────────────────────────────────────────────────────────────────────────────

export function buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments }) {
  const ctx = buildRenderContext({ invoice, lineItems, profile, documentType, payments });
  const css = buildStyles(ctx.config);

  const amountInWordsSection = ctx.config.showAmountInWords
    ? `<div class="words-section">
         <p class="words-label">Total Amount (${ctx.sym} - In Words):</p>
         <p class="words-content">${ctx.totalInWords}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${ctx.isEstimate ? 'Estimate' : 'Tax Invoice'} - ${ctx.invNumber}</title>
  <style>${css}</style>
</head>
<body>
  <div class="canvas">
    ${renderHeader(ctx)}
    ${renderSellerBlock(ctx)}
    ${renderBillPayGrid(ctx)}
    ${renderItemsTable(ctx)}
    ${renderTotals(ctx)}
    ${amountInWordsSection}
    ${renderSignature(ctx)}
    ${renderDeclaration(ctx)}
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public PDF actions (UNCHANGED public API)
// ─────────────────────────────────────────────────────────────────────────────

export async function shareInvoiceAsPdf({ invoice, lineItems, profile, documentType, payments }) {
  const html = buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments });
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice?.invoice_number || invoice?.invoiceNumber || ''}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
  return uri;
}

export async function previewInvoiceAsPdf({ invoice, lineItems, profile, documentType, payments }) {
  const html = buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments });
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri, flags: 1, type: 'application/pdf',
      });
    } catch (_) {
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    }
  } else {
    await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
  }
  return uri;
}

export async function printInvoice({ invoice, lineItems, profile, documentType, payments }) {
  const html = buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments });
  await Print.printAsync({ html });
}
