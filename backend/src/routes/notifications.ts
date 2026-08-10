import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { z } from 'zod';

const router = Router();

const PrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  alert_days_before: z.enum(['2', '7', '14']).transform(Number).optional(),
  gst_filing_alerts: z.boolean().optional(),
  deal_followup_alerts: z.boolean().optional(),
  gmail_auto_apply: z.boolean().optional(),
  gmail_auto_apply_threshold: z.number().min(0.50).max(1.00).optional(),
});

// GET /notifications/preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', req.userId!)
    .maybeSingle();

  // Return defaults if no row exists
  res.json(data || {
    user_id: req.userId,
    email_enabled: true,
    whatsapp_enabled: false,
    alert_days_before: 14,
    gst_filing_alerts: true,
    deal_followup_alerts: true,
    gmail_auto_apply: false,
    gmail_auto_apply_threshold: 0.90,
  });
});

// PUT /notifications/preferences
router.put('/preferences', authenticate, validateBody(PrefsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', req.userId!)
    .maybeSingle();

  const updates = { ...req.body, user_id: req.userId, updated_at: new Date().toISOString() };

  if (existing) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', statusCode: 500 }); return; }
    res.json(data);
  } else {
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert(updates)
      .select()
      .single();

    if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', statusCode: 500 }); return; }
    res.json(data);
  }
});

export default router;
