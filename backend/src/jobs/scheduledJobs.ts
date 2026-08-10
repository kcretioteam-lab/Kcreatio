import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendAdvanceTaxReminder } from '../services/emailService.js';
import { scanInbox } from '../services/gmailService.js';
import { hasFeature } from '../config/plans.js';

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

      const FY = new Date().getFullYear();
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
        .eq('status', 'sent')
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
              await applyDetectionBackground(inserted.id, user.id, result.type, result.extracted);
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

// Lightweight auto-apply runner used by the background cron job.
// Mirrors the logic in emailDetections.ts but inlined here to avoid circular imports.
async function applyDetectionBackground(
  detectionId: string,
  userId: string,
  detectedType: string,
  data: Record<string, any>,
) {
  const now = new Date().toISOString();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const fy = today.getMonth() >= 3
    ? `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(-2)}`
    : `${today.getFullYear() - 1}-${String(today.getFullYear()).slice(-2)}`;
  const qtr = [0,1,2].includes(today.getMonth()) ? 'Q4' :
              [3,4,5].includes(today.getMonth()) ? 'Q1' :
              [6,7,8].includes(today.getMonth()) ? 'Q2' : 'Q3';

  const updates: Record<string, any> = { status: 'auto_applied', reviewed_at: now };

  try {
    if (detectedType === 'payment_received' && data.amount) {
      const paise = Math.round(data.amount * 100);
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .gte('total_amount', paise - paise * 0.01)
        .lte('total_amount', paise + paise * 0.01)
        .limit(1);

      if (invoices?.[0]) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoices[0].id);
        updates.linked_invoice_id = invoices[0].id;
      }

      const { data: income } = await supabase.from('income').insert({
        user_id: userId,
        source: 'brand_deal',
        amount: data.amount,
        description: data.brand_name ?? 'Payment auto-detected via Smart Inbox',
        income_date: todayStr,
        financial_year: fy,
        quarter: qtr,
        extracted_data: { detection_id: detectionId },
      }).select('id').single();

      if (income) updates.linked_income_id = income.id;

    } else if (detectedType === 'tds_deduction' && data.amount) {
      const tdsAmount = data.tds_rate ? data.amount * (data.tds_rate / 100) : data.amount * 0.10;

      const { data: tds } = await supabase.from('tds_records').insert({
        user_id: userId,
        brand_name: data.brand_name ?? 'Unknown Brand',
        brand_tan: data.tan ?? null,
        invoice_amount: data.amount,
        tds_rate: data.tds_rate ?? 10,
        tds_amount: tdsAmount,
        received_amount: data.amount - tdsAmount,
        form_16a_status: 'awaiting',
        financial_year: fy,
        payment_date: todayStr,
        extracted_data: { detection_id: detectionId },
      }).select('id').single();

      if (tds) updates.linked_tds_id = tds.id;

    } else if (detectedType === 'expense' && data.amount) {
      await supabase.from('expenses').insert({
        user_id: userId,
        category: 'subscription',
        amount: data.amount,
        description: data.description ?? 'Auto-detected via Smart Inbox',
        expense_date: todayStr,
        financial_year: fy,
        extracted_data: { detection_id: detectionId },
      });
    }

    await supabase.from('email_detections').update(updates).eq('id', detectionId);

  } catch (err) {
    console.error('[AUTO_APPLY] Error applying detection:', detectionId, err);
  }
}

export function startAllJobs() {
  startAdvanceTaxReminderJob();
  startInvoiceOverdueJob();
  startGmailScanJob();
  console.log('[JOBS] Advance tax, invoice overdue, and Gmail scan jobs started');
}
