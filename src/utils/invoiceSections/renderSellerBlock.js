/**
 * renderSellerBlock.js
 * Renders the business info section: logo + name + address + tax IDs.
 * Logo position is controlled by config.logoPosition.
 */
import { renderCustomFields } from './renderCustomFields';

function renderLogo(ctx) {
  const { config, logoUri, company } = ctx;

  if (!config.showLogo || !logoUri) {
    return `<div class="company-name">${company}</div>`;
  }

  const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flex = alignMap[config.logoPosition] || 'center';

  return `
    <div style="display:flex;justify-content:${flex};margin-bottom:8px;">
      <img src="${logoUri}"
           style="max-height:${config.logoMaxHeight || 55}px;max-width:220px;object-fit:contain;"
           onerror="this.style.display='none';document.getElementById('txt-logo').style.display='block';" />
      <div id="txt-logo" style="display:none;font-size:28px;font-weight:800;letter-spacing:-0.05em;">${company}</div>
    </div>`;
}

export function renderSellerBlock(ctx) {
  const { config, company, fullAddress, phone, email, gstin, panNo, profile } = ctx;

  const logoHtml    = renderLogo(ctx);
  const addressHtml = config.showSellerAddress && fullAddress
    ? `<p class="company-detail">${fullAddress}</p>` : '';
  const contactHtml = (config.showSellerPhone && phone) || (config.showSellerEmail && email)
    ? `<p class="company-detail">${[
        config.showSellerPhone && phone ? `📞 ${phone}` : '',
        config.showSellerEmail && email ? `✉ ${email}` : ''
      ].filter(Boolean).join(' · ')}</p>`
    : '';
  const stateHtml = config.showSellerState && profile?.state
    ? `<p class="company-detail">State: ${profile.state}</p>` : '';

  const taxParts = [
    config.showGstin && gstin ? `GSTIN: ${gstin}` : '',
    config.showPan   && panNo ? `PAN: ${panNo}`   : '',
  ].filter(Boolean);
  const taxHtml = taxParts.length
    ? `<p class="company-tax">${taxParts.join(' | ')}</p>` : '';

  const customHtml = renderCustomFields(ctx, 'seller_block');

  return `
    <div class="business-info">
      ${logoHtml}
      ${addressHtml}
      ${contactHtml}
      ${stateHtml}
      ${taxHtml}
      ${customHtml}
    </div>`;
}
