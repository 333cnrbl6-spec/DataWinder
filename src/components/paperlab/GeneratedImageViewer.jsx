import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Generates and displays AI images for academic paper figures
 * Each figure is context-aware based on the genus and paper content
 */
export default function GeneratedImageViewer({ type, genus, sectionContent }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const imagePrompts = {
    range_map: `Professional biogeographic map showing the current geographic range distribution of the genus ${genus}. Display species ranges as distinct colored polygons overlaid on a map of South America showing country borders, major geographic features (Atlantic Forest, Amazon, Cerrado biomes), and occurrence points as black dots. Use scientific cartography style with lat/long grid, scale bar, and legend showing each species' IUCN status (EN/VU/LC). High resolution, publication-quality.`,
    
    hybridization_zones: `Scientific map showing predicted hybridization zones and secondary contact areas for the genus ${genus}. Display overlapping species ranges with hatched patterns or heat maps showing contact zones in red/orange. Include altitude shading and vegetation boundaries. Add legend explaining the probability of interspecific encounters and genetic contact. Publication-quality scientific illustration.`,
    
    occurrence_map: `Detailed occurrence point map for ${genus} showing all quality-filtered field observations and museum specimens from GBIF, iNaturalist, and speciesLink. Use density heatmaps with concentration in warmer colors (red = high density, blue = low). Overlay on topographic map showing elevation contours. Include data source legend and quality flags. Professional scientific cartography.`,
    
    occurrence_chart: `Professional bar chart showing occurrence records for ${genus} by data source. Compare GBIF, iNaturalist, speciesLink, and IUCN assessments with bars colored by source. Include absolute counts and percentages. Use clean scientific visualization style with gridlines and clear axis labels. Professional publication-quality figure.`,
    
    suitability_map: `MAXENT habitat suitability model output for ${genus}. Display continuous raster surface with color gradient (blue=low suitability, red=high suitability) overlaid on map of Brazil and adjacent regions. Overlay current species occurrence points as black dots. Include 0.5 threshold contour line. Add scale bar, legend, and bioclimatic context. ArcGIS-style professional cartography.`,
    
    climate_projection: `Comparative climate change impact visualization for ${genus}. Show stacked bar charts for 4 species displaying: baseline suitable area (gray), 2050 projection (orange), and 2070 projection (red) under SSP5-8.5 scenario. Include percentage loss labels. Below, show a map with current range (solid green) and 2070 suitable area (hatched red) showing range contraction. Publication-quality scientific figure.`,
    
    threat_analysis: `Integrated threat assessment dashboard for ${genus}. Display a comprehensive visualization combining: (1) radar chart showing threat components (habitat loss, climate change, population decline, protection gap) for each species, (2) threat score ranking from 1-5 species, (3) conservation priority matrix. Use color scale from green (low threat) to red (critical). Scientific style, publication-ready.`,
    
    data_sources: `Data completeness matrix table for ${genus}. Show species (rows) vs data sources (IUCN, GBIF, iNaturalist, speciesLink) as columns. Green cells = complete, gray = partial/missing. Include row summaries showing overall completeness percentage. Use professional table styling with borders and clear typography. Include caption indicating data requirements and gaps.`,
    
    species_overview: `Taxonomic overview infographic for the genus ${genus}. Display all recognized species with: species name (italicized), IUCN Red List status with color coding (green=LC, yellow=NT/VU, orange=EN, red=CR), population trend arrows, geographic distribution mini-maps, and key characteristics. Professional scientific illustration with consistent iconography.`,
    
    variable_selection: `Environmental variable importance bar chart for ${genus} MAXENT models. Show top 10 bioclimatic variables (BIO1, BIO4, BIO12, etc.) ranked by permutation importance (%). Use gradient colors from dark blue (100%) to light blue (0%). Include gridlines and percentage labels. Add brief legend explaining variable meanings (temperature, precipitation seasonality, etc.). Professional scientific publication style.`,
    
    spatial_thinning: `Spatial sampling effects visualization for ${genus}. Show before/after comparison: (left) raw occurrence points showing heavy spatial clustering, (right) spatially thinned points at 1km resolution showing uniform sampling. Display density difference with heatmaps. Include statistics: original points, retained points, percentage reduction. Professional cartography style with scale bar.`,
  };

  useEffect(() => {
    if (!type || !genus) return;

    const generateImage = async () => {
      setLoading(true);
      setError(null);
      try {
        const prompt = imagePrompts[type] || `Scientific visualization for ${genus}: ${type}`;
        
        const result = await base44.integrations.Core.GenerateImage({
          prompt: `${prompt}. This is for an academic research paper on species distribution and climate vulnerability.`,
          existing_image_urls: [],
        });

        if (result?.url) {
          setImageUrl(result.url);
        } else {
          setError('No image returned from AI');
        }
      } catch (err) {
        setError(err.message || 'Failed to generate image');
        console.error('Image generation error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateImage();
  }, [type, genus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg border border-dashed border-slate-300">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
        <p className="text-sm text-slate-500 font-medium">Generating scientific figure...</p>
        <p className="text-xs text-slate-400 mt-1">Creating {type} visualization</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
        <p className="text-sm text-red-700 font-medium">Could not generate image</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <p className="text-sm text-slate-500">No image available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <img 
        src={imageUrl} 
        alt={`Figure: ${type} for ${genus}`}
        className="w-full rounded-lg border border-slate-200 shadow-md"
        loading="lazy"
      />
      <p className="text-xs text-slate-500 italic text-center">
        AI-generated scientific visualization • Publication-ready quality
      </p>
    </div>
  );
}