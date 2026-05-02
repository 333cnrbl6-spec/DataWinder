# DataWinder User Onboarding Guide

## Welcome to DataWinder — Conservation Science, Simplified

This guide walks you through setting up your account, understanding your subscription tier, and launching your first species distribution model.

---

## 1. Sign Up & Account Setup

### Step 1: Create Your Account

1. Visit [Landing Page] and click **"Start Free 14-Day Trial"** or **"Start Your Trial"**
2. You'll be redirected to sign in. Create a new account with your email
3. Verify your email address

### Step 2: Check Your Subscription Tier

After sign-up, you'll land on the **Account Settings** page. Here you'll see:

#### **Free Academic Tier** (Bangor University only)
- **Eligibility**: @bangor.ac.uk email addresses
- **Cost**: £0 forever
- **Includes**: 
  - 5 projects
  - 1,000 occurrences/month
  - MaxEnt SDM modeling
  - AI-powered data validation
  - Email support
  - Team of 5 members

#### **Pro Tier** (14-day free trial)
- **Cost**: £99/month (or £990/year, save 17%)
- **Includes**:
  - Unlimited projects
  - Unlimited occurrences
  - Ensemble SDM methods
  - Climate scenario projections (4+ futures)
  - Unlimited team members
  - Priority support
  - API access
  - Custom integrations

**Trial Details**:
- Your 14-day countdown starts when you sign up
- You'll see a banner on your dashboard showing days remaining
- 3 days, 1 day, and expiration reminders via email
- No credit card needed during trial (required to continue after day 14)

---

## 2. Your Dashboard

### Main Dashboard (ResearcherDashboard)

When you first log in, you'll see:

- **Recent Projects**: Your active conservation projects
- **Species Summary**: Overview of species in your workspace
- **Data Health**: Quality metrics for your occurrences
- **Quick Actions**: New project, import data, run model

### Navigation

The left sidebar organizes everything:

- **Primary**: Dashboard, Projects, Species Search
- **Data Management**: Import, Photo Processor, Data Validation, Version History
- **Modeling & Analysis**: SDM Pipeline, Model Performance, Threat Assessment
- **Exploration**: Species Explorer, AI Identification, Reports
- **Advanced**: Conservation Tracker, Data Export, Climate Tools

---

## 3. First Steps: Create a Project

### What is a Project?

A **project** is your workspace for a specific research question. It contains:
- Species you're studying
- Occurrence records (observations)
- SDM runs and results
- Team members who can collaborate

### Create Your First Project

1. Go to **Dashboard** → Click **"New Project"**
2. Enter:
   - **Project Name**: e.g., "Callithrix jacchus Distribution"
   - **Description**: Your research objective
   - **Status**: Active
   - **Start Date**: Today
3. Click **Create**
4. You're now in your project workspace

---

## 4. Import Species Data

### Data Sources Available

DataWinder integrates species data from:

- **IUCN Red List**: Conservation status, range maps, assessment data
- **GBIF**: Millions of occurrence records from global biodiversity database
- **iNaturalist**: Community science observations with expert verification
- **SpeciesLink**: South American museum and herbarium specimens
- **Your own field data**: Manual uploads via CSV or GeoJSON

### Import Your First Species

1. Go to **Data Management** → **Smart Import**
2. Choose an import method:
   - **Search & Fetch**: Search by species name → automatically pull from IUCN/GBIF/iNaturalist
   - **Upload CSV**: Import your own occurrence data
   - **Upload GeoJSON**: Spatial boundary data
   - **Bulk Ingest**: Multiple species at once
3. Select a species or upload a file
4. Review the preview → click **Confirm Import**
5. DataWinder will automatically:
   - Detect duplicates
   - Validate taxonomy
   - Flag coordinate outliers
   - Score data quality

---

## 5. Data Quality & Validation

### Why Data Quality Matters

Good SDM results depend on clean data. DataWinder automates quality checks:

- **Duplicate Detection**: Identifies redundant records (same location, date, species)
- **Taxonomic Validation**: Checks against authoritative sources
- **Coordinate Outliers**: Flags impossible or geographically distant occurrences
- **Temporal Validation**: Identifies records with suspicious dates

### Run a Data Quality Check

1. Go to **Data Management** → **Data Validation**
2. Select a species or project
3. Click **Run Quality Check**
4. Review flagged records:
   - **Green** (valid): High-confidence records
   - **Yellow** (caution): Review before modeling
   - **Red** (error): Consider excluding
5. Manually review or auto-correct flagged records

---

## 6. Run Your First SDM Model

### What is an SDM?

A **Species Distribution Model** predicts suitable habitat for a species based on:
- Observed occurrence locations
- Environmental variables (climate, elevation, vegetation)
- Machine learning algorithms (MaxEnt)

### Launch Your Model

1. Go to **Modeling & Analysis** → **SDM Pipeline**
2. Select:
   - **Species**: Choose 1 or more species
   - **Model Type**: MaxEnt (default) or Ensemble (Pro only)
   - **Climate Data**: Current climate or future scenarios (Pro only)
3. Click **Run Model**
4. Status will show:
   - **Queued**: Waiting to start
   - **Cleaning**: Removing outliers
   - **Thinning**: Spatially filtering to reduce bias
   - **Modeling**: Training machine learning model
   - **Completed**: Results ready
5. View results:
   - **Suitability Map**: Geographic predictions
   - **Response Curves**: How each environmental variable affects suitability
   - **Model Metrics**: AUC, TSS, sensitivity/specificity

---

## 7. Interpreting Your Results

### Key Metrics

- **AUC** (Area Under Curve): 0.5 = random, 1.0 = perfect discrimination. >0.8 is good.
- **TSS** (True Skill Statistic): Ranges 0–1. >0.4 is acceptable, >0.6 is strong.
- **Omission Rate**: % of test occurrences outside predicted distribution.

### Maps & Visualizations

- **Suitability Map**: Darker red = more suitable habitat
- **Occurrence Points**: Blue dots = training data, green = test data
- **Response Curves**: Shape shows species' environmental niche

### What's Next?

- Compare multiple species
- Project into future climate scenarios (Pro)
- Generate conservation reports
- Share with collaborators

---

## 8. Generate Reports

### Publication-Ready Reports

DataWinder creates comprehensive conservation reports:

1. Go to **Exploration & Reporting** → **Reports**
2. Select:
   - **Report Type**: Threat Assessment, Biodiversity Summary, or Species Profile
   - **Species**: Choose 1 or more species
   - **Include**: Maps, charts, metrics, assessment data
3. Click **Generate**
4. Download as **PDF** or **CSV**

### What's Included?

- Executive summary
- Species profile (IUCN status, population trend)
- Suitability map with interpretation
- Model performance metrics
- Conservation recommendations
- Bibliography of cited sources

---

## 9. Team Collaboration

### Add Team Members

1. Go to **Account Settings** (Free: 5 members, Pro: unlimited)
2. Click **Invite Team Member**
3. Enter their email → Choose role:
   - **Viewer**: Read-only access
   - **Editor**: Full edit permissions
4. They'll receive an invite email

### Shared Projects

- Each project has a team
- Members can upload data, run models, comment on results
- Version history tracks all changes
- Real-time notifications for major updates

---

## 10. Upgrade from Trial to Paid (Day 14)

### What Happens After 14 Days?

- Your trial features lock
- You'll see an **Upgrade Prompt** on the dashboard
- Email reminders: 3 days before, 1 day before, at expiration

### How to Upgrade

1. Go to **Pricing** page
2. Click **Upgrade to Pro**
3. Choose billing: Monthly (£99) or Annual (£990, save 17%)
4. Enter payment details (Stripe checkout)
5. Access restored immediately

### Canceling at Any Time

Go to **Account Settings** → **Manage Billing** → Cancel anytime. You'll retain access through the end of your billing cycle.

---

## 11. Tips & Best Practices

### Data Import
- ✓ Use IUCN/GBIF for initial occurrence data
- ✓ Add field observations to improve local accuracy
- ✓ Remove obvious errors before modeling
- ✗ Don't use records older than 20 years without context

### Modeling
- ✓ Use 30+ occurrence points for reliable models
- ✓ Review flagged outliers carefully
- ✓ Start with MaxEnt; try ensemble for comparison (Pro)
- ✗ Don't trust models with <100 clean occurrence points

### Reporting
- ✓ Always cite data sources (IUCN, GBIF, etc.)
- ✓ Note sample size and data quality scores
- ✓ Include model performance metrics
- ✗ Don't over-interpret suitability at map edges

---

## 12. Getting Help

### Self-Service
- **FAQ Bot**: Go to Community Hub → FAQ Bot
- **User Guides**: Each feature has inline help tooltips
- **Video Tutorials**: Coming soon

### Contact Support
- **Email**: support@datawinder.app
- **Response time**: 24 hours (Pro: priority support)
- **Include**: Screenshot, species name, what you were doing

### Feedback
- Found a bug? Email support
- Feature request? Use the Feedback button in your dashboard

---

## 13. Next Steps

1. **Set up your first project** (takes 5 minutes)
2. **Import a species** you're interested in (10 minutes)
3. **Run a test model** to see the process (15 minutes)
4. **Explore your results** and read the interpretation guide

**Welcome to the DataWinder community.** We're here to help you do better conservation science.

---

*Last updated: May 2026*