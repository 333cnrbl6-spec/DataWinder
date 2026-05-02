# DataWinder Backend Functions Reference

This document describes key backend functions that power DataWinder's core features. Developers and integrations can use these functions for custom workflows.

---

## Subscription & Billing Functions

### `createStripeCheckout`

**Purpose**: Initialize a Stripe checkout session for Pro plan subscription

**Input**:
```json
{
  "priceId": "price_xxx",
  "plan": "pro"
}
```

**Output**:
```json
{
  "sessionId": "cs_xxx",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "status": "success"
}
```

**When to use**:
- User clicks "Upgrade to Pro" button
- Billing cycle selection (monthly/annual)
- Frontend redirects user to checkout URL in browser

**Errors**:
- 401: User not authenticated
- 403: User already subscribed
- 400: Invalid price ID

---

### `handleCheckoutSuccess`

**Purpose**: Process successful Stripe payment and activate Pro subscription

**Trigger**: Automatic via Stripe webhook (`checkout.session.completed`)

**Actions**:
- Verify Stripe signature
- Create/update Stripe customer record
- Update user's `subscription_tier` to "pro"
- Set `subscription_started_at` timestamp
- Send confirmation email
- Track analytics event

**Note**: This runs server-side via webhook. No frontend call needed.

---

### `automateTrialExpiration`

**Purpose**: Daily automation that manages trial lifecycle and sends reminder emails

**Trigger**: Scheduled daily at 9am UTC

**Actions**:
1. Find free users with active trials
2. Calculate remaining days
3. Send notifications:
   - **Day 13**: "You have 3 days left"
   - **Day 14**: "Last 24 hours — upgrade now"
   - **Day 15+**: "Trial expired. Upgrade to continue"
4. Update `trial_expires_at` field
5. Log events for analytics

**Email Content**:
- Trial countdown banner
- Link to /Pricing page
- Retention offer (20% discount if upgrading same day)

**Configuration**:
- Trial duration: 14 days (set in PostSignupOnboarding)
- Runs at: 09:00 UTC daily
- Emails sent: support@datawinder.app

---

### `detectUserTier`

**Purpose**: Determine a user's current subscription tier based on email and payment status

**Input**:
```json
{
  "email": "user@example.com"
}
```

**Output**:
```json
{
  "tier": "free" | "starter" | "pro" | "enterprise",
  "isBangorUser": true | false,
  "trialExpires": "2026-05-16T00:00:00Z",
  "subscriptionStatus": "active" | "expired" | "cancelled"
}
```

**Logic**:
- If email ends with `@bangor.ac.uk` → "free" (academic)
- Else if `subscription_tier = "pro"` and `subscription_status = "active"` → "pro"
- Else if `trial_expires_at > now` → "pro" (trial active)
- Else → "free" (trial expired, non-Bangor user)

---

## Data Quality & Validation Functions

### `runDataQualityCheck`

**Purpose**: Comprehensive data audit for a species or project

**Input**:
```json
{
  "species_id": "sp_xxx",
  "check_type": "comprehensive"
}
```

**Output**:
```json
{
  "total_records": 1250,
  "issues_found": 47,
  "quality_score": 87,
  "issues": [
    {
      "occurrence_id": "occ_xxx",
      "issue_type": "potential_duplicate",
      "severity": "warning",
      "message": "Similar record found 2km away, same date"
    }
  ],
  "summary": {
    "duplicates_count": 12,
    "taxonomy_issues_count": 5,
    "outliers_count": 30
  }
}
```

**Check Types**:
- `duplicate_detection`: Find redundant records
- `taxonomic_validation`: Cross-reference against GBIF taxonomy
- `coordinate_outlier`: Identify geographic anomalies
- `temporal_validation`: Flag suspicious dates
- `comprehensive`: All checks above

**Use Cases**:
- User imports new dataset
- Before running SDM model
- Compliance audit for publication

---

### `validateDataImport`

**Purpose**: Pre-import validation for CSV/GeoJSON files

**Input**:
```json
{
  "file_url": "https://...",
  "fileType": "csv"
}
```

**Output**:
```json
{
  "status": "valid" | "warnings" | "errors",
  "recordCount": 500,
  "issues": [
    {
      "row": 42,
      "field": "latitude",
      "error": "Missing or invalid coordinate"
    }
  ],
  "preview": [
    {
      "species_name": "Callithrix jacchus",
      "latitude": -15.84,
      "longitude": -48.06,
      "observation_date": "2025-03-15"
    }
  ]
}
```

---

## SDM & Modeling Functions

### `runSDMPipeline`

**Purpose**: Execute full species distribution modeling workflow

**Input**:
```json
{
  "species_ids": ["sp_001", "sp_002"],
  "modelType": "maxent",
  "parameters": {
    "outlier_handling": "remove",
    "thinning_km": 5,
    "bioclim_vars": ["bio1", "bio12"],
    "regularization": 1.0,
    "test_fraction": 0.25
  },
  "climateScenario": "current"
}
```

**Stages**:
1. **Cleaning**: Remove duplicate & outlier occurrences
2. **Thinning**: Spatial filtering (default: 5km grid)
3. **Fetch Climate**: Download bioclimatic variables from WorldClim
4. **Modeling**: Train MaxEnt algorithm
5. **Evaluation**: Calculate AUC, TSS, response curves

**Output**:
```json
{
  "run_id": "sdm_run_xxx",
  "status": "completed",
  "metrics": {
    "auc": 0.92,
    "tss": 0.76,
    "omission_rate": 0.05
  },
  "prediction_grid": [
    { "lat": -15.84, "lon": -48.06, "suitability": 0.87 }
  ],
  "runtime_seconds": 1240
}
```

**Limits**:
- Free: 1,000 occurrence records max
- Pro: Unlimited
- Typical runtime: 10–30 minutes

---

### `aggregateEnsembleScenarios`

**Purpose**: Compare multiple SDM runs and climate futures (Pro only)

**Input**:
```json
{
  "sdm_run_ids": ["sdm_xxx", "sdm_yyy"],
  "species_id": "sp_001"
}
```

**Output**:
```json
{
  "consensus_map": "suitability grid",
  "uncertainty": "standard deviation across runs",
  "refugia": "stable high-suitability areas",
  "losses": "areas losing suitability under climate change"
}
```

---

## Reporting Functions

### `generateSDMReport`

**Purpose**: Create publication-ready PDF report for SDM results

**Input**:
```json
{
  "sdm_run_id": "sdm_xxx",
  "includeMetrics": true,
  "includeResponseCurves": true,
  "format": "pdf"
}
```

**Output**:
```json
{
  "file_url": "https://datawinder.app/reports/sdm_xxx.pdf",
  "pages": 8,
  "fileSize_mb": 2.4
}
```

**Includes**:
- Executive summary
- Occurrence map with density heatmap
- Suitability prediction map
- Model performance metrics (AUC, TSS, etc.)
- Response curves (species niche along each variable)
- Feature importance ranking
- Methodology & caveats
- Bibliography

---

### `generateSpeciesReport`

**Purpose**: Comprehensive species profile with IUCN + SDM data

**Input**:
```json
{
  "species_id": "sp_001",
  "includeConservationStatus": true,
  "format": "pdf"
}
```

**Output**:
```json
{
  "file_url": "https://datawinder.app/reports/species_xxx.pdf",
  "pages": 12
}
```

---

## Data Export Functions

### `generateDataExport`

**Purpose**: Export occurrence records, SDM results, or full project data

**Input**:
```json
{
  "project_id": "proj_xxx",
  "exportType": "csv" | "geojson" | "shapefile_zip",
  "dataComponents": [
    "occurrence_records",
    "sdm_results",
    "validation_flags"
  ],
  "filters": {
    "species_ids": ["sp_001"],
    "date_from": "2020-01-01",
    "date_to": "2026-05-02"
  }
}
```

**Output**:
```json
{
  "job_id": "export_xxx",
  "status": "queued",
  "file_url": "https://datawinder.app/exports/project_xxx.zip",
  "record_count": 5240,
  "file_size_mb": 12.3
}
```

**Formats**:
- **CSV**: Tabular occurrence data with coordinates, dates, sources
- **GeoJSON**: Map-ready spatial format
- **Shapefile ZIP**: For GIS software (QGIS, ArcGIS)

---

## Team & Collaboration Functions

### `sendTeamInvite`

**Purpose**: Invite a user to a project with specified role

**Input**:
```json
{
  "project_id": "proj_xxx",
  "invitee_email": "colleague@example.com",
  "role": "editor" | "viewer",
  "message": "Optional personal message"
}
```

**Output**:
```json
{
  "invitation_id": "invite_xxx",
  "status": "sent",
  "invitee_email": "colleague@example.com"
}
```

**Triggers**:
- Invitee receives email with accept/decline link
- Accepted → User gains access to project
- Declined → No access, can re-invite

---

## Analytics & Health Functions

### `generatePlatformHealthReport`

**Purpose**: Admin function to track system health and user engagement (admin-only)

**Input**:
```json
{
  "period": "monthly"
}
```

**Output**:
```json
{
  "total_users": 1240,
  "active_users_30d": 480,
  "new_signups": 127,
  "trial_conversions": 34,
  "pro_subscribers": 156,
  "total_species": 8420,
  "total_occurrences": 2340000,
  "avg_model_runtime_seconds": 1340,
  "data_quality_score_avg": 0.82
}
```

---

## Error Handling & Best Practices

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Not authenticated | Redirect to login |
| 403 | Not authorized (tier/role) | Show upgrade prompt or access denied |
| 400 | Bad request (invalid params) | Check input, log issue |
| 429 | Rate limited | Retry after delay |
| 500 | Server error | Notify support, log error ID |

### Retry Logic

- **Transient errors (5xx, 429)**: Retry 3× with exponential backoff
- **Client errors (4xx)**: Don't retry; fix input or show error to user
- **Webhooks**: Retry up to 5× over 24 hours if function fails

---

## Function Authorization

Some functions require admin or Pro tier:

| Function | Free | Pro | Admin |
|----------|------|-----|-------|
| `createStripeCheckout` | ❌ | ✓ | ✓ |
| `runSDMPipeline` | 1k occ max | ✓ | ✓ |
| `aggregateEnsembleScenarios` | ❌ | ✓ | ✓ |
| `generateDataExport` | CSV only | ✓ | ✓ |
| `generatePlatformHealthReport` | ❌ | ❌ | ✓ |

---

## Questions?

For integration help, email: **api-support@datawinder.app**

---

*Last updated: May 2026 - Production Release*