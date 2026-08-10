export type Plan = 'basic' | 'trial' | 'starter' | 'pro' | 'business';

// trial = 2 (same level as pro) — 28-day full Pro access, as per product spec
export const PLAN_HIERARCHY: Record<Plan, number> = {
  basic:    0,
  starter:  1,
  trial:    2,
  pro:      2,
  business: 3,
};

// null = unlimited
export const PLAN_LIMITS: Record<Plan, {
  invoices_monthly: number | null;
  tds_entries: number | null;
  bank_accounts: number;
  upi_ids: number;
  tc_profiles: number;
  free_templates: string[] | null; // null = all templates allowed
}> = {
  basic:    { invoices_monthly: 5,    tds_entries: 10,   bank_accounts: 1, upi_ids: 1, tc_profiles: 1, free_templates: ['classic', 'modern', 'compact'] },
  trial:    { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, free_templates: null },
  starter:  { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, free_templates: null },
  pro:      { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, free_templates: null },
  business: { invoices_monthly: null, tds_entries: null, bank_accounts: 5, upi_ids: 5, tc_profiles: 5, free_templates: null },
};

// Feature gates — which plan is required minimum
export const FEATURE_REQUIREMENTS: Record<string, Plan> = {
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

export function hasFeature(feature: string, plan: Plan): boolean {
  const required = FEATURE_REQUIREMENTS[feature] as Plan | undefined;
  if (!required) return true;
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[required];
}

export function getLimit<K extends keyof (typeof PLAN_LIMITS)[Plan]>(
  feature: K,
  plan: Plan,
): (typeof PLAN_LIMITS)[Plan][K] {
  return PLAN_LIMITS[plan][feature];
}
