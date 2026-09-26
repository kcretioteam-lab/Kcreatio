import { getFYStartYear } from './taxCalc.js';

// The Income-tax Act 2025 applies from 1 April 2026: "financial year" became "tax year"
// and the old TDS sections (194J, 194C, 194R…) were merged into Section 393.
// Records for FY 2025-26 and earlier keep old-law labels.
const NEW_ACT_FROM = 2026;

export function isNewAct(fy) {
  return getFYStartYear(fy) >= NEW_ACT_FROM;
}

export function taxYearLabel(fy) {
  return isNewAct(fy) ? `Tax year ${fy}` : `FY ${fy}`;
}

export function tdsSectionLabel(oldSection, fy) {
  if (fy && !isNewAct(fy)) return `Sec ${oldSection}`;
  return `Sec 393 (formerly ${oldSection})`;
}
