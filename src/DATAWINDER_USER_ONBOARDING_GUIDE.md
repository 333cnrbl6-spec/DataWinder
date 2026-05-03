# DataWinder User Onboarding Guide
## Complete Walkthrough for Conservation Researchers

Welcome to DataWinder — the unified platform for species distribution modeling, biodiversity data integration, and conservation analysis. This guide walks you through setup, data management, modeling, and reporting.

---

## 1. Sign Up & Account Setup

### Create Your Account
1. Visit the DataWinder landing page and click **"Start 14-Day Trial"** or **"Sign Up"**
2. Enter your email and create a password
3. Verify your email address

### Check Your Subscription Tier

After sign-up, you'll be auto-assigned based on your email domain:

#### **Free Academic Tier** (Bangor University: @bangor.ac.uk)
- **Cost**: £0 forever
- **Includes**: 
  - Up to 5 active projects
  - 1,000 occurrences/month
  - MaxEnt SDM modeling
  - Multi-source data integration (IUCN, GBIF, iNaturalist, SpeciesLink)
  - AI-powered data validation and quality checks
  - Photo upload and processing
  - Email support
  - Team of up to 5 members
  - Current climate projections only

#### **Pro Tier** (All other email addresses: 14-day free trial)
- **Cost**: £99/month (or £990/year, save 17%)
- **14-day trial includes everything below at no cost**
- **After trial, requires subscription:**
  - Unlimited projects
  - Unlimited occurrence records
  - MaxEnt + Ensemble SDM methods
  - Climate scenario projections (4 futures: current, RCP 2.6, 4.5, 8.5)
  - AI species identification from photos
  - Comprehensive data quality audits
  - Advanced report generation (PDF + CSV export)
  - Unlimited team members
  - Priority email support (24-hour response)
  - Full REST API access (read/write)
  - Custom third-party integrations
  - Complete version history and rollback

**Trial Details**:
- 14-day countdown starts automatically upon sign-up
- Dashboard shows days remaining
- Email reminders: 3 days, 1 day, and at expiration
- No credit card required during trial
- After day 14, upgrade to Pro or features lock

---

## 2. Your Dashboard (ResearcherDashboard)

### What You'll See on First Login

- **Recent Projects**: Your active conservation projects
- **Species Summary**: Overview of species in your workspace
- **Data Health**: Quality metrics for your occurrence data
- **SDM Runs**: Status of any running models
- **Quick Actions**: New project, import data, run model
- **Trial Countdown** (Pro trial users): Days remaining banner

### Navigation Guide

The left sidebar organizes all features by category:

**Primary**
- Dashboard: Your home view
- Projects: Manage all your conservation projects
- Species Search: Query and explore species

**Data Management**
- SmartImport: Ingest from IUCN, GBIF, iNaturalist, SpeciesLink, or upload files
- FieldPhotoProcessor: Upload field photos for AI species identification
- DataValidation: Run quality checks on your occurrence data
- VersionHistory: View all changes to your records
- GeographicOutlierCorrection: Review and correct flagged outliers

**Modeling & Analysis**
- SDMPipeline: Run species distribution models
- ModelPerformance: View model metrics and comparisons
- ThreatAssessment: Evaluate conservation threat levels
- BiodiversityDataComparison: Compare datasets across sources

**Exploration & Reporting**
- SpeciesExplorerHub: Browse species details
- BiodiversityDashboard: Visual overview of your data
- SpeciesIdentificationLab: AI identification interface
- SpeciesReportGenerator: Create publication-ready reports
- AnalyticsDashboard: Advanced statistical views

**Advanced Tools**
- ExportDashboard: Download data and reports
- GISLayerManager: Manage boundary and overlay layers
- SDMComparisonViewer: Compare multiple SDM runs
- ClimateImpactViewer: View climate scenario overlays
- NotificationDashboard: View alerts and updates

---

## 3. Create Your First Project

### What is a Project?

A **project** is your workspace for a specific research question. It contains:
- Species you're studying
- Occurrence records (observations)
- SDM runs and results
- Team members who can collaborate
- Boundaries and GIS layers
- Reports and exports

### Launch a New Project

1. Go to **Dashboard** → Click **"New Project"** or navigate to **Projects**
2. Enter:
   - **Project Name**: e.g., "Callithrix Distribution 2026"
   - **Description**: Your research objective and scope
   - **Status**: "Active" (or "Planning"/"On Hold")
   - **Start Date**: Today
3. Click **Create**
4. You're now in your project workspace

---

## 4. Import Species Data

### Available Data Sources

DataWinder integrates with the world's largest biodiversity databases:

| Source | Coverage | Records | Notes |
|--------|----------|---------|-------|
| **GBIF** | Global | 2+ billion | Museum, herbarium, citizen science |
| **IUCN Red List** | Global | 150,000+ species | Conservation status, range maps, assessments |
| **iNaturalist** | Global | 150+ million | Community observations, expert-verified |
| **SpeciesLink** | South America focus | 30+ million | Herbaria, museums, biodiversity networks |
| **Your own CSV/Excel** | Custom | Your data | Field surveys, local monitoring |
| **GeoJSON/Shapefiles** | Custom | Your boundaries | Geographic boundaries and habitat zones |

### Import Step-by-Step

#### Option A: Search & Auto-Fetch (Easiest)

1. Go to **Data Management** → **SmartImport**
2. Enter a species name (scientific or common)
3. Select sources: IUCN, GBIF, iNaturalist, all, or custom
4. Click **Search** — DataWinder fetches all available records
5. Review the preview:
   - **Duplicates** (auto-highlighted for review)
   - **Total records** fetched
   - **Geographic coverage** map
6. Click **Confirm Import**
7. DataWinder automatically:
   - Deduplicates records
   - Validates taxonomy
   - Flags outliers and suspicious dates
   - Scores overall data quality
   - Stores in your project

#### Option B: Upload a File

1. Go to **SmartImport** → **Upload File**
2. Choose CSV, Excel, GeoJSON, Shapefile, or KML
3. Map columns:
   - Required: `species_name`, `latitude`, `longitude`
   - Optional: `observation_date`, `observer_name`, `notes`, `source`
4. DataWinder auto-validates and imports
5. Review quality report and confirm

#### Option C: Bulk Ingest

1. Go to **SmartImport** → **Bulk Import**
2. Upload CSV with multiple species
3. DataWinder processes in background
4. Notifications when complete

### After Import: Review Quality Report

Once imported, you'll see:
- ✅ **Green records**: High-confidence, clean data
- ⚠️ **Yellow flags**: Review before modeling (outliers, old dates, etc.)
- ❌ **Red records**: Consider excluding (obvious errors, impossible locations)

You can manually correct or auto-fix flagged records.

---

## 5. Validate & Improve Data Quality

### Why Data Quality Matters

Good SDM models depend on clean occurrence data. Garbage in = garbage out.

DataWinder's AI automatically detects:
- **Duplicate records**: Same species, location, date (often from multiple databases)
- **Taxonomic mismatches**: Species name doesn't match authoritative sources
- **Geographic outliers**: Records far from known range (e.g., species in impossible habitat)
- **Temporal anomalies**: Observation dates that are implausible (future dates, extinct species in recent records)
- **Coordinate precision issues**: Coarse grid-cell data, suspiciously round lat/lon pairs

### Run a Data Quality Audit

1. Go to **Data Management** → **DataValidation** (or **DataQualityAudit**)
2. Select:
   - **Species**: Choose which species to check
   - **Check Type**: Quick (duplicates only) or Comprehensive (all checks)
3. Click **Run Quality Check**
4. Sit back—DataWinder scans all your occurrence data
5. Review the report:
   - **Quality Score**: 0–100 (higher is better)
   - **Issues Found**: Counts by type
   - **Flagged Records**: List with explanations and suggestions
6. Actions:
   - **Auto-Correct**: Let DataWinder fix obvious errors (recommended)
   - **Manual Review**: Click flagged record to edit or delete
   - **Accept As-Is**: Proceed with modeling despite flags

### Data Quality Best Practices

✅ **DO**:
- Use IUCN/GBIF as primary sources
- Add field observations to improve local accuracy
- Keep records from the last 50 years unless context justifies older data
- Check for obvious spelling errors in species names before importing

❌ **DON'T**:
- Use records older than 20 years without context (distributions have shifted)
- Trust models with <30 clean occurrence points (too few data)
- Ignore red-flag records without reviewing them
- Model species with only 10–20 occurrences (high uncertainty)

---

## 6. Run Your First Species Distribution Model (SDM)

### What is an SDM?

A **Species Distribution Model** predicts suitable habitat for a species by analyzing:
- **Observed occurrences**: Where the species was found
- **Environmental variables**: Climate, elevation, vegetation type, soil, etc.
- **Machine learning**: Maxent algorithm (and ensemble methods for Pro users)

The result is a **suitability map** showing where the species is likely to occur (0 = unsuitable, 100 = highly suitable).

### Launch a Model

1. Go to **Modeling & Analysis** → **SDMPipeline**
2. Configure your model:
   - **Run Name**: e.g., "Callithrix maxent v1"
   - **Select Species**: Choose 1 or more species
   - **Model Type**: 
     - **MaxEnt** (Free/Academic): Standard, proven algorithm
     - **Ensemble** (Pro only): Compare multiple methods for robustness
   - **Bioclimatic Variables**: 
     - Auto-selected (recommended)
     - Or manually choose from 19 WorldClim variables
   - **Climate Scenario** (Pro only):
     - Current climate
     - RCP 2.6 (optimistic future)
     - RCP 4.5 (moderate future)
     - RCP 8.5 (pessimistic future)
3. Click **Run SDM Pipeline**
4. Watch the progress:
   - **Queued**: Waiting for compute resources
   - **Cleaning**: Removing outliers, spatial thinning
   - **Thinning**: Filtering to reduce geographic bias
   - **Fetching Climate**: Downloading bioclimatic data
   - **Modeling**: Training the machine learning model
   - **Completed**: Ready to view results

### View Your Results (Takes 5–30 minutes depending on model)

Once complete, you'll see:

**Suitability Map**
- Red areas = highly suitable habitat
- Yellow = moderately suitable
- Blue = unsuitable
- Occurrence points overlaid (blue = training, green = test)

**Model Performance Metrics**
- **AUC** (0–1): Discrimination ability. >0.8 is good, >0.9 is excellent
- **TSS** (True Skill Statistic, 0–1): Performance measure. >0.6 is strong
- **Sensitivity**: % of test occurrences correctly predicted
- **Specificity**: % of background correctly rejected
- **Omission Rate**: % of test occurrences that fell outside prediction

**Response Curves**
- For each environmental variable
- Shows how suitability changes with the variable (e.g., more suitable in cooler temps)
- Helps interpret the model's "niche"

**Variable Importance**
- Ranked list showing which environmental factors matter most
- e.g., "Temperature in warmest month" > "Annual precipitation" > "Elevation"

---

## 7. Interpret Your Model Results

### Key Metrics Explained

| Metric | Range | Interpretation |
|--------|-------|-----------------|
| **AUC** | 0.5–1.0 | 0.5 = random, 0.7 = acceptable, 0.8+ = good, 0.9+ = excellent |
| **TSS** | 0–1 | 0.4+ = acceptable, 0.6+ = strong, 0.8+ = excellent |
| **Omission Rate** | 0–100% | % of test points outside prediction. Lower is better (<20% is typical) |
| **N occurrences** | Any | Training size. 30+ is decent, 100+ is strong, 1000+ is excellent |

### Map Interpretation

**Red areas** on the map don't always mean "100% certain" — they show **relative suitability**. Context matters:

- **Known range**: Suitability should match observed distribution (good validation)
- **Predicted new areas**: May indicate suitable but unsampled habitat (field survey opportunity)
- **Map edges**: Trust predictions less near boundaries (models extrapolate poorly)
- **Multiple models**: Compare MaxEnt + Ensemble results if Pro user

### What's Next?

- ✅ **Good model** (AUC >0.8, TSS >0.5): Use for conservation planning
- ⚠️ **Moderate model** (AUC 0.7–0.8): OK, but consider adding more occurrence data
- ❌ **Poor model** (AUC <0.7): Re-check data quality, try different variables

### Climate Scenario Comparison (Pro)

If you ran multiple climate futures:
1. Go to **Exploration & Reporting** → **ClimateImpactViewer**
2. Overlay current vs. future suitability maps
3. Identify:
   - **Climate refugia**: Areas suitable in all scenarios (conservation priority)
   - **Range shifts**: Where species will move as climate changes
   - **Habitat loss**: Suitable areas that become unsuitable

---

## 8. Generate Reports

### Publication-Ready Outputs

DataWinder creates comprehensive reports suitable for peer-reviewed journals:

1. Go to **Exploration & Reporting** → **SpeciesReportGenerator**
2. Configure:
   - **Report Type**:
     - **Species Profile**: Summary, photos, IUCN status, references
     - **SDM Results**: Model maps, metrics, interpretation, implications
     - **Threat Assessment**: Conservation status, threats, recommendations
     - **Multi-Species Comparison**: Overview of 2+ species side-by-side
   - **Species**: Choose which species to include
   - **Include**: Select sections (maps, metrics, photos, bibliography)
   - **Format**: PDF (for print/publication) or CSV (for data)
3. Click **Generate**
4. Download as PDF or CSV

### What's Included in Reports

**Executive Summary**
- Key findings and recommendations

**Species Information**
- Scientific and common names
- IUCN Red List status
- Known geographic range (from IUCN)
- Population trend

**SDM Results**
- Suitability map (publication-quality)
- Current + future climate scenarios
- Model performance metrics with interpretation

**Conservation Implications**
- Suitable habitat extent
- Key environmental factors
- Climate change impacts
- Recommended conservation actions

**Bibliography**
- All data sources cited (IUCN, GBIF, iNaturalist, your field data)
- References for interpretation

---

## 9. Team Collaboration

### Add Team Members

1. Go to **Account Settings** (gear icon, top right)
2. Click **Team Members** → **Invite**
3. Enter their email address
4. Choose role:
   - **Viewer**: Read-only access to all projects
   - **Editor**: Can upload, edit, run models, generate reports
5. Click **Send Invite**
6. They'll receive an email with a link to join

### Team Limits

- **Free Academic**: Up to 5 team members
- **Pro**: Unlimited team members

### Working Together

**Shared Projects**
- Any team member can upload data, run models, add comments
- Real-time notifications when collaborators make changes

**Workspace Comments**
- Click on any project/model/map to leave comments
- Mention colleagues with @email to notify them
- Version tracking shows who changed what and when

**Permissions**
- Editors can't delete projects (safety feature)
- Viewers can't change data, but can download and report

---

## 10. Upgrade from Trial to Pro (Day 14)

### What Happens at Day 14

- Your trial period ends
- Pro features become unavailable (MaxEnt still works, but Ensemble is locked)
- You'll see an **Upgrade Prompt** banner on your dashboard
- Email reminders sent: 3 days before, 1 day before, on expiration day

### How to Upgrade

1. Click the **Upgrade to Pro** button (or go to **Pricing**)
2. Choose billing cycle:
   - **Monthly**: £99/month (£1,188/year)
   - **Annual**: £990/year (save £198, equivalent to 2 months free)
3. Click **Proceed to Checkout**
4. Enter payment details via Stripe (secure, PCI-compliant)
5. Access restored immediately upon payment
6. Confirmation email with receipt and billing information

### Canceling (Anytime)

1. Go to **Account Settings** → **Billing**
2. Click **Cancel Subscription**
3. You'll retain access through the end of your paid billing period
4. After cancellation, you'll drop to Free Academic (if @bangor.ac.uk) or trial expires

---

## 11. Pro-Only Features Explained

### Ensemble SDM Methods

**MaxEnt** (included free):
- Proven, widely-used algorithm
- Good for small datasets (30+ occurrences)
- Faster to run

**Ensemble Methods** (Pro only):
- Combine multiple algorithms (MaxEnt, Random Forest, Generalized Additive Model)
- More robust—reduces overfitting
- Recommended for >100 occurrences
- Takes longer, but more reliable

### Climate Scenario Projections

**Current Climate Only** (Free Academic):
- Model based on today's climate
- Shows where species occurs now

**4 Climate Futures** (Pro):
- Current (2020s) + 3 IPCC scenarios:
  - **RCP 2.6**: Optimistic (warming limited to ~1.5°C)
  - **RCP 4.5**: Moderate (warming ~2.4°C by 2100)
  - **RCP 8.5**: Pessimistic (warming ~4.3°C by 2100)
- Compare suitable habitat under each scenario
- Identify climate refugia and range shifts

### Photo AI Identification

**Free Academic**:
- Upload field photos to occurrences (documentation)
- Manual species confirmation required

**Pro**:
- AI automatically identifies species from photos
- Validates species name against GBIF/IUCN
- Creates new occurrence records if species confirmed
- Extraction of EXIF GPS data from photos

### Advanced Report Generation

**Free Academic**:
- Simple PDF with map and basic metrics

**Pro**:
- Choose from 10+ report templates
- Multi-species comparison reports
- Custom sections and layout
- Export to CSV for further analysis
- Publication-ready formatting

### API Access

**Free Academic**: None

**Pro**: Full REST API
- Query your projects, species, models, and results
- Programmatic report generation
- Integrate DataWinder with your own tools
- Webhooks for automation

---

## 12. Tips & Best Practices

### Data Import
✅ Start with IUCN for range maps and conservation status  
✅ Add GBIF/iNaturalist observations for detailed occurrence data  
✅ Include your own field data to improve local accuracy  
✅ Remove obvious errors (wrong coordinates, future dates) before importing  
❌ Don't use only one source (GBIF-only bias, IUCN-only rough)  
❌ Don't import records >50 years old without good reason (distributions shift)

### Data Quality
✅ Run a quality check before modeling  
✅ Review auto-flagged records (they're usually right)  
✅ Keep good notes on corrections you make  
❌ Don't blindly trust automatic corrections  
❌ Don't model with <30 occurrences (too much uncertainty)

### Modeling
✅ Use 50–500+ occurrence points for reliable models  
✅ Review flagged outliers before running (they can skew results)  
✅ Start with MaxEnt; compare with Ensemble if Pro  
✅ Check AUC/TSS metrics (if <0.7, your data may be biased)  
✅ Interpret response curves to understand the species' niche  
❌ Don't trust models with AUC <0.6 (no better than random)  
❌ Don't over-interpret suitability at map edges  
❌ Don't use climate projections as long-term forecasts (too much uncertainty)

### Reporting
✅ Always cite data sources (IUCN, GBIF, iNaturalist, SpeciesLink)  
✅ Note sample size and data quality scores  
✅ Include model performance metrics (AUC, TSS)  
✅ Discuss assumptions and limitations  
❌ Don't claim species will "definitely" occur in red-predicted areas  
❌ Don't generalize beyond your study region  
❌ Don't ignore contradictions between data sources

### Team Collaboration
✅ Add colleagues as Editors for faster feedback  
✅ Leave workspace comments to document decisions  
✅ Use version history to track major milestones  
❌ Don't share passwords (invite team members instead)  
❌ Don't delete old models (keep for comparison)

---

## 13. Getting Help

### Self-Service Resources
- **FAQ Bot**: Go to Community Hub → FAQ Bot (AI chatbot)
- **User Guides**: Hover over any feature for inline help
- **Tooltips**: Blue (?) icons throughout the app
- **Status Page**: Check platform health at status.datawinder.app

### Contact Support
- **Email**: support@datawinder.app
- **Response Time**:
  - Free Academic: 48–72 hours (community-based)
  - Pro: 24 hours (priority)
- **Include in emails**: Screenshot, species name, what you were doing, error message

### Report Bugs
- Use the **Feedback** button in your dashboard
- Include: Browser type, steps to reproduce, error message
- Screenshots help us resolve issues faster

### Community Forum
- Go to **Community Hub** to:
  - Read discussion posts from other researchers
  - Ask questions and share experiences
  - See solutions from the DataWinder team

---

## 14. Troubleshooting Common Issues

### "I can't import a species"
1. Check species name spelling (try scientific name)
2. Try a different data source (GBIF, iNaturalist, IUCN)
3. If still stuck, email support@datawinder.app with the species name

### "My model is taking a long time"
- Models typically finish in 5–30 minutes
- Complex models (large datasets, ensemble methods) can take 1+ hour
- Check **SDMPipeline** page for status updates
- Close the page—modeling continues in background

### "The data quality check found too many flags"
1. Review flagged records (most flags are valid)
2. Use **Auto-Correct** for obvious fixes (wrong coords, duplicates)
3. Manually delete obvious errors
4. If many flagged, the data source might be biased (try another source)

### "My trial countdown is wrong"
- Check **Account Settings** for your trial_expires_at date
- Email support if it's incorrect (rare bug)

### "I can't log in"
1. Check email spelling
2. Reset password (click "Forgot Password")
3. Check spam folder for confirmation emails
4. If locked out, email support@datawinder.app

---

## 15. Next Steps to Get Started

**Day 1:**
1. ✅ Sign up and verify email
2. ✅ View your dashboard and browse features
3. ✅ Create your first project

**Day 2:**
1. ✅ Search for a species you're interested in
2. ✅ Import occurrence data (IUCN/GBIF)
3. ✅ Review quality report

**Day 3–5:**
1. ✅ Run a test MaxEnt model
2. ✅ View suitability map and metrics
3. ✅ Generate a simple report

**Week 2:**
1. ✅ Invite a team member
2. ✅ Compare multiple models
3. ✅ Explore climate scenarios (Pro)

**Week 3–14:**
1. ✅ Refine your data and models
2. ✅ Generate publication-ready reports
3. ✅ Decide to upgrade or continue as Free Academic

---

## Questions?

**Welcome to the DataWinder community!** We're here to help you do better conservation science.

- 📧 Email: support@datawinder.app
- 💬 Chat: FAQ Bot (Community Hub)
- 📚 Docs: Inline help throughout the app
- 🐛 Bugs: Use Feedback button in dashboard

**Last updated: May 2026**