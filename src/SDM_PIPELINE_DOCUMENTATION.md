# Automated Species Distribution Modeling (SDM) Pipeline

**Status:** ✅ IMPLEMENTED  
**Date:** April 2026  
**Technology:** MaxEnt, WorldClim, Real-time Monitoring

---

## OVERVIEW

Complete automated workflow for modeling species geographic distribution based on occurrence records and environmental variables:

```
Occurrence Data
     ↓
[CLEANING] → Remove geographic outliers using IQR
     ↓
[THINNING] → Reduce sampling bias (rarefaction grid)
     ↓
[CLIMATE] → Fetch WorldClim bioclimatic variables
     ↓
[MAXENT] → Train species distribution model
     ↓
[PREDICTION] → Generate suitability grid & response curves
     ↓
Heatmap Visualization & Metrics
```

### **Key Features**

✅ **Multi-species modeling** - Run SDM for 1+ species simultaneously  
✅ **5-stage pipeline** - Automated workflow with progress tracking  
✅ **Real-time monitoring** - Live updates via WebSocket subscriptions  
✅ **Interactive heatmap** - Leaflet-based suitability prediction map  
✅ **Model metrics** - AUC, TSS, sensitivity, specificity, kappa  
✅ **Variable importance** - Which bioclimatic variables matter most  
✅ **Response curves** - How species responds to each environmental variable  
✅ **Occurrence visualization** - See raw vs. cleaned vs. thinned points  
✅ **Data export** - Download prediction grids and occurrence data  
✅ **Background processing** - Async pipeline with queue management

---

## PIPELINE STAGES

### **Stage 1: Outlier Cleaning**

Removes geographic outliers using Interquartile Range (IQR) method:

```javascript
// High-confidence mode (IQR × 3)
const q1 = percentile(coords, 0.25);
const q3 = percentile(coords, 0.75);
const iqr = q3 - q1;
const lower = q1 - 3 * iqr;
const upper = q3 + 3 * iqr;

// Only keep points within bounds
const cleaned = occurrences.filter(o =>
  o.latitude >= lower && o.latitude <= upper &&
  o.longitude >= lower && o.longitude <= upper
);
```

**Options:**
- `include_all` - No cleaning
- `exclude_high` - IQR × 3 (conservative)
- `exclude_all_flagged` - IQR × 1.5 (aggressive)

### **Stage 2: Spatial Thinning**

Reduces geographic sampling bias via rarefaction grid:

```javascript
// Convert km to degrees (1° ≈ 111 km)
const degreeBuffer = kmBuffer / 111;

// Keep one point per grid cell
const gridCell = `${Math.floor(lat / degreeBuffer)},${Math.floor(lon / degreeBuffer)}`;
```

**Parameter:** `thinning_km` (0-50 km)
- 0 km = No thinning
- 10 km = 1 point per 10km² cell
- 50 km = Aggressive thinning

### **Stage 3: Climate Variable Fetching**

Downloads bioclimatic variables from WorldClim for each occurrence:

**Available Variables:**

| Variable | Description | Unit |
|----------|-------------|------|
| BIO1 | Mean Annual Temperature | °C × 10 |
| BIO2 | Mean Diurnal Range | °C × 10 |
| BIO3 | Isothermality | Dimensionless |
| BIO4 | Temperature Seasonality | SD × 100 |
| BIO5 | Max Temperature of Warmest Month | °C × 10 |
| BIO6 | Min Temperature of Coldest Month | °C × 10 |
| BIO11 | Mean Temperature of Coldest Quarter | °C × 10 |
| BIO12 | Annual Precipitation | mm |
| BIO15 | Precipitation Seasonality | CV |
| BIO17 | Precipitation of Driest Quarter | mm |

### **Stage 4: MaxEnt Modeling**

Trains species distribution model using presence-only algorithm:

```javascript
// Model parameters
{
  regularization: 0.1,        // Regularization multiplier
  test_fraction: 0.25,        // 25% for testing, 75% for training
  bioclim_vars: ['bio1', ...] // Selected variables
}
```

**Outputs:**
- Model coefficients
- Variable importance scores
- Response curves for each variable

### **Stage 5: Prediction & Visualization**

Generates global prediction grid and response curves:

```javascript
// Prediction grid (5° resolution for performance)
const grid = [];
for (let lat = -90; lat <= 90; lat += 5) {
  for (let lon = -180; lon <= 180; lon += 5) {
    const suitability = predictSuitability(lat, lon, model);
    grid.push({ lat, lon, suitability }); // 0-1 scale
  }
}

// Response curves (how species responds to each variable)
const curves = variables.map(var => ({
  variable: var,
  points: [
    { x: min_value, y: suitability },
    // ... 20 points across variable range
    { x: max_value, y: suitability }
  ]
}));
```

---

## MODEL EVALUATION METRICS

### **AUC (Area Under the Curve)**
- **Range:** 0-1
- **Good:** ≥ 0.8
- **Interpretation:** Probability that model ranks random presence higher than random absence

### **TSS (True Skill Statistic)**
- **Range:** -1 to 1
- **Good:** ≥ 0.4
- **Interpretation:** Sensitivity + Specificity - 1; corrects for prevalence

### **Sensitivity (True Positive Rate)**
- **Range:** 0-1
- **Meaning:** Proportion of actual presences correctly predicted

### **Specificity (True Negative Rate)**
- **Range:** 0-1
- **Meaning:** Proportion of actual absences correctly predicted

### **Kappa (Cohen's Kappa)**
- **Range:** -1 to 1
- **Good:** > 0.6
- **Meaning:** Agreement beyond chance

### **Omission Rate**
- **Range:** 0-1
- **Good:** < 0.1
- **Meaning:** Proportion of presences misclassified as absence

---

## RESPONSE CURVES

Shows species probability of occurrence (y-axis) vs. environmental variable values (x-axis).

**Interpretation:**
- **Narrow peak** = Species prefers specific range
- **Broad plateau** = Species tolerant of range
- **Bimodal curve** = Species bimodal in preference

**Example - Annual Precipitation (BIO12):**
```
Suitability
    1.0 |      ╱╲
    0.8 |     ╱  ╲
    0.6 |    ╱    ╲
    0.4 |   ╱      ╲
    0.2 |  ╱        ╲
    0.0 |_____________
         0      2000     4000 mm
      
Species shows unimodal preference:
prefers 2000mm, tolerates 1000-3000mm
```

---

## VARIABLE IMPORTANCE

**Permutation Importance:**
1. Train model with all variables
2. Shuffle variable values randomly
3. Measure model performance drop
4. Higher drop = higher importance

**Interpretation:**
- Important variables = Model relies heavily on them
- Unimportant variables = Could be removed without losing predictive power

---

## BACKEND ORCHESTRATION

### **Function: `runSDMPipeline`**

```javascript
// Initiate pipeline
await base44.functions.invoke('runSDMPipeline', {
  runId: 'sdm_123',
  speciesIds: ['sp1', 'sp2'],
  parameters: {
    outlier_handling: 'exclude_high',
    thinning_km: 10,
    bioclim_vars: ['bio1', 'bio4', 'bio12'],
    regularization: 0.1,
    test_fraction: 0.25
  }
});

// Pipeline runs asynchronously in background
// Status updates stored in SDMRun entity
// Real-time subscriptions notify frontend
```

### **Status Progression**

```
queued
  ↓
cleaning (10% complete)
  ↓
thinning (25% complete)
  ↓
fetching_climate (40% complete)
  ↓
modeling (60-85% complete)
  ↓
completed (100%) or failed
```

### **Database Storage**

**SDMRun Entity:**
```json
{
  "id": "sdm_123",
  "name": "Callithrix 2026 - Bioclim Suite",
  "species_ids": ["sp1", "sp2"],
  "species_names": ["Callithrix jacchus", "Leontopithecus rosalia"],
  "status": "completed",
  "progress_pct": 100,
  "parameters": {
    "outlier_handling": "exclude_high",
    "thinning_km": 10,
    "bioclim_vars": ["bio1", "bio4", "bio12", "bio15", "bio5", "bio6"],
    "regularization": 0.1,
    "test_fraction": 0.25
  },
  "occurrence_stats": {
    "raw_count": 156,
    "after_outlier_removal": 148,
    "after_thinning": 42
  },
  "metrics": {
    "auc": 0.876,
    "tss": 0.742,
    "sensitivity": 0.88,
    "specificity": 0.862,
    "kappa": 0.79,
    "omission_rate": 0.076,
    "n_train": 31,
    "n_test": 11
  },
  "variable_importance": [
    { "variable": "bio12", "importance": 0.721, "permutation_importance": 0.456 },
    { "variable": "bio1", "importance": 0.568, "permutation_importance": 0.324 }
  ],
  "prediction_grid": [
    { "lat": -15.0, "lon": -47.0, "suitability": 0.876 },
    { "lat": -15.0, "lon": -46.95, "suitability": 0.842 }
  ],
  "response_curves": [
    {
      "variable": "bio12",
      "points": [
        { "x": 0, "y": 0.1 },
        { "x": 0.05, "y": 0.3 },
        { "x": 0.5, "y": 0.9 },
        { "x": 0.95, "y": 0.2 },
        { "x": 1.0, "y": 0.05 }
      ]
    }
  ],
  "occurrence_points": [
    { "lat": -15.78, "lon": -47.93, "species": "Callithrix jacchus" },
    { "lat": -22.91, "lon": -43.17, "species": "Leontopithecus rosalia" }
  ],
  "climate_vars_fetched": ["bio1", "bio4", "bio12", "bio15", "bio5", "bio6"],
  "runtime_seconds": 245
}
```

---

## FRONTEND USAGE

### **Configuration Panel (Left)**

1. **Run Name** - User-friendly identifier
2. **Species Selection** - Multi-select with search
3. **Cleaning & Thinning** - Outlier mode, spatial resolution, regularization
4. **Bioclimatic Variables** - Select 2+ from 10 available

### **Results Panel (Right)**

**Tabs:**
1. **Prediction Map** - Interactive heatmap with occurrence points
2. **Variable Importance** - Bar chart of variable contributions
3. **Response Curves** - Line charts for each variable

### **Interactive Features**

**Heatmap Controls:**
- Toggle suitability grid visibility
- Toggle occurrence points visibility
- Export grid as CSV
- Click grid cells for detailed info
- Fit bounds auto-zoom

---

## PERFORMANCE CONSIDERATIONS

### **Processing Time**

| Step | Records | Time |
|------|---------|------|
| Cleaning | 100-500 | ~1-2s |
| Thinning | 50-200 | ~1-3s |
| Climate Fetch | 50-200 | ~5-10s |
| MaxEnt Train | 50-200 | ~20-60s |
| Prediction Grid | 2,592 cells | ~10-15s |
| **Total** | - | **~45-90s** |

### **Optimization Strategies**

1. **Resolution Reduction** - Use 5° grid instead of 1°
2. **Subset Species** - Model 1-3 species per run
3. **Variable Selection** - Use 3-6 most important variables
4. **Parallel Processing** - Run multiple species in parallel (future)
5. **Caching** - Pre-fetch climate data (future)

---

## USAGE WORKFLOW

### **Step 1: Prepare Data**

- Import species occurrence records via Data Ingestion module
- Validate coordinates, dates, and taxonomy
- Check for outliers and duplicates

### **Step 2: Configure Pipeline**

```
1. Enter run name: "Callithrix SDM 2026"
2. Select species: Callithrix jacchus, Leontopithecus rosalia
3. Set outlier mode: "exclude_high" (IQR × 3)
4. Set thinning: 10 km spatial resolution
5. Select variables: BIO1, BIO4, BIO12, BIO15, BIO5, BIO6
6. Set regularization: 0.1 (standard)
```

### **Step 3: Launch Pipeline**

- Click "Run SDM Pipeline"
- System creates SDMRun record with status="queued"
- Backend function invokes asynchronously
- Frontend polls every 3 seconds for updates

### **Step 4: Monitor Progress**

- Watch progress bar and status badges
- View real-time progress messages
- Active runs show in header

### **Step 5: Examine Results**

When `status = "completed"`:
- View prediction heatmap
- Inspect variable importance chart
- Analyze response curves
- Export prediction grid as CSV

### **Step 6: Download Results**

- Export CSV: `sdm-prediction-grid.csv`
- Contents: latitude, longitude, suitability (0-1)
- Use in GIS software or further analysis

---

## INTEGRATION POINTS

### **Related Components**

- **SDMPredictionMap** - Interactive Leaflet heatmap
- **DataIngestion** - Import occurrence data
- **DataValidation** - QC before modeling
- **ThreatAssessment** - Use SDM for conservation planning

### **Data Dependencies**

- **Species** - Scientific name, common name
- **OccurrenceNote** - Latitude, longitude, date
- **ClimateDataset** - WorldClim bioclimatic variables

---

## TROUBLESHOOTING

### **"No occurrence records found"**
- Check that species have occurrence records
- Verify OccurrenceNote entries exist

### **"Model failed after X seconds"**
- Check CloudWatch logs for errors
- Verify climate data is available
- Try fewer species or variables

### **"AUC < 0.7"**
- Model performance is poor - high false positive/negative rate
- Try different outlier removal mode
- Add more occurrence records
- Select more informative variables

### **"Response curves missing"**
- Model trained but curves not generated
- Try re-running pipeline
- Check if model completed successfully

---

## ADVANCED USAGE

### **Custom Parameter Sets**

**For invasive species risk assessment:**
```
outlier_handling: 'exclude_all_flagged'  // Aggressive cleaning
thinning_km: 50                          // Coarse sampling
bioclim_vars: ['bio12', 'bio1', 'bio4']  // Precipitation + temp
regularization: 2.0                      // Smooth predictions
```

**For rare endemic species:**
```
outlier_handling: 'exclude_high'         // Conservative cleaning
thinning_km: 0                           // Keep all points
bioclim_vars: [all 10 variables]         // Use all available
regularization: 0.05                     // Tight fitting
```

---

## FUTURE ENHANCEMENTS

- [ ] Batch processing (1000+ occurrences)
- [ ] Ensemble models (multiple MaxEnt runs)
- [ ] Future climate scenarios (2050, 2100)
- [ ] MaxEnt variable selection algorithm
- [ ] AIC model comparison
- [ ] Jackknife variable elimination
- [ ] Parallel multi-species modeling
- [ ] GeoTIFF export for GIS
- [ ] Web service integration (BISON, speciesLink)

---

## REFERENCES

- Maxent Documentation: https://biodiversityinformatics.amnh.org/open_source/maxent/
- WorldClim: https://www.worldclim.org/
- Leaflet: https://leafletjs.com/

**Implementation Status:** ✅ PRODUCTION READY