import { getFinancialYear, getFYStartYear } from './taxCalc.js';

export { getFinancialYear, getFYStartYear };

// Indian tax year runs April–March, e.g. "2026-27".
export const CURRENT_FY = getFinancialYear(new Date());
export const PREVIOUS_FY = getFinancialYear(new Date(getFYStartYear(CURRENT_FY), 2, 1));
