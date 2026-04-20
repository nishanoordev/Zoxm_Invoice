/**
 * invoiceTemplates.js
 * Style preset definitions for the three invoice templates.
 * All values that contain {primaryColor} or {accentColor} are resolved
 * at render time by buildStyles.js using the user's config.
 */

export const TEMPLATES = {

  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean layout, dark header accent, bordered grid',
    styles: {
      headerBackground:    'transparent',
      headerBorderBottom:  '3px solid {primaryColor}',
      tableHeaderBg:       '#f1f3fc',
      tableHeaderColor:    '{primaryColor}',
      tableBorder:         '1.5px solid {primaryColor}',
      grandTotalBg:        '{primaryColor}',
      grandTotalColor:     '#ffffff',
      businessInfoAlign:   'center',
      billSectionBg:       '#ffffff',
      paySectionBg:        '#f8f9fc',
      borderRadius:        '4px',
      signatureDotted:     false,
    },
    fontOverride: null,  // use config.fontFamily
  },

  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional invoice, inverted table header, serif typography',
    styles: {
      headerBackground:    '#fafafa',
      headerBorderBottom:  '4px double {primaryColor}',
      tableHeaderBg:       '{primaryColor}',
      tableHeaderColor:    '#ffffff',
      tableBorder:         '1px solid #555555',
      grandTotalBg:        '#2d3748',
      grandTotalColor:     '#ffffff',
      businessInfoAlign:   'left',
      billSectionBg:       '#f9f9f9',
      paySectionBg:        '#ffffff',
      borderRadius:        '0px',
      signatureDotted:     false,
    },
    fontOverride: 'Georgia, "Times New Roman", serif',
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'No heavy borders, whitespace-driven, modern and airy',
    styles: {
      headerBackground:    'transparent',
      headerBorderBottom:  '1px solid #e2e8f0',
      tableHeaderBg:       'transparent',
      tableHeaderColor:    '#94a3b8',
      tableBorder:         '1px solid #f1f5f9',
      grandTotalBg:        '#f8fafc',
      grandTotalColor:     '{primaryColor}',
      businessInfoAlign:   'left',
      billSectionBg:       'transparent',
      paySectionBg:        '#f8fafc',
      borderRadius:        '8px',
      signatureDotted:     true,   // dotted line instead of solid sig line
    },
    fontOverride: null,
  },
};

/** Safely get a template by id, falling back to 'modern'. */
export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.modern;
}
