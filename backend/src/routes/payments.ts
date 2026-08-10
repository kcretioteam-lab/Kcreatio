import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { razorpay } from '../lib/razorpay.js';

const router = Router();

const PLAN_TO_PLAN_ID: Record<string, string> = {
  starter: process.env.RAZORPAY_STARTER_PLAN_ID || '',
  pro: process.env.RAZORPAY_PRO_PLAN_ID || '',
  business: process.env.RAZORPAY_BUSINESS_PLAN_ID || '',
};

const CreateSubscriptionSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  period: z.enum(['monthly', 'annual']).default('monthly'),
});

// POST /payments/create-subscription
router.post('/create-subscription', authenticate, validateBody(CreateSubscriptionSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan } = req.body;
  const planId = PLAN_TO_PLAN_ID[plan];

  if (!planId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: `Razorpay plan ID for '${plan}' not configured`, statusCode: 400 });
    return;
  }

  try {
    const subscription = await (razorpay.subscriptions as any).create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
    });

    await supabase
      .from('users')
      .update({ subscription_id: subscription.id })
      .eq('id', req.userId!);

    res.json({ subscriptionId: subscription.id, status: subscription.status });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.error?.description || 'Failed to create subscription', statusCode: 500 });
  }
});

// POST /payments/webhook — Razorpay webhook (HMAC verified)
// Note: express.raw() is applied in server.ts before this route, so req.body is a Buffer
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;
  // express.raw() puts the raw Buffer in req.body
  const body = req.body as Buffer;

  if (!signature || !body || !Buffer.isBuffer(body)) {
    res.status(400).json({ error: 'Bad request' });
    return;
  }

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (signature !== expectedSig) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const event = JSON.parse(body.toString());
  const subscriptionId = event?.payload?.subscription?.entity?.id;
  const planId = event?.payload?.subscription?.entity?.plan_id;

  const planByPlanId = Object.entries(PLAN_TO_PLAN_ID).find(([, id]) => id === planId)?.[0];

  switch (event.event) {
    case 'subscription.charged':
      if (subscriptionId) {
        const endsAt = new Date();
        endsAt.setMonth(endsAt.getMonth() + 1);
        await supabase
          .from('users')
          .update({
            plan: planByPlanId || 'starter',
            subscription_ends_at: endsAt.toISOString(),
          })
          .eq('subscription_id', subscriptionId);
      }
      break;

    case 'subscription.cancelled':
      if (subscriptionId) {
        await supabase
          .from('users')
          .update({ plan: 'basic' })
          .eq('subscription_id', subscriptionId);
      }
      break;

    case 'payment.failed':
      // Log for monitoring — don't downgrade immediately (grace period)
      console.warn('Payment failed for subscription:', subscriptionId);
      break;
  }

  res.json({ status: 'ok' });
});

// GET /payments/status
router.get('/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase
    .from('users')
    .select('plan, subscription_id, subscription_ends_at, trial_ends_at')
    .eq('id', req.userId!)
    .maybeSingle();

  if (!user) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
  res.json(user);
});

// POST /payments/cancel
router.post('/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_id')
    .eq('id', req.userId!)
    .maybeSingle();

  if (!user?.subscription_id) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'No active subscription' });
    return;
  }

  try {
    await (razorpay.subscriptions as any).cancel(user.subscription_id, { cancel_at_cycle_end: 1 });
    res.json({ success: true, message: 'Subscription will cancel at end of billing period' });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.error?.description || 'Failed to cancel' });
  }
});

// POST /payments/reactivate — un-cancel a subscription that was cancelled at period end
router.post('/reactivate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_id, plan')
    .eq('id', req.userId!)
    .maybeSingle();

  if (!user?.subscription_id) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'No active subscription to reactivate' });
    return;
  }

  try {
    await (razorpay.subscriptions as any).update(user.subscription_id, { cancel_at_cycle_end: 0 });
    res.json({ success: true, message: 'Subscription reactivated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.error?.description || 'Failed to reactivate subscription' });
  }
});

// POST /payments/change-plan — change to a different paid plan.
// Strategy: cancel current subscription at cycle end + immediately create new subscription.
// User stays on current plan until billing period ends, then new plan activates.
router.post('/change-plan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan } = req.body;
  if (!plan || !['starter', 'pro', 'business'].includes(plan)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid plan. Must be starter, pro, or business.' });
    return;
  }

  const planId = PLAN_TO_PLAN_ID[plan];
  if (!planId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: `Razorpay plan ID for '${plan}' not configured` });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('subscription_id, plan')
    .eq('id', req.userId!)
    .maybeSingle();

  if (user?.plan === plan) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'You are already on this plan.' });
    return;
  }

  try {
    // Cancel existing subscription at cycle end (if any)
    if (user?.subscription_id) {
      await (razorpay.subscriptions as any).cancel(user.subscription_id, { cancel_at_cycle_end: 1 });
    }

    // Create new subscription immediately
    const newSubscription = await (razorpay.subscriptions as any).create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
    });

    await supabase
      .from('users')
      .update({ subscription_id: newSubscription.id })
      .eq('id', req.userId!);

    res.json({
      success: true,
      subscriptionId: newSubscription.id,
      message: `Plan change to ${plan} initiated. Your new plan will activate at the start of your next billing cycle.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.error?.description || 'Failed to change plan' });
  }
});

// Middleware to capture raw body for webhook HMAC verification
function express_raw_body(req: Request, res: Response, next: any) {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
}

export default router;
