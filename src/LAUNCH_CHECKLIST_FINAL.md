# DataWinder Commercial Launch Checklist — Tuesday, May 7th

## ✅ CODE READY
- [x] Trial tier detection (Bangor = free, others = trial)
- [x] Trial expiration dates auto-set on signup (14 days)
- [x] Subscription tier updated on successful payment
- [x] Checkout security hardened (iframe checks, user ID in metadata)
- [x] All backend functions tested and working
- [x] Free tier limits enforced (checkUsageLimit)
- [x] Backfill migration ready for existing users

## 📋 CONFIGURATION NEEDED BEFORE PUBLISH
- [ ] **APP_URL Secret** — Set to your published app URL
  - Example: `https://datawinder.base44.app`
  - Needed for: automateTrialExpiration email notifications

- [ ] **Stripe Live Mode**
  - [ ] Go to Dashboard > Integrations > Stripe
  - [ ] Replace test keys with LIVE keys
  - [ ] Update `STRIPE_SECRET_KEY` secret
  - [ ] Update `STRIPE_PUBLISHABLE_KEY` secret

- [ ] **Stripe Products Created** (in live account)
  - [ ] **Pro Monthly** — £99/month (add to createStripeCheckout.js if IDs change)
  - [ ] **Pro Annual** — £990/year (2 months free)
  - [ ] Copy price IDs into functions/createStripeCheckout.js lines 19-20

## 🚀 PUBLISH PROCESS
1. Ensure APP_URL and Stripe live keys are configured
2. Click "Publish" in Base44 dashboard
3. Confirm app is live at published URL
4. Test signup flow (free tier + trial tier)
5. Run backfill migration: `POST /api/functions/backfillTrialDates`

## 🧪 SMOKE TESTS (POST-PUBLISH)
```bash
# Test 1: Bangor user signup
Email: user@bangor.ac.uk
Expected: tier = 'free' (no expiration)
Expected: Redirects to dashboard immediately

# Test 2: Trial user signup
Email: user@gmail.com
Expected: tier = 'trial' (trial_expires_at set to 14 days from now)
Expected: Shows trial countdown banner

# Test 3: Trial to Pro upgrade
Action: Click "Upgrade" button
Expected: Redirected to Stripe checkout
Payment: 4242 4242 4242 4242 (test card)
Expected: Success page, user.subscription_tier = 'pro'

# Test 4: Trial expiration
Wait 14 days OR manually set trial_expires_at to yesterday
Expected: automateTrialExpiration sends email
Expected: User redirected to upgrade on login
```

## 🔒 SECURITY CHECKLIST
- [x] Checkout only works from published app (not preview)
- [x] User ID in Stripe metadata (not just email)
- [x] Webhook signature validation enabled
- [x] Admin-only functions protected (backfillTrialDates)
- [x] Trial dates immutable (set on signup, not user-editable)

## 📊 MONITORING (POST-LAUNCH)
- Monitor `detectUserTier` logs for proper tier assignment
- Monitor `createStripeCheckout` for checkout initiation rate
- Monitor `handleCheckoutSuccess` webhook completions
- Track trial expiration emails via `automateTrialExpiration` logs
- Check Analytics dashboard for conversion metrics

## 🎯 SUCCESS CRITERIA
- ✅ 0 checkout failures in first 48 hours
- ✅ Bangor users see "Free Academic" (no trial banner)
- ✅ Non-Bangor users see "14-day trial" countdown
- ✅ Upgrade conversions flow to Stripe without errors
- ✅ All payment confirmations reach users

---

**Status**: Ready for Tuesday launch pending APP_URL + Stripe live config ✨