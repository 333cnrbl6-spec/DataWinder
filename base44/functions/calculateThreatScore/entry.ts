import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { speciesId, scientificName } = await req.json();

    if (!speciesId || !scientificName) {
      return Response.json({ 
        status: 'error', 
        message: 'speciesId and scientificName are required' 
      }, { status: 400 });
    }

    // Fetch species data
    const species = await base44.entities.Species.filter({ id: speciesId }, null, 1);
    if (!species || species.length === 0) {
      return Response.json({ 
        status: 'error', 
        message: 'Species not found' 
      }, { status: 404 });
    }

    const sp = species[0];

    // 1. HABITAT LOSS SCORE (0-25)
    // Estimate from range size and GBIF occurrence trends
    let habitatLossScore = 0;
    let habitatLossPercent = 0;
    
    if (sp.gbif_occurrence_count && sp.observation_count) {
      const ratio = sp.observation_count / (sp.gbif_occurrence_count || 1);
      habitatLossPercent = Math.max(0, Math.min(100, (1 - ratio) * 100));
      habitatLossScore = habitatLossPercent / 4; // Scale to 0-25
    } else {
      habitatLossScore = 10; // Default moderate loss
      habitatLossPercent = 40;
    }

    // 2. POPULATION DECLINE SCORE (0-25)
    let populationDeclineScore = 0;
    
    const iucnStatusMap = {
      'EX': 25, 'EW': 24, 'CR': 23, 'EN': 20, 'VU': 15, 'NT': 8, 'LC': 2, 'DD': 10, 'NE': 5
    };
    
    populationDeclineScore = iucnStatusMap[sp.iucn_status] || 10;

    // Adjust for population trend
    if (sp.population_trend === 'decreasing') {
      populationDeclineScore = Math.min(25, populationDeclineScore + 5);
    } else if (sp.population_trend === 'increasing') {
      populationDeclineScore = Math.max(0, populationDeclineScore - 3);
    }

    // 3. CLIMATE CHANGE VULNERABILITY (0-25)
    // Estimate from occurrence range and specificity
    let climateChangeScore = 0;
    
    if (sp.gbif_occurrence_count) {
      // Species with few occurrences = narrow niche = high vulnerability
      if (sp.gbif_occurrence_count < 50) {
        climateChangeScore = 20;
      } else if (sp.gbif_occurrence_count < 200) {
        climateChangeScore = 12;
      } else if (sp.gbif_occurrence_count < 1000) {
        climateChangeScore = 8;
      } else {
        climateChangeScore = 3; // Widespread = more resilient
      }
    }

    // 4. DISEASE RISK SCORE (0-15)
    // Based on occurrence density and tropical zones (high pathogen zones)
    let diseaseRiskScore = 0;
    
    if (sp.observations && sp.observations.length > 0) {
      const avgLat = sp.observations.reduce((sum, o) => sum + Math.abs(o.latitude), 0) / sp.observations.length;
      // Tropical regions (±23.5°) have higher disease pressure
      const tropicalityScore = Math.max(0, (23.5 - avgLat) / 23.5 * 20);
      const densityScore = Math.min(10, sp.observations.length / 50);
      diseaseRiskScore = (tropicalityScore + densityScore) / 2;
    } else {
      diseaseRiskScore = 5;
    }

    // 5. PROTECTION GAP SCORE (0-10)
    // Based on range extent vs protected area coverage
    let protectionGapScore = 0;
    let protectionCoverage = 0;
    
    if (sp.iucn_range_data_id) {
      // Estimate: assume ~20% of global tropical areas are protected
      protectionCoverage = 20;
      protectionGapScore = Math.max(0, 10 - (protectionCoverage / 10));
    } else {
      protectionGapScore = 5;
      protectionCoverage = 15;
    }

    // COMPOSITE THREAT SCORE (0-100)
    const threatScore = 
      habitatLossScore + 
      populationDeclineScore + 
      climateChangeScore + 
      diseaseRiskScore + 
      protectionGapScore;

    // Threat category
    let threatCategory = 'Low';
    if (threatScore >= 75) threatCategory = 'Critical';
    else if (threatScore >= 50) threatCategory = 'High';
    else if (threatScore >= 25) threatCategory = 'Moderate';

    // Generate recommendations
    const recommendations = [];
    if (habitatLossScore > 15) recommendations.push('Urgent: Expand protected areas within species range');
    if (populationDeclineScore > 18) recommendations.push('Critical: Implement population management program');
    if (climateChangeScore > 15) recommendations.push('High priority: Climate refuge identification and corridor establishment');
    if (diseaseRiskScore > 10) recommendations.push('Monitor for disease outbreaks; establish health screening protocols');
    if (protectionGapScore > 7) recommendations.push('Identify and designate new protected areas');
    if (recommendations.length === 0) {
      recommendations.push('Monitor population trends; continue current conservation efforts');
    }

    return Response.json({
      status: 'success',
      data: {
        species_id: speciesId,
        scientific_name: scientificName,
        assessment_date: new Date().toISOString().split('T')[0],
        habitat_loss_percent: parseFloat(habitatLossPercent.toFixed(1)),
        habitat_loss_source: 'GBIF vs iNaturalist occurrence ratio',
        protected_area_coverage: parseFloat(protectionCoverage.toFixed(1)),
        population_trend: sp.population_trend || 'unknown',
        iucn_status: sp.iucn_status || 'DD',
        range_area_km2: sp.iucn_range_data_id ? 'Data available' : 'Unknown',
        occurrence_count: sp.gbif_occurrence_count || 0,
        threat_breakdown: {
          habitat_loss_score: parseFloat(habitatLossScore.toFixed(2)),
          population_decline_score: parseFloat(populationDeclineScore.toFixed(2)),
          climate_change_score: parseFloat(climateChangeScore.toFixed(2)),
          disease_risk_score: parseFloat(diseaseRiskScore.toFixed(2)),
          protection_gap_score: parseFloat(protectionGapScore.toFixed(2))
        },
        threat_score: parseFloat(threatScore.toFixed(1)),
        threat_category: threatCategory,
        recommendations: recommendations
      }
    });
  } catch (error) {
    console.error('Threat score calculation error:', error);
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
});