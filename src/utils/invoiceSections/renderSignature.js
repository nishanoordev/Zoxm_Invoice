/**
 * renderSignature.js
 * Renders the QR code (left) + Authorised Signatory block (right).
 */

export function renderSignature(ctx) {
  const { config, company, signatureUri, upiId, qrUrl } = ctx;
  if (!config.showSignature) return '';

  // ── QR Panel ──
  const qrPanel = upiId && qrUrl
    ? `<img src="${qrUrl}" alt="QR" style="width:100px;height:100px;"
           onerror="this.parentElement.innerHTML='<p style=\\'color:#cbd5e1;font-size:10px;\\'>QR unavailable</p>';" />
       <p style="font-size:8px;color:#94a3b8;margin-top:4px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Scan to Pay via UPI</p>
       <p style="font-size:10px;font-weight:700;margin-top:2px;">${upiId}</p>`
    : `<p style="color:#cbd5e1;font-size:10px;font-weight:600;">—</p>`;

  // ── Signature image or blank space ──
  const sigImgHtml = signatureUri
    ? `<img src="${signatureUri}" alt="Signature"
           style="max-height:80px;max-width:200px;object-fit:contain;margin-bottom:10px;" />`
    : `<div style="height:80px;"></div>`;

  return `
    <div class="sig-grid">
      <div class="qr-section">
        ${qrPanel}
      </div>
      <div class="sig-section">
        <p class="for-label">For: ${company.toUpperCase()}</p>
        ${sigImgHtml}
        <div class="sig-line"></div>
        <p class="sig-label">Authorised Signatory</p>
      </div>
    </div>`;
}
