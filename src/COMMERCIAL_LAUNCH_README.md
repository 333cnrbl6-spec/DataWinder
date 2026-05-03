# DataWinder — Commercial Launch Summary
## May 2026 Release

---

## What's Live Now

### Free Academic Tier (Bangor University)
- **Eligibility**: @bangor.ac.uk email address
- **Cost**: £0 forever
- **Duration**: Permanent, no expiration
- **Features**:
  - Up to 5 active projects
  - 1,000 occurrence records/month
  - MaxEnt species distribution modeling
  - Multi-source data integration (IUCN, GBIF, iNaturalist, SpeciesLink)
  - AI-powered data quality validation
  - Photo upload and metadata extraction
  - Basic report generation
  - Team of up to 5 members
  - Email support
  - Current climate projections only
- **Activation**: Automatic on signup (detected via email domain)

### Trial Tier (General Users: Free 14-Day Period)
- **Eligibility**: All non-Bangor email addresses
- **Cost**: £0 (free trial)
- **Duration**: 14 days from account creation
- **Features**: Full Pro features (see below) for 14 days
- **Expiration**: Automatic at day 15
  - Features lock (MaxEnt still available, Ensemble/Climate locked)
  - Email reminders: day 12, day 13, day 14
  - Access revocation occurs automatically
- **After Trial**: User can upgrade to Pro or drop to Free Academic if eligible

### Pro Tier (Paid Subscription)
- **Cost**: 
  - Monthly: £99/month
  - Annual: £990/year (save 17%, equivalent to 2 months free)
- **Duration**: Until user cancels
- **Features**:
  - Unlimited projects
  - Unlimited occurrence records/month
  - MaxEnt + Ensemble SDM methods
  - Climate scenario projections (4 futures: current, RCP 2.6, 4.5, 8.5)
  - AI photo species identification
  - Comprehensive data quality audits
  - Advanced report generation (PDF + CSV export)
  - Unlimited team members
  - Priority email support (24-hour response SLA)
  - Full REST API access (read/write)
  - Custom third-party integrations
  - Complete version history with rollback
  - Workspace comments and collaboration
- **Activation**: Immediate upon successful Stripe payment
- **Auto-Renewal**: Monthly or annual (user configurable)
- **Cancellation**: Anytime via Account Settings → Billing

---

## Technical Implementation

### User Entity Fields

Each user gains the following metadata (written automatically, no schema changes needed):

```json
{
  "subscription_tier": "free" | "trial" | "pro",
  "subscription_status": "active" | "expired",
  "trial_expires_at": "2026-05-17T23:59:59Z",  // ISO timestamp, trial users only
  "subscription_started_at": "2026-05-03T14:22:10Z",  // ISO, Pro users only
  "stripe_customer_id": "cus_...",  // After first payment
  "stripe_session_id": "cs_...",  // Last successful checkout session
}
```

### User Flow Diagram

```
┌─────────────────────────────────────┐
│       User Signs Up with Email      │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────────────┐
        │  detectUserTier()    │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   Bangor user?          Other email?
        │                     │
        │ YES                 │ NO
        │                     │
   ┌────────┐            ┌─────────┐
   │ FREE   │            │ TRIAL   │
   └────────┘            └────┬────┘
        │                     │
        │                     ▼
        │            ┌────────────────────┐
        │            │  Trial Countdown   │
        │            │  (14 days showing) │
        │            └────────┬───────────┘
        │                     │
        │            ┌────────▼────────┐
        │            │  User clicks    │
        │            │  "Upgrade"      │
        │            └────────┬────────┘
        │                     │
        │                     ▼
        │            ┌─────────────────┐
        │            │  Stripe Checkout│
        │            └────────┬────────┘
        │                     │
        │          ┌──────────▼──────────┐
        │          │                     │
        │          ▼                     ▼
        │      SUCCESS               FAILED
        │          │                     │
        │          ▼                     ▼
        │  ┌────────────────┐   ┌─────────────┐
        │  │  Pro tier      │   │  Trial cont │
        │  │  Instant       │   │  (no charge)│
        │  └────────────────┘   └─────────────┘
        │
        └──────────────────────┐
                               ▼
                        ┌─────────────┐
                        │  Dashboard  │
                        │  (no banner)│
                        └─────────────┘
```

### Key Functions

#### `detectUserTier()` (runs on signup)
- Checks if email ends with @bangor.ac.uk
- If yes → tier='free', no expiration
- If no → tier='trial', trial_expires_at = now + 14 days
- Stores in user entity

#### `automateTrialExpiration()` (daily job, 09:00 UTC)
- Finds all users with tier='trial' and trial_expires_at <= today
- Sends **1-day warning email** to users expiring tomorrow
- Sets subscription_status='expired' for expired users
- Pro features become unavailable (except MaxEnt)
- Logs all actions for audit

#### `handleCheckoutSuccess()` (Stripe webhook)
- Triggered when checkout.session.completed
- Updates user:
  - subscription_tier='pro'
  - subscription_status='active'
  - subscription_started_at=now
  - stripe_customer_id=[customer ID]
- Logs transaction
- Sends confirmation email
- Provides billing portal link

#### Feature Gate Logic
```javascript
function canAccessProFeature(user) {
  return user.subscription_tier === 'pro' 
         || user.subscription_tier === 'free' // Bangor users
         || (user.subscription_tier === 'trial' && !isTrialExpired(user));
}
```

### Stripe Integration

**Products Created**: (Manual step—ask product team)
- Free Academic (no price needed)
- Pro Monthly (£99/month)
- Pro Annual (£990/year)

**Webhook Events Subscribed**:
- `checkout.session.completed` → handleCheckoutSuccess
- `customer.subscription.updated` → (future: handle plan changes)
- `customer.subscription.deleted` → (future: handle cancellations)
- `invoice.paid` → (future: send receipts)

**Keys Configured**:
- `STRIPE_PUBLISHABLE_KEY`: Front-end checkout
- `STRIPE_SECRET_KEY`: Backend API calls
- `STRIPE_WEBHOOK_SECRET`: Webhook validation

### Email Automation

**Free Academic Users**: None (no emails)

**Trial Users**:
- Day 0: Welcome email
- Day 12: "3 days left" reminder
- Day 13: "1 day left" reminder  
- Day 14: "Trial expired, upgrade now" email + link
- Post-upgrade: Confirmation + billing portal link

**Pro Users**:
- Day 0: Welcome + billing portal link
- Monthly/Yearly: Invoice from Stripe
- Cancellation: Confirmation email

---

## Monitoring & Operations

### Key Metrics to Track

1. **Signup Rate**: New users/day
2. **Tier Distribution**: % Free Academic, % Trial, % Pro
3. **Trial-to-Pro Conversion**: % of trial users who upgrade
4. **Churn Rate**: % of Pro subscribers who cancel/month
5. **Trial Expiration**: Users expiring, reminders sent, expirations enforced

### Dashboard Setup

Use Stripe Dashboard for:
- Revenue (MRR—monthly recurring revenue)
- Subscription events (new, upgrades, cancellations)
- Failed payments (retry logic)
- Customer list and billing history

Use Base44 Dashboard for:
- User count by tier
- Trial expiration audit log
- Feature access logs (Pro features used)
- Support tickets by tier

### Support SLA

| Tier | Response Time | Channel |
|------|---------------|---------|
| Free Academic | 48–72h | Email |
| Trial | 24h | Email |
| Pro | 24h | Email + priority queue |

---

## Troubleshooting & Support

### User Can't Sign Up
1. Check email validity (format, typos)
2. Check if email already registered (forgot password?)
3. Check browser cookies enabled
4. → Try incognito mode, different browser
5. → Email support if persists

### Bangor User Sees Trial Banner (Not Free)
1. User email doesn't exactly match @bangor.ac.uk
2. Example: @bangor.ac.uk.old, @bangor-research.ac.uk (not recognized)
3. **Solution**: Re-signup with correct Bangor email
4. → Admin can manually reassign tier if needed

### Trial Countdown Wrong
1. Check user.trial_expires_at in database
2. If incorrect:
   - Admin runs `backfillTrialDates()` function
   - Specify user email and desired expiration date
   - Recalculates countdown
3. If lost history, check Stripe audit logs

### Payment Failed
1. Check Stripe dashboard for declined payment
2. Retry logic: Stripe auto-retries 3 times
3. Common causes:
   - Card expired
   - Insufficient funds
   - Card security block (fraud check)
   - 3D Secure required
4. **Solution**: User enters new payment method → Stripe retries
5. → If persistent, email support (may need to contact bank)

### Can't Upgrade (Stuck on Checkout)
1. Check if running in iframe (some browsers block)
2. Try different browser (Chrome, Firefox, Safari)
3. Check browser console for JavaScript errors
4. → Contact support with browser type + error message

### Pro Features Still Locked After Payment
1. Check Stripe webhook logs (did webhook fire?)
2. Manually verify `handleCheckoutSuccess()` function ran
3. Check user.subscription_tier in database:
   - If still 'trial', webhook didn't fire
   - → Manually run `handleCheckoutSuccess(checkout_session_id)` with session ID from Stripe
4. Refresh page and try again

### Trial User Trying Pro Features
1. **Expected behavior**: Feature shows "Upgrade to Pro" overlay
2. User clicks → Redirected to /Pricing
3. If not working, check feature gate function above

---

## Security & Compliance

### PCI Compliance
- ✅ Stripe handles all card data (no data stored locally)
- ✅ Use Stripe.js for frontend (PCI-DSS 3.2 compliant)
- ✅ No card data in logs or email

### Data Protection
- ✅ Stripe customer ID stored (anonymous, unrelated to payment method)
- ✅ Email used for invoicing only
- ✅ Subscription data encrypted in transit (HTTPS)
- ✅ Audit log tracks all subscription changes

### Refund Policy
- ✅ Stripe's default: No automatic refunds (manual process)
- ✅ Set in Stripe dashboard or terms
- ✅ Manual refunds: Admin can issue via Stripe dashboard
- ✅ Example: User cancels on day 2, requests refund → Admin processes in Stripe

---

## Next Steps (Post-Launch)

### Week 1
- ✅ Monitor signup flow (no errors?)
- ✅ Verify trial countdown works
- ✅ Test upgrade flow with test card: 4242 4242 4242 4242
- ✅ Confirm emails sending

### Week 2–4
- ✅ Watch trial-to-pro conversion rate
- ✅ Monitor support tickets (any bugs?)
- ✅ Gather user feedback via surveys

### Month 2+
- 📊 Analyze MRR (monthly recurring revenue)
- 📊 Refine messaging based on conversion rates
- 📊 Plan enterprise tier (if demand)
- 📊 Evaluate annual subscriptions (% adoption)

---

## Contact

For billing/Stripe questions:
- **Stripe Support**: support.stripe.com
- **Product Team**: hello@datawinder.io

For DataWinder app questions:
- **User Support**: support@datawinder.app
- **Technical**: dev@datawinder.io

---

**Go-live date: May 7, 2026** 🚀

**Built for conservation. Designed for researchers. Launched for impact.**