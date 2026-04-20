/**
 * renderCustomFields.js
 * Renders arbitrary user-defined key-value pairs into a given
 * layout position ('seller_block' | 'buyer_block' | 'header_meta' | 'footer').
 */

function resolveSource(source, ctx) {
  if (!source || typeof source !== 'string') return '';

  if (source.startsWith('static:')) {
    return source.slice(7);
  }
  if (source.startsWith('profile.')) {
    const key = source.slice(8);
    const val = ctx.profile?.[key] ?? ctx.profile?.[snake(key)];
    return val != null ? String(val) : '';
  }
  if (source.startsWith('invoice.')) {
    const key = source.slice(8);
    const val = ctx.invoice?.[key] ?? ctx.invoice?.[camel(key)] ?? ctx.invoice?.[snake(key)];
    return val != null ? String(val) : '';
  }
  return '';
}

// tiny helpers – no deps
function camel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function snake(s) { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }

/**
 * Returns an HTML string of custom field rows for the given position,
 * or '' if none are configured for that slot.
 */
export function renderCustomFields(ctx, position) {
  const fields = (ctx.config.customFields || [])
    .filter(f => f.position === position);

  if (!fields.length) return '';

  return fields
    .map(f => {
      const value = resolveSource(f.source, ctx);
      if (!value) return '';
      return `
        <div class="custom-field">
          <span class="custom-field-label">${f.label}:</span>
          <span class="custom-field-value">${value}</span>
        </div>`;
    })
    .join('');
}
