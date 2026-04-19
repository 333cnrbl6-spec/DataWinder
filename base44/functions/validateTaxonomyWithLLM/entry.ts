import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

/**
 * TAXONOMIC VALIDATION MODULE
 * 
 * Uses LLMs (Claude Opus 4.6) to cross-reference species records against:
 * - GBIF taxonomy
 * - NCBI taxonomy
 * - IUCN Red List
 * - Catalogue of Life
 * 
 * Flags potential errors:
 * - Taxonomic mismatches (synonyms, outdated names)
 * - Geographic inconsistencies (range violations)
 * - Data quality issues
 * - Confidence scoring
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      species_id,
      scientific_name,
      validate_taxonomy = true,
      validate_geography = true,
      include_suggestions = true
    } = await req.json();

    if (!species_id && !scientific_name) {
      return Response.json({ 
        error: 'species_id or scientific_name required' 
      }, { status: 400 });
    }

    // Fetch species record
    let species;
    if (species_id) {
      const allSpecies = await base44.entities.Species.list();
      species = allSpecies.find(s => s.id === species_id);
    } else {
      const allSpecies = await base44.entities.Species.list();
      species = allSpecies.find(s => s.scientific_name === scientific_name);
    }

    if (!species) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Perform validation
    const validationResults = {
      species_id: species.id,
      scientific_name: species.scientific_name,
      validation_timestamp: new Date().toISOString(),
      validator: 'LLM-powered Taxonomic Validator v1.0',
      taxonomy: validate_taxonomy ? await validateTaxonomy(species, base44) : null,
      geography: validate_geography ? await validateGeography(species, base44) : null,
      overall_confidence: 0,
      flags: [],
      suggestions: []
    };

    // Calculate overall confidence
    const scores = [];
    if (validationResults.taxonomy) {
      scores.push(validationResults.taxonomy.confidence_score);
    }
    if (validationResults.geography) {
      scores.push(validationResults.geography.confidence_score);
    }
    validationResults.overall_confidence = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    // Generate flags
    if (validationResults.taxonomy?.confidence_score < 0.7) {
      validationResults.flags.push({
        type: 'taxonomy',
        severity: validationResults.taxonomy.confidence_score < 0.5 ? 'error' : 'warning',
        message: `Low taxonomic confidence (${(validationResults.taxonomy.confidence_score * 100).toFixed(1)}%)`,
        field: 'scientific_name'
      });
    }

    if (validationResults.geography?.confidence_score < 0.7) {
      validationResults.flags.push({
        type: 'geography',
        severity: validationResults.geography.confidence_score < 0.5 ? 'error' : 'warning',
        message: `Geographic inconsistencies detected (${(validationResults.geography.confidence_score * 100).toFixed(1)}% confidence)`,
        field: 'geographic_distribution'
      });
    }

    // Save validation results
    const validationResult = await base44.entities.ValidationResult.create({
      species_id: species.id,
      species_name: species.scientific_name,
      validation_type: 'llm_cross_reference',
      overall_score: validationResults.overall_confidence,
      taxonomy_score: validationResults.taxonomy?.confidence_score || null,
      geography_score: validationResults.geography?.confidence_score || null,
      flags_count: validationResults.flags.length,
      error_count: validationResults.flags.filter(f => f.severity === 'error').length,
      warning_count: validationResults.flags.filter(f => f.severity === 'warning').length,
      validation_details: validationResults,
      validated_by: user.email,
      status: validationResults.overall_confidence < 0.5 ? 'failed' : validationResults.overall_confidence < 0.7 ? 'warning' : 'passed'
    });

    // Create validation flags for each issue
    for (const flag of validationResults.flags) {
      await base44.entities.ValidationFlag.create({
        occurrence_id: species.id,
        species_id: species.id,
        species_name: species.scientific_name,
        rule_id: 'llm_validation',
        rule_name: 'LLM Cross-Reference Validation',
        flag_type: flag.type,
        severity: flag.severity,
        message: flag.message,
        occurrence_data: { field: flag.field, original_value: species[flag.field] },
        status: 'flagged'
      });
    }

    return Response.json({
      success: true,
      validation_id: validationResult.id,
      results: validationResults,
      saved: true
    });

  } catch (error) {
    console.error('Taxonomic validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Validate taxonomy against global databases using LLM
 */
async function validateTaxonomy(species, base44) {
  // Gather existing data
  const taxonomicData = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    phylum: species.phylum,
    class_name: species.class_name,
    order_name: species.order_name,
    family: species.family,
    genus: species.genus,
    iucn_status: species.iucn_status,
    iucn_id: species.iucn_id,
    gbif_id: species.gbif_id,
    inat_taxon_id: species.inat_taxon_id
  };

  // Use LLM to cross-reference against global databases
  const prompt = `You are a taxonomic validation expert. Cross-reference this species record against global taxonomy databases (GBIF, NCBI, Catalogue of Life, IUCN).

SPECIES DATA:
${JSON.stringify(taxonomicData, null, 2)}

TASK:
1. Verify the scientific name is current and valid (not a synonym)
2. Check taxonomic classification (kingdom, phylum, class, order, family, genus)
3. Identify any discrepancies with GBIF, NCBI, or Catalogue of Life
4. Flag outdated names or reclassifications
5. Assess overall taxonomic confidence

Respond in this JSON format:
{
  "is_valid": boolean,
  "confidence_score": number (0-1),
  "current_name": "string (if different from provided)",
  "synonyms": ["array of known synonyms"],
  "taxonomic_issues": [
    {
      "field": "string",
      "issue": "string",
      "severity": "error|warning|info",
      "suggested_correction": "string"
    }
  ],
  "database_matches": {
    "gbif": { "matched": boolean, "gbif_id": "string", "notes": "string" },
    "ncbi": { "matched": boolean, "taxon_id": "string", "notes": "string" },
    "catalogue_of_life": { "matched": boolean, "notes": "string" },
    "iucn": { "matched": boolean, "iucn_id": "string", "notes": "string" }
  },
  "recommendations": ["array of suggestions"]
}`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          confidence_score: { type: "number" },
          current_name: { type: "string" },
          synonyms: { type: "array", items: { type: "string" } },
          taxonomic_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                issue: { type: "string" },
                severity: { type: "string", enum: ["error", "warning", "info"] },
                suggested_correction: { type: "string" }
              }
            }
          },
          database_matches: {
            type: "object",
            properties: {
              gbif: {
                type: "object",
                properties: {
                  matched: { type: "boolean" },
                  gbif_id: { type: "string" },
                  notes: { type: "string" }
                }
              },
              ncbi: {
                type: "object",
                properties: {
                  matched: { type: "boolean" },
                  taxon_id: { type: "string" },
                  notes: { type: "string" }
                }
              },
              catalogue_of_life: {
                type: "object",
                properties: {
                  matched: { type: "boolean" },
                  notes: { type: "string" }
                }
              },
              iucn: {
                type: "object",
                properties: {
                  matched: { type: "boolean" },
                  iucn_id: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["is_valid", "confidence_score", "database_matches"]
      },
      model: "claude_opus_4_6"
    });

    return response;
  } catch (error) {
    console.error('LLM taxonomy validation failed:', error);
    return {
      is_valid: false,
      confidence_score: 0,
      error: error.message,
      database_matches: {
        gbif: { matched: false, notes: 'Validation failed' },
        ncbi: { matched: false, notes: 'Validation failed' },
        catalogue_of_life: { matched: false, notes: 'Validation failed' },
        iucn: { matched: false, notes: 'Validation failed' }
      }
    };
  }
}

/**
 * Validate geographic distribution using LLM
 */
async function validateGeography(species, base44) {
  const geographicData = {
    scientific_name: species.scientific_name,
    geographic_distribution: species.geographic_distribution,
    range_description: species.range_description,
    habitat: species.habitat,
    country: species.country,
    latitude: species.latitude,
    longitude: species.longitude,
    iucn_status: species.iucn_status,
    threat_assessment: species.threat_assessment
  };

  const prompt = `You are a biogeography expert. Validate the geographic distribution of this species against known range data from IUCN, GBIF, and scientific literature.

SPECIES GEOGRAPHIC DATA:
${JSON.stringify(geographicData, null, 2)}

TASK:
1. Verify the reported geographic distribution matches known native range
2. Check for impossible locations (e.g., terrestrial species in ocean)
3. Identify potential coordinate errors
4. Flag introduced vs native range confusion
5. Assess habitat compatibility with geography
6. Check for range violations based on IUCN data

Respond in this JSON format:
{
  "is_valid": boolean,
  "confidence_score": number (0-1),
  "geographic_issues": [
    {
      "issue_type": "coordinate_error|range_violation|habitat_mismatch|introduced_confusion|other",
      "description": "string",
      "severity": "error|warning|info",
      "location": "string (lat/lon or region)",
      "suggested_correction": "string"
    }
  ],
  "native_range": {
    "continents": ["array"],
    "countries": ["array"],
    "coordinates": { "lat_min": number, "lat_max": number, "lon_min": number, "lon_max": number }
  },
  "habitat_compatibility": {
    "score": number (0-1),
    "notes": "string"
  },
  "recommendations": ["array of suggestions"]
}`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          confidence_score: { type: "number" },
          geographic_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue_type: { type: "string" },
                description: { type: "string" },
                severity: { type: "string", enum: ["error", "warning", "info"] },
                location: { type: "string" },
                suggested_correction: { type: "string" }
              }
            }
          },
          native_range: {
            type: "object",
            properties: {
              continents: { type: "array", items: { type: "string" } },
              countries: { type: "array", items: { type: "string" } },
              coordinates: {
                type: "object",
                properties: {
                  lat_min: { type: "number" },
                  lat_max: { type: "number" },
                  lon_min: { type: "number" },
                  lon_max: { type: "number" }
                }
              }
            }
          },
          habitat_compatibility: {
            type: "object",
            properties: {
              score: { type: "number" },
              notes: { type: "string" }
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["is_valid", "confidence_score", "geographic_issues"]
      },
      model: "claude_opus_4_6"
    });

    return response;
  } catch (error) {
    console.error('LLM geography validation failed:', error);
    return {
      is_valid: false,
      confidence_score: 0,
      error: error.message,
      geographic_issues: [],
      native_range: { continents: [], countries: [] },
      habitat_compatibility: { score: 0, notes: 'Validation failed' }
    };
  }
}