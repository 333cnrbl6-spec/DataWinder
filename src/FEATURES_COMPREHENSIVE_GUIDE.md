# DataWinder — Comprehensive Feature Guide
## Everything You Can Do (May 2026)

---

## Overview

DataWinder is a unified platform for species distribution modeling (SDM), biodiversity data management, and conservation analysis. This guide documents all features available across Free Academic, Trial, and Pro tiers.

---

## Module 1: Data Integration & Management

### 1.1 Multi-Source Biodiversity Search

**What It Does**: Query 4 global biodiversity databases simultaneously from one interface.

**Databases Integrated**:
- **GBIF**: 2+ billion occurrence records from museums, herbaria, citizen science
- **IUCN Red List**: 150,000+ species, conservation status, range maps, assessments
- **iNaturalist**: 150+ million community observations, expert-verified
- **SpeciesLink**: 30+ million records from South American herbaria and museums

**How to Use**:
1. Go to **Data Management** → **SmartImport**
2. Enter species name (common or scientific)
3. Select sources (IUCN, GBIF, iNaturalist, SpeciesLink, or all)
4. Click **Search** → Platform queries all sources in parallel
5. Review results:
   - Total records fetched from each source
   - Geographic coverage map
   - Date range of observations
   - Data source breakdown (pie chart)
6. Click **Confirm Import** to add to your project

**Availability**:
- ✅ Free Academic: Read-only, 4 sources
- ✅ Trial: Full access
- ✅ Pro: Full access + custom APIs

---

### 1.2 Smart File Import

**What It Does**: Upload local occurrence data from CSV, Excel, GeoJSON, Shapefiles, or KML files. AI automatically classifies and validates the format.

**Supported Formats**:
| Format | Use Case | Notes |
|--------|----------|-------|
| **CSV** | Occurrence records, any tabular data | Most common |
| **Excel** | Multi-sheet data | Automatically detects species/occurrence rows |
| **GeoJSON** | Spatial boundaries, habitat zones | RFC 7946 compliant |
| **Shapefile** | ArcGIS boundaries | .zip containing .shp, .shx, .dbf |
| **KML** | Google Maps/Earth data | Polygon and point features |

**How to Use**:
1. Go to **SmartImport** → **Upload File**
2. Drag & drop or select file
3. Platform auto-detects format and expected entity type
4. Review column mapping:
   - **Required**: species_name, latitude, longitude
   - **Optional**: observation_date, observer_name, notes, source
5. Click **Validate**
   - Checks for format errors, missing coordinates, invalid dates
   - Previews first 10 rows
6. Click **Import** → Records added to project

**AI Features**:
- Auto-detects delimiters (comma, tab, semicolon)
- Handles messy data (extra spaces, inconsistent formatting)
- Validates coordinates (range checks, CRS detection)
- Suggests column mappings based on header names

**Availability**:
- ✅ Free Academic: CSV, Excel, GeoJSON
- ✅ Trial: All formats
- ✅ Pro: All formats + advanced validation

---

### 1.3 Photo Upload & AI Species Identification

**What It Does**: Upload field photos. Platform extracts GPS coordinates from EXIF metadata and optionally identifies species using AI (Pro only).

**Metadata Extracted**:
- **GPS**: Latitude, longitude, altitude (if available)
- **Camera**: Make, model, focal length
- **Image**: ISO, aperture, shutter speed
- **Date**: Photo timestamp (auto-mapped to observation_date)

**How to Use**:
1. Go to **Data Management** → **FieldPhotoProcessor**
2. Select an occurrence record from your project
3. Upload photo(s) (JPG, PNG, HEIC)
4. Platform extracts:
   - GPS coordinates (if present)
   - Timestamp
   - Photo metadata
5. **Pro Only**: AI identifies species from photo
   - Shows top 3 suggestions with confidence scores
   - Allows manual override if incorrect
   - Creates new occurrence record if confirmed

**AI Identification Details** (Pro):
- Uses deep learning (trained on 10M+ photos)
- Confidence score 0–100
- Can identify from poor-quality photos
- Highlights: Provides taxon-level identification (family, genus), not always species-level

**Availability**:
- ✅ Free Academic: Photo upload, manual ID only
- ✅ Trial: AI identification included
- ✅ Pro: AI identification + advanced validation

---

### 1.4 Data Quality Audit & Validation

**What It Does**: Automatically detects data quality issues in your occurrence dataset.

**Issues Detected**:
| Issue | How It Works | Confidence |
|-------|-------------|-----------|
| **Duplicates** | Same species + location + date within 1km/1 day | Very high |
| **Taxonomic Mismatches** | Species name doesn't match IUCN/GBIF authoritative list | High |
| **Geographic Outliers** | Coordinates far from known range (statistical methods) | Medium |
| **Impossible Coordinates** | Latitude >90, longitude >180, water-only species on land | Very high |
| **Temporal Anomalies** | Future dates, extinct species in recent records, implausible dates | High |
| **Coarse Precision** | Grid-cell data (1km increments), suspiciously round coordinates | Medium |

**How to Use**:
1. Go to **Data Management** → **DataValidation**
2. Select species (or all)
3. Choose audit type:
   - **Quick**: Duplicates and impossible coordinates only
   - **Comprehensive**: All checks (takes longer)
4. Click **Run Quality Check**
5. Platform scans and generates report:
   - Quality Score (0–100)
   - Issues Found (count by type)
   - Flagged Records (list with explanations)
6. Actions:
   - **Auto-Correct**: Let platform fix duplicates, coordinate errors
   - **Manual Review**: Click each flag to edit/delete
   - **Ignore**: Proceed despite flags (logged for audit)

**Quality Score Interpretation**:
- 90–100: Excellent data quality
- 75–89: Good, minor issues to address
- 60–74: Fair, consider cleaning before modeling
- <60: Poor, recommend significant cleanup

**Availability**:
- ✅ Free Academic: Basic audit (duplicates, outliers)
- ✅ Trial: Comprehensive audit
- ✅ Pro: Comprehensive + advanced filters

---

### 1.5 Version History & Audit Trails

**What It Does**: Track all changes to your records. Rollback to previous versions if needed.

**Tracked Events**:
- Record created/updated/deleted
- Data imported (batch)
- Quality flags applied/resolved
- Model runs initiated
- Team members added/permissions changed
- Project configuration changed

**How to Use**:
1. Go to **Data Management** → **VersionHistory**
2. Browse timeline:
   - Date/time of change
   - User who made change
   - Type of change (import, edit, delete)
   - Change summary
3. Click any entry to see **before/after** values
4. **Pro Only**: Click **Rollback** to restore to previous version
   - Confirmation dialog (prevents accidental rollback)
   - Creates new version entry (maintains audit trail)

**Availability**:
- ✅ Free Academic: View-only history
- ✅ Trial: View-only history
- ✅ Pro: Rollback enabled

---

## Module 2: Species Distribution Modeling (SDM)

### 2.1 Automated SDM Pipeline

**What It Does**: Run species distribution models with automatic outlier removal, parameter tuning, and result visualization.

**Algorithm**: MaxEnt (Maxent 3.4 with default settings)
- Proven, widely-used algorithm
- Good for small to medium datasets (30–10,000 points)
- Fast convergence
- Interpretable results (response curves)

**Pipeline Stages**:
1. **Queued**: Waiting for compute resources
2. **Cleaning**: Remove geographic/temporal outliers
3. **Thinning**: Spatially filter to reduce sampling bias
4. **Fetching Climate**: Download bioclimatic variables from WorldClim
5. **Modeling**: Train MaxEnt algorithm
6. **Completed**: Results ready

**Bioclimatic Variables** (19 WorldClim v2.1):
| Category | Variables |
|----------|-----------|
| **Temperature** | Mean annual, diurnal range, warmest/coldest month, etc. (11 vars) |
| **Precipitation** | Annual total, wettest/driest month, seasonality (8 vars) |

**How to Use**:
1. Go to **Modeling & Analysis** → **SDMPipeline**
2. Configure run:
   - **Name**: e.g., "Lemur catta maxent v2"
   - **Species**: Choose 1+ species
   - **Model Type**: MaxEnt (or Ensemble for Pro)
   - **Bioclimatic Variables**: Auto-selected (recommended) or manual
   - **Climate Scenario**: Current only (or 4 futures for Pro)
3. Click **Run SDM Pipeline**
4. Monitor progress (refresh page to see updates)
5. Once done, view:
   - **Suitability Map**: Interactive map with occurrence overlay
   - **Model Metrics**: AUC, TSS, omission rate, etc.
   - **Response Curves**: How each variable affects suitability
   - **Variable Importance**: Ranked list of influential variables

**Result Interpretation**:
- **Red areas** = high suitability (species likely to occur)
- **Yellow areas** = moderate suitability
- **Blue areas** = low suitability
- **Occurrence points** = where species was observed (blue=training, green=test)

**Availability**:
- ✅ Free Academic: MaxEnt only, current climate
- ✅ Trial: MaxEnt only, 4 climate futures
- ✅ Pro: MaxEnt + Ensemble, 4 climate futures

---

### 2.2 Ensemble Modeling (Pro Only)

**What It Does**: Combine multiple algorithms for more robust predictions.

**Algorithms Included**:
- MaxEnt (as above)
- Random Forest (tree-based ensemble)
- Generalized Additive Model (smooth curve fitting)

**Why Ensemble?**
- Reduces overfitting (single algorithm can be biased)
- Better generalization to unsampled areas
- Provides confidence intervals (uncertainty quantification)
- More robust to outliers and biased data

**How to Use**:
1. Same as MaxEnt above, but select **Model Type** = **Ensemble**
2. Platform runs all 3 algorithms in parallel
3. Results include:
   - **Consensus Map**: Average of all 3 algorithms
   - **Algorithm Comparison**: Side-by-side maps
   - **Uncertainty Map**: Disagreement between algorithms (high disagreement = low confidence)
4. Use consensus map for final recommendations

**Availability**:
- ✅ Pro Only

---

### 2.3 Climate Scenario Projections

**What It Does**: Model species distributions under future climate scenarios to assess climate change impacts.

**Scenarios Available**:
| Scenario | Description | Warming |
|----------|-------------|---------|
| **Current** | 2020s average | Baseline |
| **RCP 2.6** | Paris Agreement optimistic | +1.5°C by 2100 |
| **RCP 4.5** | Moderate policy action | +2.4°C by 2100 |
| **RCP 8.5** | Business as usual | +4.3°C by 2100 |

**How to Use**:
1. When running model (Pro tier), select **Climate Scenario** = one of above
2. Or run multiple scenarios separately
3. Go to **ClimateImpactViewer** to compare:
   - Overlay current vs. future suitability maps
   - Identify climate refugia (areas suitable in all scenarios)
   - Identify habitat loss (suitable now, not in future)
   - Identify range shifts (new suitable areas)
4. Download comparison report

**Example Interpretation**:
- **Green areas** (suitable now + future): Climate refugia → conservation priority
- **Red areas** (suitable now, not future): Habitat loss → species at risk
- **Blue areas** (not suitable now, suitable future): Potential range expansion

**Availability**:
- ✅ Free Academic: Current climate only
- ✅ Trial: 4 scenarios
- ✅ Pro: 4 scenarios

---

## Module 3: Analysis & Reporting

### 3.1 Performance Metrics & Interpretation

**What It Does**: Display model evaluation metrics to assess quality.

**Key Metrics**:
| Metric | Range | Interpretation |
|--------|-------|-----------------|
| **AUC** | 0.5–1.0 | Discrimination ability. 0.5=random, 0.7=ok, 0.8+=good, 0.9+=excellent |
| **TSS** | 0–1 | True Skill Statistic. 0.4+=ok, 0.6+=strong, 0.8+=excellent |
| **Sensitivity** | 0–1 | % of test occurrences correctly predicted (true positive rate) |
| **Specificity** | 0–1 | % of background correctly rejected (true negative rate) |
| **Omission Rate** | 0–100% | % of test points outside prediction (lower is better) |
| **Threshold** | 0–100 | Decision boundary for suitability (default = 10% omission) |

**How to Use**:
- View metrics automatically on model result page
- Export metrics to CSV for publication
- Compare metrics across multiple models

**Example Decision Rules**:
- AUC >0.8 + TSS >0.5 = Good model, use for planning
- AUC 0.7–0.8 + TSS 0.3–0.5 = Moderate, consider adding data
- AUC <0.7 = Poor, redo with better data or different variables

**Availability**:
- ✅ All tiers

---

### 3.2 Response Curves & Variable Importance

**What It Does**: Visualize species' environmental niche and rank influential variables.

**Response Curves** (one per bioclimatic variable):
- X-axis: Environmental variable value
- Y-axis: Species suitability
- Shows how suitability changes with that variable
- Example: "Species prefers cool areas; suitability drops in warm climates"

**Variable Importance** (ranked list):
- Which environmental factors matter most?
- Ranked by permutation importance
- Example: "Temperature (80%) > Precipitation (15%) > Elevation (5%)"

**How to Use**:
1. View response curves automatically on model page
2. Interpret shape:
   - **Peak shape** = species has narrow niche (specific habitat)
   - **Flat shape** = variable doesn't matter much
   - **Monotonic increase/decrease** = one direction preferred
3. Use to inform conservation (e.g., protect areas with optimal temperatures)

**Availability**:
- ✅ All tiers

---

### 3.3 Publication-Ready Report Generation

**What It Does**: Create comprehensive conservation reports with maps, metrics, and recommendations.

**Report Types**:
| Type | Contents | Pages |
|------|----------|-------|
| **Species Profile** | Name, IUCN status, photos, distribution range | 2–5 |
| **SDM Results** | Suitability map, metrics, response curves, interpretation | 5–8 |
| **Threat Assessment** | Conservation status, threats identified, recommendations | 8–12 |
| **Multi-Species Comparison** | Side-by-side profiles, comparative maps, summary | 10–15 |

**How to Use**:
1. Go to **Exploration & Reporting** → **SpeciesReportGenerator**
2. Select:
   - **Report Type**: Choose template
   - **Species**: Select which species to include
   - **Sections**: Toggle on/off (maps, metrics, photos, etc.)
   - **Format**: PDF (for print) or CSV (for data)
3. Click **Generate**
4. Download PDF or CSV (takes 30–60 seconds)

**What's Included**:
- Executive summary
- Species information (name, IUCN status, photos if available)
- Suitability map (high-res, publication quality)
- Model metrics (AUC, TSS, omission rate)
- Response curves (6–8 curves per species)
- Variable importance chart
- Interpretation and discussion
- Conservation recommendations
- Data sources and citations (IUCN, GBIF, iNaturalist, SpeciesLink, your field data)
- Bibliography

**Availability**:
- ✅ Free Academic: Simple PDF (map + basic metrics)
- ✅ Trial: Full reports
- ✅ Pro: Full reports + multi-species + CSV export

---

### 3.4 Interactive Data Exploration

**What It Does**: Browse and analyze your data through dashboards.

**Available Dashboards**:
- **BiodiversityDashboard**: Overview of all species, occurrence counts, data health
- **SpeciesExplorerHub**: Search and view individual species profiles
- **AnalyticsDashboard**: Advanced charts (occurrence trends, source breakdown, quality scores)

**Features**:
- Filter by date range, data source, species, location
- Export data as CSV
- Share dashboard views with team

**Availability**:
- ✅ All tiers

---

## Module 4: Mapping & GIS Tools

### 4.1 Interactive Suitability Maps

**What It Does**: View SDM results on interactive map with occurrence overlay.

**Features**:
- **Zoom/Pan**: Navigate map
- **Layer Toggle**: Show/hide suitability, occurrences, boundaries
- **Color Legend**: Suitability gradient (blue–yellow–red)
- **Download**: Export map as image (PNG, PDF)
- **Popup Info**: Click occurrences to see details

**Availability**:
- ✅ All tiers

---

### 4.2 Polygon-Based Filtering

**What It Does**: Draw custom polygons to filter species occurrences by geography.

**How to Use**:
1. Go to **GISLayerManager** or **ClimateImpactViewer**
2. Click **Draw Polygon** tool
3. Click map to define polygon vertices
4. Double-click to close polygon
5. Platform automatically:
   - Counts occurrences inside/outside
   - Calculates polygon area
   - Shows data quality within polygon
6. Click **Apply Filter** to run models only on this region

**Use Cases**:
- Focus on specific country/region
- Exclude known non-habitat areas
- Define conservation area boundaries

**Availability**:
- ✅ All tiers

---

### 4.3 Boundary/GIS Layer Management

**What It Does**: Upload and manage custom GIS boundaries (administrative boundaries, protected areas, habitat zones).

**Supported Formats**: GeoJSON, Shapefile, KML

**How to Use**:
1. Go to **GISLayerManager**
2. Click **Upload Layer**
3. Select file (GeoJSON, Shapefile, or KML)
4. Customize:
   - **Name**: Display name
   - **Color**: Line/fill color
   - **Opacity**: Transparency
5. Click **Add to Map**
6. Layer now appears on all maps in project

**Features**:
- Multiple layers (e.g., national borders, protected areas, habitat types)
- Hide/show individual layers
- Query layer data (click polygon to see properties)

**Availability**:
- ✅ All tiers

---

## Module 5: Team Collaboration & Sharing

### 5.1 Project Sharing & Role-Based Access

**What It Does**: Invite team members to projects with different permission levels.

**Roles**:
| Role | Permissions |
|------|-------------|
| **Viewer** | Read-only. Can download, comment, but not edit or run models |
| **Editor** | Full access. Can upload, edit, run models, generate reports |
| **Owner** | Admin. Can invite/remove members, delete project (usually creator only) |

**How to Use**:
1. Open project → Click **Settings** (gear icon)
2. Go to **Team** tab
3. Click **Invite Member**
4. Enter email address
5. Select role (Viewer or Editor)
6. Click **Send Invite**
7. Invitee receives email with join link

**Team Limits**:
- Free Academic: 5 members
- Trial: Unlimited
- Pro: Unlimited

**Availability**:
- ✅ All tiers

---

### 5.2 Workspace Comments & Collaboration

**What It Does**: Leave comments on projects, models, and datasets to document decisions.

**How to Use**:
1. Navigate to project/model/occurrence
2. Click **Comments** (speech bubble icon)
3. Type comment
4. Optional: Mention colleagues with @email
5. Click **Post**
6. Colleagues receive notification email
7. Real-time thread (no refresh needed)

**Use Cases**:
- "This outlier looks like a data entry error—recommend deletion"
- "Updated model parameters based on peer feedback"
- "Climate projections suggest northward range shift"

**Availability**:
- ✅ All tiers

---

## Module 6: Data Export & Integration

### 6.1 Export Dashboard

**What It Does**: Export project data in multiple formats.

**Export Formats**:
| Format | Contents | Use |
|--------|----------|-----|
| **CSV** | Occurrence records, species lists | Spreadsheet analysis, R/Python |
| **GeoJSON** | Occurrence data with coordinates | GIS software, web mapping |
| **PDF** | Reports, maps, results | Print, publication, sharing |
| **Shapefile** | Suitability grid as polygon layer | ArcGIS, QGIS |

**How to Use**:
1. Go to **Advanced Tools** → **ExportDashboard**
2. Select:
   - **What to export**: Species, occurrences, SDM results, reports
   - **Format**: CSV, GeoJSON, PDF, or Shapefile
   - **Filters** (optional): Date range, species, quality threshold
3. Click **Generate**
4. Wait for processing (PDF can take 1–5 minutes)
5. Download file

**Availability**:
- ✅ Free Academic: CSV, GeoJSON, simple PDF
- ✅ Trial: All formats
- ✅ Pro: All formats + advanced filtering

---

### 6.2 REST API Access (Pro Only)

**What It Does**: Programmatic access to your data and models for custom integration.

**Endpoints Available**:
- `GET /projects` — List all projects
- `GET /projects/{id}/species` — Species in project
- `GET /projects/{id}/occurrences` — Occurrence records
- `GET /sdm-runs/{id}` — Model results and metrics
- `POST /sdm-runs` — Trigger new model run
- `GET /reports/{id}` — Download generated report

**Authentication**: API token (available in Account Settings)

**Use Cases**:
- Integrate DataWinder with your R/Python analysis pipeline
- Automate report generation
- Stream data to external dashboards

**Availability**:
- ✅ Pro Only

---

## Module 7: Account & Subscription Management

### 7.1 Account Settings

**What It Does**: Manage profile, billing, and team access.

**Available Settings**:
- **Profile**: Name, email, avatar
- **Password**: Change password
- **API Token**: Generate for REST API access (Pro)
- **Billing**: View invoice history, update card, change billing cycle
- **Team**: Invite members, manage permissions
- **Notifications**: Email preferences
- **Delete Account**: Permanently remove account and all data

**How to Use**:
1. Click **Settings** (gear icon, top right)
2. Select tab (Profile, Billing, Team, etc.)
3. Make changes
4. Click **Save**

**Availability**:
- ✅ All tiers

---

### 7.2 Subscription Management

**What It Does**: Upgrade, downgrade, or cancel subscription.

**How to Upgrade** (Trial → Pro):
1. Go to **Settings** → **Billing**
2. Click **Upgrade to Pro**
3. Choose billing cycle (Monthly £99 or Annual £990)
4. Enter card details
5. Payment processed immediately
6. Access restored instantly

**How to Downgrade** (Pro → Free Academic):
- Only available if user is @bangor.ac.uk
- Contact support@datawinder.app to process

**How to Cancel** (Pro):
1. Go to **Settings** → **Billing**
2. Click **Cancel Subscription**
3. Confirm (you'll keep access through end of billing period)
4. Access revokes at next billing cycle

**Availability**:
- ✅ Pro: Manage subscription
- ✅ Free Academic: View account (no changes possible)

---

## Module 8: Support & Community

### 8.1 FAQ Bot

**What It Does**: AI-powered chatbot answers common questions.

**How to Use**:
1. Go to **Community** → **FAQ Bot**
2. Type your question in natural language
3. Bot searches knowledge base and responds
4. Can ask follow-up questions

**Available Topics**:
- Data import and validation
- Running models and interpreting results
- Team collaboration
- Billing and subscriptions
- Technical troubleshooting

**Availability**:
- ✅ All tiers

---

### 8.2 Community Forum

**What It Does**: Discussion board where researchers share questions, tips, and results.

**How to Use**:
1. Go to **Community Hub**
2. Browse or search existing threads
3. Click **New Thread** to ask a question
4. Tag your post (e.g., "Data Import", "Climate Modeling")
5. Community members and DataWinder team respond

**Example Threads**:
- "Best practices for importing IUCN range maps"
- "How to interpret response curves for conservation planning"
- "Climate scenarios for tropical species"

**Availability**:
- ✅ All tiers

---

### 8.3 Email Support

**What It Does**: Direct support from DataWinder team.

**Contact**: support@datawinder.app

**Response Times**:
- Free Academic: 48–72 hours
- Trial: 24 hours
- Pro: 24 hours (priority queue)

**Include in Emails**:
- Describe the issue clearly
- Include screenshot or error message
- Species name and relevant details
- Browser type and version

**Availability**:
- ✅ All tiers

---

## Tier Comparison Matrix

| Feature | Free Academic | Trial (14 days) | Pro |
|---------|---------------|-----------------|-----|
| **Projects** | 5 | Unlimited | Unlimited |
| **Occurrences/month** | 1,000 | Unlimited | Unlimited |
| **MaxEnt Modeling** | ✅ | ✅ | ✅ |
| **Ensemble SDM** | ❌ | ✅ | ✅ |
| **Climate Scenarios** | Current only | 4 futures | 4 futures |
| **Data Quality Audit** | Basic | Full | Full |
| **Photo AI ID** | Manual only | ✅ | ✅ |
| **Report Generation** | Simple PDF | Full | Full + CSV |
| **Team Members** | 5 | Unlimited | Unlimited |
| **Version Rollback** | ❌ | ❌ | ✅ |
| **REST API** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ (24h SLA) |
| **Cost** | £0 forever | £0 (14 days) | £99/mo or £990/yr |

---

## Getting Started

**First 30 minutes:**
1. Sign up and create account
2. Create first project
3. Search for a species (GBIF)
4. Review quality report

**First week:**
1. Import occurrence data
2. Run a MaxEnt model
3. View results and metrics
4. Generate report

**Ongoing:**
1. Invite collaborators
2. Compare multiple models
3. Explore climate scenarios (Pro)
4. Export results for publication

---

## Questions?

- 📧 **Email**: support@datawinder.app
- 💬 **Chat**: FAQ Bot (Community Hub)
- 📚 **Docs**: Inline help throughout app
- 🐛 **Bugs**: Use Feedback button

**Built for conservation. Designed for researchers. Ready to use.**

---

*Last updated: May 2026*