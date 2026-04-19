# DataWinder — Commercial Activation Guide
## SynergyFlow Board Reference Document
**Status: SEALED — Awaiting Board Directive**
**Built: April 2026**

---

## What Has Been Built (Ringfenced)

All commercial infrastructure exists in isolated files with **zero impact on current DataWinder functionality**. Everything is behind a master feature flag.

### Files Created

| File | Purpose |
|------|---------|
| `lib/commercialConfig.js` | Master config & feature flags |
| `functions/stripeSubscription.js` | Checkout + portal + subscription lookup |
| `functions/stripeWebhook.js` | Stripe webhook handler |
| `components/commercial/PricingPlans.jsx` | Pricing UI (£39/£99/£249) |
| `components/commercial/OnboardingWizard.jsx` | 3-step user onboarding |

---

## Pricing Structure (Board Approved)

| Plan | Price | Key Features |
|------|-------|-------------|
| Starter | £39/mo + VAT | 3 surveys, 50 species, 1 seat |
| Professional | £99/mo + VAT | Unlimited + AI Reports + PDF + 5 seats |
| Enterprise | £249/mo + VAT | All features + unlimited seats |

---

## Activation Checklist (When Board Directs)

### Step 1 — Create Stripe Products
1. Go to Stripe Dashboard → Products
2. Create three products: Starter, Professional, Enterprise
3. Set recurring prices in GBP (monthly)
4. Copy the **Price IDs** (format: `price_xxx`)

### Step 2 — Update commercialConfig.js
```js
// Set stripe_price_id for each plan:
starter:      { stripe_price_id: 'price_xxx' }
professional: { stripe_price_id: 'price_xxx' }
enterprise:   { stripe_price_id: 'price_xxx' }
```

### Step 3 — Register Stripe Webhook
1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `[your-app-url]/api/functions/stripeWebhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Copy the **Webhook Secret** → add to Base44 secrets as `STRIPE_WEBHOOK_SECRET`

### Step 4 — Flip the Feature Flags
In `lib/commercialConfig.js`:
```js
COMMERCIAL_MODE: true,      // ← flip this
PAYWALL_ENABLED: true,      // ← then this
ONBOARDING_ENABLED: true,   // ← and this
```

### Step 5 — Wire OnboardingWizard into Home.jsx
```jsx
import OnboardingWizard from '@/components/commercial/OnboardingWizard';
import { isFeatureEnabled } from '@/lib/commercialConfig';

// In your Home component:
const [showOnboarding, setShowOnboarding] = useState(
  isFeatureEnabled('onboarding') && !user?.onboarding_complete
);

{showOnboarding && (
  <OnboardingWizard
    onComplete={() => setShowOnboarding(false)}
    onDismiss={() => setShowOnboarding(false)}
  />
)}
```

### Step 6 — Wire PricingPlans into nav/settings
```jsx
import PricingPlans from '@/components/commercial/PricingPlans';
// Render when user clicks "Upgrade" — guarded by isFeatureEnabled('paywall')
```

---

## Key Design Decisions

- **Existing users unaffected**: `isFeatureEnabled()` returns `true` for all features when `COMMERCIAL_MODE = false`
- **No paywall gates exist yet**: Nothing blocks current DataWinder workflows
- **Stripe keys already set**: `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are configured in secrets
- **User entity fields**: On activation, users will gain `subscription_plan`, `subscription_status`, `stripe_customer_id` fields (these are written dynamically by the webhook, no schema change required)

---

## Board Notes

- DataWinder is a **SynergyFlow** product
- "Species Explorer" = board-level strategic description of DataWinder's market position
- Target: UK conservation orgs, zoological societies, Natural England, wildlife trusts, universities, environmental consultancies
- Go-live requires: Stripe products created + webhook registered + flags flipped