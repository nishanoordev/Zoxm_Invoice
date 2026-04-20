/**
 * renderDeclaration.js
 * Renders the tax declaration + estimate disclaimer footer block.
 */
import { renderCustomFields } from './renderCustomFields';

export function renderDeclaration(ctx) {
  const { config, isEstimate } = ctx;
  if (!config.showDeclaration) return '';

  const estimateNote = isEstimate
    ? `<p style="margin-top:8px;font-size:10px;font-weight:800;color:#b45309;text-align:center;">
         This is an estimate only. It is not a tax invoice. Final pricing and availability may vary.
       </p>`
    : '';

  const footerCustom = renderCustomFields(ctx, 'footer');

  return `
    <div class="declaration">
      <p class="dec-title">Taxation Declaration</p>
      <p class="dec-text">
        Certified that the particulars given above are true and correct and the amount indicated
        represents the price actually charged and that there is no flow of additional consideration
        directly or indirectly from the buyer.
      </p>
      ${estimateNote}
      ${footerCustom}
    </div>`;
}
