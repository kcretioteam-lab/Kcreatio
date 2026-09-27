import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendAdvanceTaxReminder } from '../services/emailService.js';
import { scanInbox } from '../services/gmailService.js';
import { hasFeature } from '../config/plans.js';
import { startInvoiceJobs } from './invoiceJobs.js';
import { applyDetection } from '../services/detectionService.js';
import { getFinancialYear } from '../services/invoiceService.js';

// ── Advance Tax Reminder Cron ─────────────────────────────────────────────────
// Runs daily at 9:00 AM — checks if any instalment is due in X days per user pref.
// Basic plan: Q4 (March 15) only. Starter+: all four quarters.
export function startAdvanceTaxReminderJob() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running advance tax reminder check');
    try {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, alert_days_before, email_enabled')
        .eq('email_enabled', true);

      if (!prefs?.length) return;

      // Start year of the current tax year (Apr–Mar), not the calendar year.
      const FY = parseInt(getFinancialYear(new Date()).split('-')[0], 10);
      const instalments = [
        { quarter: 'Q1', date: new Date(FY, 5, 15) },      // Jun 15
        { quarter: 'Q2', date: new Date(FY, 8, 15) },      // Sep 15
        { quarter: 'Q3', date: new Date(FY, 11, 15) },     // Dec 15
        { quarter: 'Q4', date: new Date(FY + 1, 2, 15) },  // Mar 15 next year
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const pref of prefs) {
        const daysAhead = pref.alert_days_before || 14;

        const { data: user } = await supabase
          .from('users')
          .select('name, email, plan')
          .eq('id', pref.user_id)
          .maybeSingle();

        if (!user) continue;

        for (const inst of instalments) {
          // Basic plan: only Q4 reminder (March 15) — single retention nudge
          if (!hasFeature('full_calendar', user.plan) && inst.quarter !== 'Q4') continue;

          const daysUntil = Math.ceil((inst.date.getTime() - today.getTime()) / 86400000);
          if (daysUntil !== daysAhead && daysUntil !== 2) continue;

          const { data: estimate } = await supabase
            .from('tax_payments')
            .select('amount_due')
            .eq('user_id', pref.user_id)
            .eq('quarter', inst.quarter)
            .eq('type', 'advance_tax')
            .eq('financial_year', getFinancialYear(new Date()))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          await sendAdvanceTaxReminder(user.email, {
            creatorName: user.name,
            quarter: inst.quarter,
            amount: estimate ? `₹${Number(estimate.amount_due).toLocaleString('en-IN')}` : 'Check app',
            dueDate: inst.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            daysLeft: daysUntil,
          });
        }
      }
    } catch (err) {
      console.error('[CRON] Advance tax reminder error:', err);
    }
  });
}

// ── Invoice Auto-Overdue Job ──────────────────────────────────────────────────
// Runs daily at 9:05 AM — flips sent invoices to overdue when due_date has passed.
export function startInvoiceOverdueJob() {
  cron.schedule('5 9 * * *', async () => {
    console.log('[CRON] Running invoice overdue check');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .in('status', ['sent', 'partially_paid'])
        .lt('due_date', today)
        .not('due_date', 'is', null);

      if (error) console.error('[CRON] Invoice overdue update error:', error);
    } catch (err) {
      console.error('[CRON] Invoice overdue job error:', err);
    }
  });
}

// ── Gmail Smart Inbox Scan Job ────────────────────────────────────────────────
// Runs every 6 hours — scans connected Gmail for all 5 detection types.
// Replaces the old payment-only scan. Creates email_detections rows.
export function startGmailScanJob() {
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Running Gmail Smart Inbox scan');
    try {
      const { data: users } = await supabase
        .from('users')
        .select(`
          id, plan, gmail_access_token, gmail_refresh_token, gmail_last_scan_at,
          notification_preferences (
            gmail_auto_apply,
            gmail_auto_apply_threshold
          )
        `)
        .not('gmail_connected_at', 'is', null)
        .eq('gmail_auto_detect', true);

      if (!users?.length) return;

      for (const user of users) {
        if (!hasFeature('gmail_scan', user.plan)) continue;

        try {
          const sinceDate = user.gmail_last_scan_at ? new Date(user.gmail_last_scan_at) : undefined;
          const results = await scanInbox(user.gmail_access_token!, user.gmail_refresh_token, sinceDate);

          const prefs = (user as any).notification_preferences?.[0];
          const autoApply: boolean = prefs?.gmail_auto_apply ?? false;
          const threshold: number = prefs?.gmail_auto_apply_threshold ?? 0.90;

          for (const result of results) {
            const row = {
              user_id: user.id,
              gmail_message_id: result.gmailMessageId,
              source: 'gmail',
              detected_type: result.type,
              confidence: result.confidence,
              raw_subject: result.rawSubject,
              raw_sender: result.rawSender,
              raw_sender_email: result.rawSenderEmail,
              raw_snippet: result.rawSnippet,
              email_received_at: result.emailReceivedAt,
              extracted_data: { ...result.extracted, reasons: result.reasons },
              status: 'pending_review',
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('email_detections')
              .insert(row)
              .select('id')
              .single();

            // Unique index conflict = already processed — skip silently
            if (insertErr || !inserted) continue;

            // Auto-apply: Pro users who opted in, high confidence, not soft inquiry
            if (
              autoApply &&
              result.confidence >= threshold &&
              result.type !== 'deal_inquiry' &&
              hasFeature('gmail_auto_apply', user.plan)
            ) {
              await applyDetection(inserted.id, user.id, result.type, result.extracted, 'auto_applied')
                .catch(err => console.error('[AUTO_APPLY] Failed — left for review:', inserted.id, err));
            }
          }

          await supabase
            .from('users')
            .update({ gmail_last_scan_at: new Date().toISOString() })
            .eq('id', user.id);

        } catch (userErr) {
          console.error(`[CRON] Gmail scan failed for user ${user.id}:`, userErr);
        }
      }
    } catch (err) {
      console.error('[CRON] Gmail scan job error:', err);
    }
  });
}

export function startAllJobs() {
  startAdvanceTaxReminderJob();
  startInvoiceOverdueJob();
  startGmailScanJob();
  startInvoiceJobs();
  console.log('[JOBS] Advance tax, invoice overdue, payment reminder, recurring invoice and Gmail scan jobs started');
}
