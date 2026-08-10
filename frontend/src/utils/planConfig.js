// Frontend mirror of backend/src/config/plans.ts — keep in sync manually.
// This is the single source of truth for all plan logic on the frontend.
// Never hardcode plan names or limits directly in page/component files.

export const PLAN_HIERARCHY = { free: 0, starter: 1, trial: 2, pro: 2, business: 3 };

// null = unlimited
export const PLAN_LIMITS = {
  basic:     { invoices_monthly: 5,    tds_entries: 10,   bank_accounts: 1, upi_ids: 1, tc_profiles: 1, templates: ['classic', 'modern', 'compact'] },
  trial:    { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, templates: null },
  starter:  { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, templates: null },
  pro:      { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, templates: null },
  business: { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, templates: null },
};

// Which plan is required to access each feature
export const FEATURE_REQUIREMENTS = {
  advance_tax_calculator: 'pro',
  income_dashboard:       'pro',
  ca_export:              'pro',
  expense_tracker:        'starter',
  full_calendar:          'starter',
  // Smart Inbox / Automation features
  gmail_scan:             'starter',
  smart_inbox:            'starter',
  bank_csv_import:        'starter',
  gmail_auto_apply:       'pro',
  adsense_sync:           'pro',
  whatsapp_alerts:        'pro',
};

export const PLAN_DISPLAY = {
  basic:    { name: 'Basic',     price: 0,    annualPrice: 0 },
  trial:    { name: 'Trial',    price: 0,    annualPrice: 0 },
  starter:  { name: 'Starter',  price: 299,  annualPrice: 249 },
  pro:      { name: 'Pro',      price: 599,  annualPrice: 499 },
  business: { name: 'Business', price: 1499, annualPrice: 1249 },
};

export function canAccess(feature, plan) {
  const required = FEATURE_REQUIREMENTS[feature];
  if (!required) return true;
  const userLevel = PLAN_HIERARCHY[plan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[required] ?? 99;
  return userLevel >= requiredLevel;
}

export function getLimit(limitKey, plan) {
  return PLAN_LIMITS[plan]?.[limitKey] ?? null;
}

export function isAtLimit(limitKey, plan, used) {
  const limit = getLimit(limitKey, plan);
  if (limit === null) return false; // unlimited
  return used >= limit;
}

export function getRemainingUsage(limitKey, plan, used) {
  const limit = getLimit(limitKey, plan);
  if (limit === null) return null; // unlimited
  return Math.max(0, limit - used);
}

export function getRequiredPlan(feature) {
  return FEATURE_REQUIREMENTS[feature] || null;
}

export function isTemplateLocked(templateId, plan) {
  const allowed = PLAN_LIMITS[plan]?.templates;
  if (allowed === null) return false; // all allowed
  return !allowed?.includes(templateId);
}
