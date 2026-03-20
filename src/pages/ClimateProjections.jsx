import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Info, CloudRain, Thermometer, Layers, Download, Database,
  ExternalLink, Search, CheckCircle2, Leaf, Globe2, Wind, SlidersHorizontal, FileText, Droplets, Map
} from 'lucide-react';
import BangOnLogo from '@/components/BangOnLogo';
import ClimateSourceCard from '@/components/climate/ClimateSourceCard';
import ClimateFilters from '@/components/climate/ClimateFilters';

// ─────────────────────────────────────────────────────────────────────────────
// Curated catalogue of climate / environmental variable data sources
// ─────────────────────────────────────────────────────────────────────────────
const CLIMATE_SOURCES = [
  // ── WORLDCLIM ──────────────────────────────────────────────────────────────
  {
    id: 'worldclim-bio-current',
    name: 'WorldClim 2.1 — Current Bioclimatic Variables',
    provider: 'WorldClim',
    category: 'Bioclimatic',
    scenario: 'Historical/Baseline',
    resolution: '~1 km',
    timePeriod: '1970–2000',
    gcm: 'Observational baseline',
    description: 'The de-facto standard baseline for SDMs. 19 bioclimatic variables (BIO1–BIO19) covering temperature and precipitation seasonality, extremes and means. Directly imported into MAXENT.',
    variables: ['BIO1 Annual Mean Temp', 'BIO4 Temp Seasonality', 'BIO12 Annual Precipitation', 'BIO15 Precip Seasonality', 'BIO5 Max Temp Warmest Month', 'BIO6 Min Temp Coldest Month'],
    url: 'https://www.worldclim.org/data/worldclim21.html',
    maxentReady: true,
  },
  {
    id: 'worldclim-bio-future-245',
    name: 'WorldClim 2.1 — Future BioClim (SSP2-4.5)',
    provider: 'WorldClim',
    category: 'Bioclimatic',
    scenario: 'SSP2-4.5',
    resolution: '~1 km',
    timePeriod: '2021–2100',
    gcm: 'CMIP6 ensemble (BCC-CSM2-MR, CNRM-CM6-1, CanESM5, IPSL-CM6A-LR, MIROC6, MRI-ESM2-0)',
    description: 'CMIP6 downscaled future bioclimatic variables for SSP2-4.5 ("middle of the road" — moderate emissions, some mitigation). Same 19 BIO variables as the baseline for direct MAXENT comparison.',
    variables: ['BIO1–BIO19 future projections', 'Multi-GCM ensemble'],
    url: 'https://www.worldclim.org/data/cmip6/cmip6climate.html',
    maxentReady: true,
  },
  {
    id: 'worldclim-bio-future-585',
    name: 'WorldClim 2.1 — Future BioClim (SSP5-8.5)',
    provider: 'WorldClim',
    category: 'Bioclimatic',
    scenario: 'SSP5-8.5',
    resolution: '~1 km',
    timePeriod: '2021–2100',
    gcm: 'CMIP6 ensemble',
    description: 'Worst-case "fossil-fuel intensive" scenario. High emissions, no mitigation. Provides the extreme end of the range envelope for range shift projections alongside SSP1-2.6.',
    variables: ['BIO1–BIO19 future projections'],
    url: 'https://www.worldclim.org/data/cmip6/cmip6climate.html',
    maxentReady: true,
  },
  {
    id: 'worldclim-bio-future-126',
    name: 'WorldClim 2.1 — Future BioClim (SSP1-2.6)',
    provider: 'WorldClim',
    category: 'Bioclimatic',
    scenario: 'SSP1-2.6',
    resolution: '~1 km',
    timePeriod: '2021–2100',
    gcm: 'CMIP6 ensemble',
    description: 'Best-case scenario — strong mitigation, sustainable development pathway consistent with the Paris Agreement 1.5–2°C target. Provides optimistic range projections.',
    variables: ['BIO1–BIO19 future projections'],
    url: 'https://www.worldclim.org/data/cmip6/cmip6climate.html',
    maxentReady: true,
  },

  // ── CHELSA ────────────────────────────────────────────────────────────────
  {
    id: 'chelsa-current',
    name: 'CHELSA v2.1 — Current Climate',
    provider: 'CHELSA',
    category: 'Bioclimatic',
    scenario: 'Historical/Baseline',
    resolution: '~1 km',
    timePeriod: '1981–2010',
    gcm: 'ERA5 reanalysis downscaled',
    description: 'Climatologies at High resolution for the Earth\'s Land Surface Areas. Considered more accurate than WorldClim in complex terrain and tropics. Same 19 BIO + additional variables. Ideal for cross-validation.',
    variables: ['BIO1–BIO19', 'Growing Degree Days', 'Frost Days', 'SFCWIND', 'SWrad'],
    url: 'https://chelsa-climate.org/downloads/',
    maxentReady: true,
  },
  {
    id: 'chelsa-future-ssp',
    name: 'CHELSA v2.1 — Future Climate (All SSPs)',
    provider: 'CHELSA',
    category: 'Bioclimatic',
    scenario: 'All SSPs',
    resolution: '~1 km',
    timePeriod: '2041–2070, 2071–2100',
    gcm: 'GFDL-ESM4, IPSL-CM6A-LR, MPI-ESM1-2-HR, MRI-ESM2-0, UKESM1-0-LL',
    description: 'CHELSA future projections for SSP1-2.6, SSP3-7.0 and SSP5-8.5. Particularly recommended for tropical and mountain species modelling where terrain effects dominate.',
    variables: ['BIO1–BIO19', 'Growing Season Length', 'SWrad', 'Frost Days'],
    url: 'https://chelsa-climate.org/cmip6/',
    maxentReady: true,
  },

  // ── ERA5 ──────────────────────────────────────────────────────────────────
  {
    id: 'era5-land',
    name: 'ERA5-Land Reanalysis',
    provider: 'Copernicus / ECMWF',
    category: 'Compound',
    scenario: 'Historical/Baseline',
    resolution: '9 km',
    timePeriod: '1950–present',
    gcm: 'ECMWF ERA5 reanalysis',
    description: 'High-resolution global reanalysis from ECMWF/Copernicus. Provides observed historical climate back to 1950. Useful for validating SDM baselines and extracting recent trends. Monthly and hourly data available.',
    variables: ['2m Temperature', 'Total Precipitation', 'Soil Moisture', 'Snow Cover', 'Evapotranspiration', 'Leaf Area Index'],
    url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land',
    maxentReady: false,
  },

  // ── CMIP6 / ESGF ──────────────────────────────────────────────────────────
  {
    id: 'cmip6-esgf',
    name: 'CMIP6 — Earth System Grid Federation',
    provider: 'ESGF / IPCC',
    category: 'Compound',
    scenario: 'Multiple SSPs',
    resolution: '~25–100 km (raw)',
    timePeriod: '1850–2100',
    gcm: '100+ GCMs',
    description: 'The primary archive for the IPCC AR6-underpinning climate model outputs. All SSP scenarios available from dozens of GCMs. Raw data requires downscaling before use in MAXENT — best used via CHELSA or WorldClim downscaled products.',
    variables: ['Near-surface temp', 'Precipitation', 'Sea Level Pressure', 'Soil Carbon', 'Vegetation Carbon', 'LAI'],
    url: 'https://esgf-data.dkrz.de/search/cmip6-dkrz/',
    maxentReady: false,
  },

  // ── TerraClimate ──────────────────────────────────────────────────────────
  {
    id: 'terraclimate',
    name: 'TerraClimate',
    provider: 'University of Idaho',
    category: 'Compound',
    scenario: 'Historical/Baseline',
    resolution: '~4 km',
    timePeriod: '1958–present',
    gcm: 'Observed / CRUJRA derived',
    description: 'Monthly global climate and climatic water balance dataset. Notably includes actual evapotranspiration, soil moisture, runoff, and climatic water deficit — variables relevant to vegetation dynamics and primate range models.',
    variables: ['Max/Min Temp', 'Precipitation', 'Actual Evapotranspiration', 'Climatic Water Deficit', 'Soil Moisture', 'PDSI', 'VPD'],
    url: 'https://www.climatologylab.org/terraclimate.html',
    maxentReady: false,
  },

  // ── MODIS Vegetation / NDVI ───────────────────────────────────────────────
  {
    id: 'modis-ndvi',
    name: 'MODIS MOD13A3 — NDVI & EVI',
    provider: 'NASA / USGS',
    category: 'Vegetation/NDVI',
    scenario: 'Historical/Baseline',
    resolution: '1 km',
    timePeriod: '2000–present',
    gcm: 'Satellite observational',
    description: 'Monthly Normalised Difference Vegetation Index (NDVI) and Enhanced Vegetation Index (EVI) from MODIS Terra. Captures vegetation greenness and canopy density — critical for forest-dependent primates and habitat suitability. Can be used as direct MAXENT layers.',
    variables: ['NDVI', 'EVI', 'Pixel Reliability'],
    url: 'https://lpdaac.usgs.gov/products/mod13a3v061/',
    maxentReady: true,
  },
  {
    id: 'modis-lc',
    name: 'MODIS MCD12Q1 — Land Cover',
    provider: 'NASA / USGS',
    category: 'Land Cover',
    scenario: 'Historical/Baseline',
    resolution: '500 m',
    timePeriod: '2001–present',
    gcm: 'Satellite observational',
    description: 'Annual land cover classification including 17 IGBP classes (tropical forest, savanna, shrubland, cropland etc.). Essential for masking non-habitat cells in MAXENT and for assessing habitat loss trajectories.',
    variables: ['IGBP Land Cover Type', 'UMD Classification', 'LAI/fPAR', 'Plant Functional Types'],
    url: 'https://lpdaac.usgs.gov/products/mcd12q1v061/',
    maxentReady: true,
  },

  // ── ESA CCI ───────────────────────────────────────────────────────────────
  {
    id: 'esa-cci-landcover',
    name: 'ESA CCI — Land Cover Time Series',
    provider: 'ESA Climate Change Initiative',
    category: 'Land Cover',
    scenario: 'Historical/Baseline',
    resolution: '300 m',
    timePeriod: '1992–2020',
    gcm: 'Satellite observational',
    description: 'Annual consistent global land cover maps at 300m spanning 1992–2020. Highest temporal coverage for land cover change analysis. Enables modelling of historical habitat conversion trajectories prior to MAXENT runs.',
    variables: ['22-class land cover map', 'Change maps 1992–2020', 'Urban expansion', 'Forest loss/gain'],
    url: 'https://www.esa-landcover-cci.org/',
    maxentReady: true,
  },
  {
    id: 'esa-cci-forest-biomass',
    name: 'ESA CCI — Above-Ground Biomass',
    provider: 'ESA Climate Change Initiative',
    category: 'Vegetation/NDVI',
    scenario: 'Historical/Baseline',
    resolution: '100 m',
    timePeriod: '2010, 2017, 2018, 2019, 2020',
    gcm: 'Satellite SAR',
    description: 'Forest above-ground biomass estimates from SAR satellite data. Directly related to tropical forest structure and canopy quality — key proxies for great ape and primate habitat quality beyond simple presence/absence.',
    variables: ['Above-Ground Biomass (Mg/ha)', 'Uncertainty layers'],
    url: 'https://climate.esa.int/en/projects/biomass/',
    maxentReady: false,
  },

  // ── ISIMIP ────────────────────────────────────────────────────────────────
  {
    id: 'isimip3b',
    name: 'ISIMIP3b — Bias-Corrected GCM Data',
    provider: 'ISIMIP / PIK Potsdam',
    category: 'Compound',
    scenario: 'Multiple SSPs',
    resolution: '~50 km',
    timePeriod: '1601–2100',
    gcm: 'GFDL-ESM4, IPSL-CM6A-LR, MPI-ESM1-2-HR, MRI-ESM2-0, UKESM1-0-LL',
    description: 'Inter-Sectoral Impact Model Intercomparison Project. Bias-corrected and spatially downscaled CMIP6 data across SSP1-2.6, SSP3-7.0, SSP5-8.5. Widely used for multi-sector biodiversity impact studies. Same 5 GCMs as CHELSA.',
    variables: ['Daily Tmin/Tmax', 'Precipitation', 'Wind speed', 'Humidity', 'Radiation', 'Soil moisture'],
    url: 'https://www.isimip.org/outputdata/isimip3b/',
    maxentReady: false,
  },

  // ── GlobCover / Copernicus Global Land ───────────────────────────────────
  {
    id: 'copernicus-land',
    name: 'Copernicus Global Land Service — NDVI & FCover',
    provider: 'Copernicus / ESA',
    category: 'Vegetation/NDVI',
    scenario: 'Historical/Baseline',
    resolution: '300 m',
    timePeriod: '1999–present',
    gcm: 'Satellite observational',
    description: 'Near-real-time and historical vegetation products: NDVI, Fraction of Absorbed Photosynthetically Active Radiation (FAPAR), Fraction of Canopy Cover (FCover), and Leaf Area Index (LAI). Particularly valuable for tropical primate habitat monitoring.',
    variables: ['NDVI', 'FAPAR', 'Leaf Area Index (LAI)', 'Fraction of Canopy Cover (FCover)', 'Soil Water Index'],
    url: 'https://land.copernicus.eu/en/products/vegetation',
    maxentReady: false,
  },

  // ── Global Human Footprint ────────────────────────────────────────────────
  {
    id: 'human-footprint',
    name: 'Global Human Footprint / Human Influence Index',
    provider: 'WCS / NASA Socioeconomic Data',
    category: 'Land Cover',
    scenario: 'Historical/Baseline',
    resolution: '~1 km',
    timePeriod: '1993, 2009',
    gcm: 'Composite observational',
    description: 'Quantifies cumulative human pressure (roads, agriculture, urban, lighting, population density). Essential as a co-variable in SDMs for distinguishing climate-driven vs. human-driven range loss. Used in Winder et al. baboon studies.',
    variables: ['Human Footprint Score', 'Population Density', 'Built Environments', 'Croplands', 'Night Lights'],
    url: 'https://sedac.ciesin.columbia.edu/data/set/wildareas-v3-human-footprint-geographic',
    maxentReady: true,
  },

  // ── SRTM DEM (Elevation) ──────────────────────────────────────────────────
  {
    id: 'srtm-dem',
    name: 'SRTM Digital Elevation Model',
    provider: 'NASA / CGIAR',
    category: 'Compound',
    scenario: 'Historical/Baseline',
    resolution: '90 m / 250 m',
    timePeriod: 'Static (2000)',
    gcm: 'Radar interferometry',
    description: 'Elevation, slope, and aspect data derived from the Shuttle Radar Topography Mission. Topographic variables are key co-predictors in primate SDMs — altitude constrains thermoregulation limits and vegetation zones.',
    variables: ['Elevation', 'Slope', 'Aspect', 'Topographic Wetness Index', 'Roughness'],
    url: 'https://srtm.csi.cgiar.org/',
    maxentReady: true,
  },

  // ── Hansen Global Forest Change ───────────────────────────────────────────
  {
    id: 'hansen-forest-change',
    name: 'Hansen / UMD Global Forest Change',
    provider: 'University of Maryland',
    category: 'Vegetation/NDVI',
    scenario: 'Historical/Baseline',
    resolution: '30 m',
    timePeriod: '2000–present',
    gcm: 'Landsat satellite',
    description: 'Annual forest cover gain and loss at 30m from Landsat time series. The best available dataset for tracking deforestation within species ranges. Essential for understanding current habitat availability ahead of MAXENT runs.',
    variables: ['Tree Cover (%)', 'Forest Loss Year', 'Forest Gain'],
    url: 'https://glad.earthengine.app/view/global-forest-change',
    maxentReady: true,
  },

  // ── Global Aridity Index ──────────────────────────────────────────────────
  {
    id: 'global-aridity',
    name: 'Global Aridity Index & PET v3',
    provider: 'CGIAR / CSI',
    category: 'Aridity',
    scenario: 'Historical/Baseline',
    resolution: '~1 km',
    timePeriod: '1970–2000',
    gcm: 'WorldClim derived',
    description: 'Global Aridity Index (AI) and Potential Evapotranspiration (PET) derived from WorldClim. Aridity integrates temperature and precipitation into a single ecologically meaningful variable — particularly relevant for savanna-dwelling primates.',
    variables: ['Aridity Index', 'Potential Evapotranspiration (PET)', 'Mean monthly PET'],
    url: 'https://www.cgiar-csi.org/data/global-aridity-and-pet-database',
    maxentReady: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SSP Scenario Reference Card
// ─────────────────────────────────────────────────────────────────────────────
const SSP_SCENARIOS = [
  { code: 'SSP1-2.6', label: 'Sustainability', warming: '~1.8°C by 2100', color: 'bg-green-100 text-green-800 border-green-300', desc: 'Strong mitigation, Paris Agreement pathway. Lowest risk to biodiversity.' },
  { code: 'SSP2-4.5', label: 'Middle of the Road', warming: '~2.7°C by 2100', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: 'Moderate emissions, partial mitigation. Most "likely" current trajectory.' },
  { code: 'SSP3-7.0', label: 'Regional Rivalry', warming: '~3.6°C by 2100', color: 'bg-orange-100 text-orange-800 border-orange-300', desc: 'High emissions, fragmented governance. Significant biodiversity impacts.' },
  { code: 'SSP5-8.5', label: 'Fossil Fuel Dev.', warming: '~4.4°C by 2100', color: 'bg-red-100 text-red-800 border-red-300', desc: 'Very high emissions, no mitigation. Worst-case range collapse scenarios.' },
];

export default function ClimateProjections() {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeScenario, setActiveScenario] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return CLIMATE_SOURCES.filter(s => {
      const matchCategory = activeCategory === 'All' || s.category === activeCategory;
      const matchScenario = activeScenario === 'All' || s.scenario === activeScenario;
      const matchText = !searchText || [s.name, s.description, s.provider, ...(s.variables || [])]
        .join(' ').toLowerCase().includes(searchText.toLowerCase());
      return matchCategory && matchScenario && matchText;
    });
  }, [activeCategory, activeScenario, searchText]);

  const toggleSelect = (source) => {
    setSelectedIds(prev =>
      prev.includes(source.id) ? prev.filter(id => id !== source.id) : [...prev, source.id]
    );
  };

  const RECOMMENDED_IDS = ['worldclim-bio-current', 'modis-ndvi', 'hansen-forest-change', 'srtm-dem', 'global-aridity'];

  const selectAll = () => setSelectedIds(filtered.map(s => s.id));
  const selectMaxentReady = () => setSelectedIds(filtered.filter(s => s.maxentReady).map(s => s.id));
  const selectRecommended = () => setSelectedIds(RECOMMENDED_IDS);
  const clearSelection = () => setSelectedIds([]);

  const selectedSources = CLIMATE_SOURCES.filter(s => selectedIds.includes(s.id));

  const saveToDatabase = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.ClimateDataset.list();
      const existingNames = new Set(existing.map(e => e.name));
      const toSave = selectedSources.filter(s => !existingNames.has(s.name));
      const alreadyExist = selectedSources.length - toSave.length;

      if (toSave.length > 0) {
        await base44.entities.ClimateDataset.bulkCreate(toSave.map(s => ({
          name: s.name,
          source: s.provider.includes('WorldClim') ? 'WorldClim'
            : s.provider.includes('CHELSA') ? 'CHELSA'
            : s.provider.includes('ECMWF') || s.provider.includes('Copernicus') ? 'ERA5'
            : s.provider.includes('NASA') || s.provider.includes('USGS') ? 'MODIS'
            : s.provider.includes('ESA') ? 'ESA CCI'
            : s.provider.includes('CGIAR') ? 'CGIAR'
            : s.provider.includes('Idaho') ? 'TerraClimate'
            : s.provider.includes('ISIMIP') ? 'ISIMIP'
            : s.provider.includes('ESGF') || s.provider.includes('IPCC') ? 'CMIP6/ESGF'
            : 'Other',
          variable_category: s.category,
          scenario: s.scenario === 'Historical/Baseline' ? 'Historical/Baseline'
            : s.scenario === 'All SSPs' ? 'All SSPs'
            : s.scenario === 'Multiple SSPs' ? 'Multiple SSPs'
            : s.scenario,
          time_period: s.timePeriod,
          resolution: s.resolution,
          gcm: s.gcm,
          variables: s.variables,
          description: s.description,
          download_url: s.url,
          maxent_ready: s.maxentReady,
        })));
      }

      toast({
        title: toSave.length > 0 ? `Saved ${toSave.length} dataset(s)` : 'Nothing new to save',
        description: alreadyExist > 0
          ? `${alreadyExist} dataset(s) were already in your database.`
          : 'Datasets are now available in MAXENT Modeller.',
      });
      setSelectedIds([]);
    } catch (err) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const exportSelectedUrls = () => {
    const lines = selectedSources.map(s => `${s.name}\t${s.url}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate_data_sources_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-bangor-red/3">
      {/* Header */}
      <header className="bg-gradient-to-r from-white via-blue-50/20 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <BangOnLogo size="sm" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-bangor-red">Climate Projections</h1>
              <p className="text-sm text-slate-600">Climate Variable Datasets & Emissions Scenarios</p>
            </div>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Search & Browse ────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-bangor-red/10 to-blue-50">
                <CardTitle className="text-bangor-red flex items-center gap-2">
                  <CloudRain className="w-5 h-5" />
                  Climate Dataset Search
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Text search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, variable or provider…"
                    className="pl-9"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <ClimateFilters
                  activeCategory={activeCategory}
                  activeScenario={activeScenario}
                  onCategoryChange={setActiveCategory}
                  onScenarioChange={setActiveScenario}
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {CLIMATE_SOURCES.length} datasets
                    {selectedIds.length > 0 && (
                      <span className="ml-2 text-bangor-red font-semibold">· {selectedIds.length} selected</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={selectAll}>
                      Select All ({filtered.length})
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={selectMaxentReady}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      MAXENT Ready ({filtered.filter(s => s.maxentReady).length})
                    </Button>
                    {selectedIds.length > 0 && (
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-slate-500" onClick={clearSelection}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results grid */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-bangor-red/10 to-blue-50 flex flex-row items-center justify-between">
                <CardTitle className="text-bangor-red">Available Datasets ({filtered.length})</CardTitle>
                {selectedIds.length > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={exportSelectedUrls} variant="outline">
                      <Download className="w-3 h-3 mr-1" />
                      Export Links ({selectedIds.length})
                    </Button>
                    <Button size="sm" onClick={saveToDatabase} disabled={saving} className="bg-bangor-red hover:bg-bangor-red/90">
                      <Database className="w-3 h-3 mr-1" />
                      {saving ? 'Saving…' : `Add to My Data (${selectedIds.length})`}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 max-h-[680px] overflow-y-auto">
                <div className="grid gap-3">
                  {filtered.map(source => (
                    <ClimateSourceCard
                      key={source.id}
                      source={source}
                      isSelected={selectedIds.includes(source.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">No datasets match your filters.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── RIGHT: Reference Panel ───────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">

            {/* SSP Scenario Reference */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-bangor-red/10 to-blue-50">
                <CardTitle className="text-bangor-red flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  IPCC SSP Emissions Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Shared Socioeconomic Pathways (SSPs) are the IPCC AR6 standard scenario framework. They reflect different assumptions about human society's ability to reduce greenhouse gas emissions and adapt to climate change. Always model across <strong>at least SSP1-2.6 and SSP5-8.5</strong> to capture the full range of uncertainty.
                </p>
                <div className="space-y-2">
                  {SSP_SCENARIOS.map(ssp => (
                    <div key={ssp.code} className={`rounded-lg border p-3 ${ssp.color}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{ssp.code}</span>
                        <span className="text-xs font-semibold">{ssp.warming}</span>
                        <Badge className={`text-xs ${ssp.color} border`}>{ssp.label}</Badge>
                      </div>
                      <p className="text-xs">{ssp.desc}</p>
                    </div>
                  ))}
                </div>
                <Alert className="bg-blue-50 border-blue-200 mt-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-slate-700">
                    <strong>Dr. Winder's approach:</strong> Compare projections across multiple SSPs and multiple GCMs to produce an ensemble of possible futures rather than a single prediction. This captures model uncertainty and scenario uncertainty.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Recommended Workflow */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-bangor-red/10 to-blue-50">
                <CardTitle className="text-bangor-red flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Recommended Variable Stack for Primate SDMs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Based on published literature (Winder et al., Hill &amp; Winder 2020, Carvalho et al.) the following variable combination is recommended to avoid collinearity while capturing the main ecological drivers:
                </p>
                {[
                  { icon: <Thermometer className="w-4 h-4 text-red-500" />, label: 'BIO1', desc: 'Annual Mean Temperature — primary thermal driver' },
                  { icon: <Thermometer className="w-4 h-4 text-orange-500" />, label: 'BIO4', desc: 'Temperature Seasonality — thermoregulation stress' },
                  { icon: <Droplets className="w-4 h-4 text-blue-500" />, label: 'BIO12', desc: 'Annual Precipitation — water availability' },
                  { icon: <Droplets className="w-4 h-4 text-cyan-500" />, label: 'BIO15', desc: 'Precipitation Seasonality — dry season severity' },
                  { icon: <Leaf className="w-4 h-4 text-green-600" />, label: 'NDVI (MODIS)', desc: 'Vegetation greenness — direct habitat proxy' },
                  { icon: <Map className="w-4 h-4 text-emerald-600" />, label: 'Forest Cover (Hansen)', desc: 'Tree cover % — canopy availability' },
                  { icon: <Globe2 className="w-4 h-4 text-slate-500" />, label: 'Elevation (SRTM)', desc: 'Altitude — physiological and vegetation zone limits' },
                  { icon: <Wind className="w-4 h-4 text-slate-400" />, label: 'Aridity Index', desc: 'Integrated water stress — savanna boundary proxy' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <span className="text-xs font-bold text-slate-800">{item.label}:</span>
                      <span className="text-xs text-slate-600 ml-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
                <Alert className="bg-emerald-50 border-emerald-200 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-xs text-slate-700">
                    All above layers are available as MAXENT-ready raster files from WorldClim, MODIS, and CGIAR at matched ~1km resolution.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-bangor-red/10 to-blue-50">
                <CardTitle className="text-bangor-red flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Dataset Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total Datasets', value: CLIMATE_SOURCES.length, color: 'text-bangor-red' },
                    { label: 'MAXENT Ready', value: CLIMATE_SOURCES.filter(s => s.maxentReady).length, color: 'text-emerald-600' },
                    { label: 'SSP Scenarios', value: CLIMATE_SOURCES.filter(s => s.scenario.includes('SSP')).length, color: 'text-blue-600' },
                    { label: 'Selected', value: selectedIds.length, color: 'text-purple-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-4">
                      <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}