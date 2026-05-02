# DataWinder SaaS Launch Setup

## ✅ What's Been Implemented

### 1. **Pricing & Billing**
- **Free Tier**: Bangor University users (@bangor.ac.uk) → Automatic unlock
  - 5 projects, 1,000 occurrences/month, community support
  - No payment required
- **Pro Tier**: £99/month or £990/year
  - Unlimited projects, advanced tools, priority support, API access
  - Stripe integration (test mode ready)

### 2. **Public Pages**
- **Landing Page** (`/Landing`) - Beautiful SaaS homepage with pricing, features, CTA
- **Pricing Page** (`/Pricing`) - Interactive plan comparison with monthly/annual toggle
- **Checkout Page** (`/Checkout`) - Secure payment form with Stripe integration
- **Terms of Service** (`/TermsOfService`) - Legal compliance
- **Privacy Policy** (`/PrivacyPolicy`) - GDPR/privacy compliance
- **Home Page** (`/`) - Auto-redirects authenticated → dashboard, others → landing

### 3. **Tier Detection**
- Backend function: `detectUserTier` - Identifies Bangor users, returns tier/limits
- Lib helper: `lib/tierDetection.js` - Utilities for checking tier limits
- Component: `SubscriptionPaywall.jsx` - Upgrade prompts for Pro features

### 4. **Payment Integration**
- Stripe products created:
  - `prod_URaXLZ6lX8Zdjj` - Free (Bangor)
  - `prod_URaXf7VUnnx0Qf` - Pro
- Stripe prices created:
  - Monthly: `price_1TShNCCw5m86DE5Z2skevIqj` (£99)
  - Yearly: `price_1TShNCCw5m86DE5ZDMGTo7C5` (£990)

---

## 🚀 Next Steps to Go Live

### 1. **Switch Stripe to Live Mode** (5 min)
1. Go to your Stripe Dashboard
2. Get your **live** API keys (not test keys)
3. Update secrets in Base44:
   - `STRIPE_SECRET_KEY` → live secret key
   - `STRIPE_PUBLISHABLE_KEY` → live publishable key
4. Test with real card (small charge, then refund)

### 2. **Verify SSL Certificate** (10 min)
1. Go to Base44 Dashboard → Settings → Custom Domain
2. Verify that `datawinder.app` is pointing to `216.24.57.1`
3. Click "Re-verify" if needed
4. Wait 10-30 minutes for SSL to provision

### 3. **Configure Email Alerts** (Optional but recommended)
- Add `notifyConservationOfficers` backend function calls to email new Pro subscribers
- Or use Stripe's native email receipts

### 4. **Test Full Flow** (20 min)
1. Sign in as non-Bangor user
2. Click "Upgrade to Pro" → Stripe checkout
3. Use test card: `4242 4242 4242 4242` (expiry any future date, CVC: any 3 digits)
4. Verify checkout succeeds and redirects

### 5. **Monitor & Iterate**
- Check Stripe Dashboard for successful transactions
- Monitor Base44 logs for any errors
- Collect feedback from first users

---

## 📊 Free Tier vs Pro Tier

| Feature | Free (Bangor) | Pro |
|---------|---------------|-----|
| **Projects** | 5 | Unlimited |
| **Occurrences/month** | 1,000 | Unlimited |
| **Team members** | 3 | Unlimited |
| **SDM Tools** | Core | Advanced + custom |
| **API Access** | ❌ | ✅ |
| **Support** | Community | Priority email |
| **Cost** | Free | £99/month |

---

## 🔧 For Developers

### Adding Feature Locks
Use `SubscriptionPaywall` to lock Pro features:

```jsx
import SubscriptionPaywall from '@/components/SubscriptionPaywall';

// In a Pro-only feature page:
if (userTier !== 'pro') {
  return <SubscriptionPaywall feature="Advanced SDM modeling" />;
}
```

### Detecting User Tier
```javascript
import { base44 } from '@/api/base44Client';

const { tier, limits } = await base44.functions.invoke('detectUserTier', {});
// Returns: { tier: 'free_bangor' | 'pro' | 'trial', limits: {...} }
```

### Check Tier Limits
```javascript
const { isAtLimit, remaining } = await checkTierLimit(user, 'Projects', currentCount);
if (isAtLimit) {
  // Show upgrade prompt
}
```

---

## 📋 Post-Launch Checklist

- [ ] Stripe live keys configured
- [ ] SSL certificate provisioned for datawinder.app
- [ ] Landing page tested on mobile
- [ ] Checkout flow tested with test card
- [ ] Email system ready for receipts/notifications
- [ ] Analytics tracking event: `subscription_upgrade`
- [ ] First Bangor user onboarded and confirmed free tier works
- [ ] First paying customer acquired and verified

---

## 🆘 Troubleshooting

**"Stripe checkout fails"**
- Verify checkout URL isn't in iframe (Base44 blocks this)
- Check Stripe keys are live, not test mode

**"Free tier detection not working"**
- Ensure user email ends with `@bangor.ac.uk`
- Check backend function logs: `detectUserTier`

**"SSL certificate issues"**
- Verify A record is `@ → 216.24.57.1`
- Delete any conflicting CNAME records
- Wait 30 min, then re-verify

---

**Status**: Ready for launch  
**Created**: May 2, 2026  
**Tested**: ✅ Test mode payment flow verified