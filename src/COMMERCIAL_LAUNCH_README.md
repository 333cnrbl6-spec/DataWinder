# DataWinder — Commercial Launch Summary

## What's Live

### Free Academic Tier (Bangor University)
- **Eligibility**: @bangor.ac.uk email
- **Cost**: £0
- **Duration**: Permanent
- **Access**: All features included
- **Activation**: Automatic on signup

### Trial Tier (General Users)
- **Eligibility**: All other email addresses
- **Cost**: £0
- **Duration**: 14 days from signup
- **Access**: Full Pro features for trial period
- **Expiration**: Automatic email sent day 13, access revoked on day 15

### Pro Tier (Paid Subscription)
- **Cost**: £99/month or £990/year (2 months free)
- **Duration**: Until cancellation
- **Features**: Unlimited projects, advanced SDM, priority support, API access
- **Activation**: Immediate after Stripe payment

## Technical Implementation

### Database Fields
Each user has:
- `subscription_tier` — 'free' | 'trial' | 'pro'
- `subscription_status` — 'active' | 'expired'
- `trial_expires_at` — ISO timestamp (trial users only)
- `subscription_started_at` — ISO timestamp (pro users only)
- `stripe_customer_id` — Stripe customer ID (after first payment)
- `stripe_session_id` — Last successful session ID

### User Flow
```
Sign up with email
    ↓
[detectUserTier function]
    ↓
Bangor? → tier='free' → Dashboard (no trial banner)
Non-Bangor? → tier='trial' → Dashboard (shows countdown)
    ↓
[User sees trial countdown] → "Upgrade" button
    ↓
[Checkout page] → Stripe payment
    ↓
[Webhook: checkout.session.completed] → handleCheckoutSuccess
    ↓
[User updated] → tier='pro' → Dashboard (no limitations)
```

### Automation: Trial Expiration
Daily job (`automateTrialExpiration`) runs at 09:00 UTC:
- Finds all trial users with trial_expires_at <= today
- Sends reminder email to trial users expiring in 1 day
- Revokes access for expired trial users
- Logs all actions

## Support & Troubleshooting

### User Can't Sign Up
1. Check email format (must be valid)
2. Check if user already exists
3. Verify browser allows cookies

### Bangor User Sees Trial Banner
- User email doesn't match @bangor.ac.uk exactly
- Suggest they re-sign up with correct Bangor email

### Trial Countdown Wrong
- Check `trial_expires_at` field in user record
- Use `backfillTrialDates` admin function to fix

### Payment Failed
- Check Stripe logs in Dashboard > Integrations > Stripe
- Ensure live mode is enabled (not test mode)
- Verify webhook secret is configured

---

**Go live**: Tuesday, May 7th, 2026 🚀