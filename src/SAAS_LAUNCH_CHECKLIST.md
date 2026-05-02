# DataWinder SaaS Launch Checklist

## ✅ Completed Infrastructure

### Frontend
- [x] Landing page with SDM/biodiversity features
- [x] Pricing comparison table (Free Academic vs Pro)
- [x] Tier detection (auto-unlock Bangor @bangor.ac.uk)
- [x] Post-signup onboarding flow
- [x] Checkout page
- [x] Checkout success page
- [x] Trial warning component
- [x] Usage limit warning component
- [x] Terms of Service & Privacy Policy pages

### Backend Functions
- [x] `createStripeCheckout` - Generate Stripe session (with iframe protection)
- [x] `handleCheckoutSuccess` - Process successful payment & auto-upgrade tier
- [x] `checkTrialExpiration` - Check 14-day trial status
- [x] `checkUsageLimit` - Monitor monthly occurrence limits
- [x] `trackAnalyticsEvent` - Central analytics tracking
- [x] `stripeWebhook` - Enhanced to handle subscription events
- [x] `automateTrialExpiration` - Daily automation to notify expired trials

### Automations
- [x] Daily Trial Expiration Check (9 AM GMT) - Notifies users when trial expires

### Hooks & Utilities
- [x] `useSubscriptionStatus` - React hook to check user subscription & usage
- [x] `TrialWarning` component - Displays trial expiration notices
- [x] `UsageWarning` component - Displays usage limit warnings

---

## 🔧 Next Steps Before Launch

### 1. **Register Stripe Webhook** ⭐ CRITICAL
```
1. Go to Stripe Dashboard > Webhooks
2. Create new endpoint with URL: https://datawinder.app/functions/stripeWebhook
3. Select events to listen:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
   - invoice.paid
4. Copy webhook secret and set as STRIPE_WEBHOOK_SECRET environment variable
5. Test webhook with Stripe CLI: stripe listen --forward-to localhost:8080/functions/stripeWebhook
```

### 2. **Publish the App**
```
1. Go to Base44 Dashboard > Publish
2. Set custom domain: datawinder.app
3. Enable SSL certificate
4. Verify DNS A record points to published IP
```

### 3. **Verify Stripe Integration**
```
1. Test checkout with card 4242 4242 4242 4242
2. Verify webhook fires and user tier upgrades to 'pro'
3. Check success page redirects to dashboard
4. Verify analytics events are tracked
```

### 4. **Test Trial & Usage Limits**
```
# Trial Logic
1. Create test user with non-Bangor email
2. Wait for 14 days (or manually test checkTrialExpiration)
3. Verify expiration warning appears
4. Verify automation sends email

# Usage Limits
1. Create test user on Free tier
2. Import 1000+ occurrences
3. Verify usage warning at 80% + blocks new imports at 100%
```

### 5. **Update User Entity Schema** (if not done)
Add these fields to User entity for subscription tracking:
```json
{
  "subscription_tier": {
    "type": "string",
    "enum": ["free", "starter", "pro", "enterprise"],
    "default": "free"
  },
  "subscription_status": {
    "type": "string",
    "enum": ["active", "cancelled", "suspended"],
    "default": "active"
  },
  "stripe_customer_id": { "type": "string" },
  "subscription_started_at": { "type": "string", "format": "date-time" },
  "trial_expired_notified": { "type": "boolean", "default": false }
}
```

### 6. **Email Integration**
- [ ] Set up email domain authentication (SPF, DKIM)
- [ ] Create email templates for:
  - Trial expiration reminder
  - Payment receipt (Stripe handles this automatically)
  - Welcome email for new Pro users

### 7. **Analytics Dashboard**
Monitor these events:
- `signup_completed` - New user registrations
- `tier_assigned` - User tier detection (Free/Pro)
- `checkout_started` - Checkout initiations
- `checkout_initiated` - User clicked "Upgrade"
- `payment_success` - Successful upgrades
- `payment_failed` - Failed payments
- `subscription_cancelled` - Cancelled subscriptions
- `trial_expired` - Trial expirations

### 8. **Support & Communication**
- [ ] Set up support email (support@datawinder.app)
- [ ] Create FAQ entry for "How do I upgrade?"
- [ ] Add upgrade prompts in limited-access features (SDM, climate scenarios, API)
- [ ] Create in-app messaging for trial warnings

### 9. **Compliance & Legal**
- [ ] Review Terms of Service (mentions free tier limitations, Pro features, cancellation)
- [ ] Review Privacy Policy (mentions Stripe payment processing)
- [ ] Add "Cancel Subscription" link in account settings
- [ ] Ensure GDPR compliance for EU users

### 10. **Go Live Checklist**
- [ ] Test full signup → onboarding → checkout → dashboard flow
- [ ] Verify all warning components appear at right times
- [ ] Load test with 100+ concurrent users
- [ ] Monitor error rates and performance
- [ ] Have support team ready for launch day

---

## 📊 Pricing Structure

| Feature | Free Academic | Starter | Pro | Enterprise |
|---------|--------------|---------|-----|------------|
| Price | £0/mo | £39/mo | £99/mo | Custom |
| Availability | @bangor.ac.uk only | Public | Public | Contact |
| Projects | 5 | 10 | Unlimited | Unlimited |
| Occurrences/mo | 1,000 | 10,000 | Unlimited | Unlimited |
| SDM Models | MaxEnt | MaxEnt | MaxEnt + Ensemble | All + Custom |
| Climate Scenarios | — | Current | 4 futures | Custom |
| API Access | — | — | Read/Write | Full |
| Support | Community | Standard | Priority | Dedicated |

---

## 🚀 Launch Day Tasks

1. **9:00 AM** - Deploy to production
2. **9:15 AM** - Test full checkout flow live
3. **10:00 AM** - Announce on landing page
4. **Ongoing** - Monitor webhook logs, payment success rate, error rates

---

## 📞 Support Contacts

- **Technical Issues**: support@datawinder.app
- **Stripe Support**: https://support.stripe.com
- **Bangor University**: Use student email for auto-unlock verification

---

## 🔐 Stripe Keys (Already Set)

✅ `STRIPE_SECRET_KEY` - Set in environment
✅ `STRIPE_PUBLISHABLE_KEY` - Set in environment
⏳ `STRIPE_WEBHOOK_SECRET` - Set after webhook registration

## 🔔 Active Automations

- **Trial Expiration Check** (ID: 69f63707acc2a1d9539450c2)
  - Runs daily at 9:00 AM GMT
  - Sends emails to users whose 14-day trial has expired
  - Marks `trial_expired_notified` field

---

**Status**: 🟡 Ready for final testing and Stripe webhook setup
**Next Milestone**: Production launch after webhook configuration