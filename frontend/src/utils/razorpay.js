// Razorpay Checkout helper — subscription flow for Kcretio.
//
// The backend (backend/src/routes/payments.ts) is the source of truth: it creates the
// Razorpay subscription and activates the plan in the DB from the `subscription.charged`
// webhook. This helper only loads the Checkout script and opens the authorization modal
// for a subscription id the backend already returned.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Razorpay's SDK takes a plain hex, not a CSS var — keep this in sync with --accent (#E8921A).
const BRAND_COLOR = '#E8921A';

let scriptPromise = null;

function loadCheckoutScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Open the Razorpay Checkout modal for an already-created subscription.
 *
 * @param {object}   opts
 * @param {string}   opts.subscriptionId  Razorpay subscription id from the backend
 * @param {string}   opts.planName        e.g. "Pro" (display only)
 * @param {number}   opts.amount          monthly price in ₹ (display only)
 * @param {object}   opts.user            current user, for prefill
 * @param {Function} opts.onSuccess       (response) => …  after the user authorizes
 * @param {Function} opts.onDismiss       () => …          if the user closes the modal unpaid
 * @param {Function} opts.onError         (message) => …   on any failure
 */
export async function openSubscriptionCheckout({
  subscriptionId,
  planName,
  amount,
  user,
  onSuccess,
  onDismiss,
  onError,
}) {
  if (!KEY_ID) {
    onError?.('Payments are not configured yet (missing VITE_RAZORPAY_KEY_ID). Please contact support.');
    return;
  }
  if (!subscriptionId) {
    onError?.('Could not start payment — no subscription reference was returned.');
    return;
  }

  const loaded = await loadCheckoutScript();
  if (!loaded || !window.Razorpay) {
    onError?.('Could not load the payment gateway. Check your connection and try again.');
    return;
  }

  const rzp = new window.Razorpay({
    key: KEY_ID,
    subscription_id: subscriptionId,
    name: 'Kcretio',
    description: `${planName} plan — ₹${Number(amount || 0).toLocaleString('en-IN')}/month`,
    image: '/favicon.svg',
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: (user?.phone || '').replace(/\s+/g, ''),
    },
    notes: { plan: planName },
    theme: { color: BRAND_COLOR },
    handler: (response) => { onSuccess?.(response); },
    modal: {
      escape: true,
      backdropclose: false,
      ondismiss: () => { onDismiss?.(); },
    },
  });

  rzp.on('payment.failed', (resp) => {
    onError?.(resp?.error?.description || 'Payment failed. Please try another method.');
  });

  rzp.open();
}
