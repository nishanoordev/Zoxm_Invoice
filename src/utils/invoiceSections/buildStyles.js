/**
 * buildStyles.js
 * Resolves template style tokens + user config into a complete CSS string
 * for the invoice HTML document.
 */
import { getTemplate } from '../invoiceTemplates';

function resolve(str, primary, accent) {
  if (!str) return '';
  return str
    .replace(/\{primaryColor\}/g, primary)
    .replace(/\{accentColor\}/g, accent);
}

export function buildStyles(config) {
  const primary  = config.primaryColor || '#121642';
  const accent   = config.accentColor  || '#ec5b13';
  const template = getTemplate(config.template);
  const font     = template.fontOverride || config.fontFamily || 'Helvetica, Arial, sans-serif';

  const s    = template.styles;
  const r    = (v) => resolve(v, primary, accent);
  const br   = s.borderRadius || '4px';
  const gtBg = r(s.grandTotalBg);
  const gtFg = r(s.grandTotalColor);

  const sigLine = s.signatureDotted
    ? `border-bottom: 1.5px dashed ${primary};`
    : `height: 1.5px; background-color: ${primary};`;

  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: ${font};
      background-color: white;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      color: ${primary};
    }
    .canvas {
      width: 210mm; min-height: 297mm;
      background: white; padding: 18px 28px;
      display: flex; flex-direction: column;
    }

    /* ── Header ─────────────────────────────── */
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: ${r(s.headerBorderBottom)};
      margin-bottom: 16px;
      background: ${r(s.headerBackground) || 'transparent'};
    }
    .tax-label { font-size: 32px; font-weight: 900; color: ${primary}; letter-spacing: -0.03em; margin: 0; }
    .inv-meta  { text-align: right; }
    .meta-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 2px; }
    .meta-val   { font-size: 13px; font-weight: 700; color: ${primary}; margin: 0 0 8px; }

    /* ── Seller block ────────────────────────── */
    .business-info {
      text-align: ${s.businessInfoAlign || 'center'};
      margin-bottom: 16px; padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .company-name   { font-size: 26px; font-weight: 900; color: ${primary}; margin: 0 0 6px; letter-spacing: -0.02em; }
    .company-detail { font-size: 11px; color: #64748b; line-height: 1.5; margin: 0; }
    .company-tax    { font-size: 11px; color: ${primary}; margin-top: 6px; font-weight: 700; }

    /* ── Bill-Pay grid ───────────────────────── */
    .bill-pay-grid {
      display: grid; grid-template-columns: 1.3fr 0.7fr;
      border: 1.5px solid ${primary};
      margin-bottom: 16px;
      border-radius: ${br}; overflow: hidden;
    }
    .bill-section { padding: 14px 16px; border-right: 1.5px solid ${primary}; background: ${r(s.billSectionBg) || '#fff'}; }
    .pay-section  { padding: 14px 16px; background: ${r(s.paySectionBg) || '#f8f9fc'}; }
    .sec-title    { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 10px; }
    .cust-name    { font-size: 18px; font-weight: 800; color: ${primary}; margin: 0 0 4px; }
    .cust-detail  { font-size: 11px; color: #64748b; line-height: 1.5; margin: 0; }
    .cust-gst     { font-size: 11px; font-weight: 700; color: ${primary}; margin-top: 8px; }
    .pay-item     { margin-bottom: 10px; }
    .pay-label    { font-size: 8px; font-weight: 800; color: #c0c5e0; text-transform: uppercase; margin: 0 0 2px; letter-spacing: 0.1em; }
    .pay-val      { font-size: 14px; font-weight: 700; color: ${primary}; margin: 0; }

    /* ── Items table ─────────────────────────── */
    table { width: 100%; border-collapse: collapse; border: ${r(s.tableBorder)}; margin-bottom: 0; }
    th {
      background-color: ${r(s.tableHeaderBg)};
      padding: 10px 8px; font-size: 9px; font-weight: 800;
      color: ${r(s.tableHeaderColor)};
      text-transform: uppercase; letter-spacing: 0.08em;
      border: ${r(s.tableBorder)};
    }
    td { border: ${r(s.tableBorder)}; }

    /* ── Totals grid ─────────────────────────── */
    .totals-grid {
      display: grid; grid-template-columns: 1.3fr 0.7fr;
      border-left: 1.5px solid ${primary}; border-right: 1.5px solid ${primary}; border-bottom: 1.5px solid ${primary};
    }
    .terms-section { padding: 14px 16px; border-right: 1.5px solid ${primary}; background: ${r(s.paySectionBg) || '#f8f9fc'}; }
    .calc-section  { padding: 12px 16px; font-size: 12px; }
    .calc-row      { display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b; font-weight: 500; font-size: 11px; }
    .calc-val      { color: ${primary}; font-weight: 700; }
    .grand-total-bg {
      background-color: ${gtBg};
      padding: 12px 16px;
      border-radius: ${br === '0px' ? '2px' : '6px'};
      margin-top: 8px;
      display: flex; justify-content: space-between; align-items: center;
      color: ${gtFg};
    }
    .grand-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .grand-val   { font-size: 20px; font-weight: 900; }

    /* ── Terms / Notes ───────────────────────── */
    .terms-block  { margin-bottom: 10px; }
    .terms-text   { font-size: 10px; color: #64748b; line-height: 1.7; }
    .notes-block  { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
    .notes-label  { font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 3px; }
    .notes-text   { font-size: 10px; color: #475569; margin: 0; line-height: 1.5; }

    /* ── Amount in Words ─────────────────────── */
    .words-section {
      border-left: 1.5px solid ${primary}; border-right: 1.5px solid ${primary}; border-bottom: 1.5px solid ${primary};
      padding: 12px 16px;
    }
    .words-label   { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 3px; }
    .words-content { font-size: 13px; font-weight: 700; color: ${primary}; font-style: italic; margin: 0; }

    /* ── Signature ───────────────────────────── */
    .sig-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      border-left: 1.5px solid ${primary}; border-right: 1.5px solid ${primary}; border-bottom: 1.5px solid ${primary};
    }
    .qr-section  { padding: 14px 16px; border-right: 1.5px solid ${primary}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .sig-section { padding: 14px 20px; text-align: right; }
    .for-label   { font-size: 11px; font-weight: 800; color: ${primary}; margin: 0 0 30px; }
    .sig-line    { width: 200px; ${sigLine} margin-left: auto; margin-bottom: 6px; }
    .sig-label   { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

    /* ── Declaration footer ──────────────────── */
    .declaration  { text-align: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .dec-title    { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px; }
    .dec-text     { font-size: 8px; color: #94a3b8; max-width: 500px; margin: 0 auto; line-height: 1.4; }

    /* ── Custom fields ───────────────────────── */
    .custom-field       { display: flex; gap: 6px; margin-top: 4px; }
    .custom-field-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
    .custom-field-value { font-size: 10px; font-weight: 700; color: ${primary}; }

    /* ── Print ───────────────────────────────── */
    .header, .business-info, .bill-pay-grid, table, .totals-grid, .words-section, .sig-grid { page-break-inside: avoid; }
    @media print {
      body       { background-color: white; }
      .canvas    { box-shadow: none; border: none; padding: 0mm; }
    }
  `;
}
