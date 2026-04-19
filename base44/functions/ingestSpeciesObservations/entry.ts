import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
import { parse } from 'npm:csv-parse@5.5.0';
import JSZip from 'npm:jszip@3.10.1';

/**
 * DARWIN CORE ARCHIVE & CSV INGESTION MODULE
 * 
 * Parses and validates species observation files:
 * - CSV files (simple format)
 * - Darwin Core Archives (DwC-A) - ZIP with CSV + metadata
 * 
 * Automatic validation:
 * - Taxonomic checks
 * - Geographic validation
 * - Data quality scoring
 * - Duplicate detection
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    const autoValidate = formData.get('autoValidate') === 'true';
    const projectId = formData.get('projectId');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to bytes
    const fileBytes = await file.arrayBuffer();
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    let parsedData = [];
    let metadata = {};

    // Parse based on file type
    if (fileExtension === 'zip') {
      // Darwin Core Archive
      const result = await parseDarwinCoreArchive(fileBytes, base44);
      parsedData = result.observations;
      metadata = result.metadata;
    } else if (fileExtension === 'csv') {
      // CSV file
      const csvText = await new TextDecoder().decode(fileBytes);
      parsedData = await parseCSV(csvText, base44);
    } else {
      return Response.json({ 
        error: 'Unsupported file format. Use CSV or Darwin Core Archive (ZIP)' 
      }, { status: 400 });
    }

    if (parsedData.length === 0) {
      return Response.json({ 
        error: 'No valid observations found in file' 
      }, { status: 400 });
    }

    // Validate and transform data
    const validationResult = await validateObservations(parsedData, base44, autoValidate);

    // Create species records
    const createdSpecies = [];
    const errors = [];

    for (const observation of validationResult.validated) {
      try {
        // Check for existing species
        const existingSpecies = await findOrCreateSpecies(observation, base44);
        createdSpecies.push(existingSpecies);

        // Create occurrence record if coordinates exist
        if (observation.decimalLatitude && observation.decimalLongitude) {
          await base44.entities.OccurrenceNote.create({
            species_id: existingSpecies.id,
            species_name: existingSpecies.scientific_name,
            latitude: observation.decimalLatitude,
            longitude: observation.decimalLongitude,
            source: 'Imported from ' + fileName,
            occurrence_date: observation.eventDate || new Date().toISOString().split('T')[0],
            validation_status: autoValidate ? 'unreviewed' : 'valid',
            tags: ['imported', projectId || 'unspecified']
          });
        }
      } catch (error) {
        errors.push({
          observation: observation.scientificName || 'Unknown',
          error: error.message
        });
      }
    }

    // Log the import
    const importLog = await base44.entities.ImportLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      entity_type: 'Species',
      file_name: fileName,
      record_count: createdSpecies.length,
      record_ids: createdSpecies.map(s => s.id),
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      validation_details: {
        total_records: parsedData.length,
        valid_records: validationResult.validated.length,
        invalid_records: validationResult.invalid.length,
        auto_validated: autoValidate,
        project_id: projectId
      }
    });

    return Response.json({
      success: true,
      import_id: importLog.id,
      summary: {
        total_records: parsedData.length,
        created_species: createdSpecies.length,
        errors: errors.length,
        validation_warnings: validationResult.invalid.length
      },
      created_species: createdSpecies.slice(0, 10), // Return first 10
      errors: errors.slice(0, 20), // Return first 20 errors
      metadata
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Parse Darwin Core Archive (ZIP file)
 */
async function parseDarwinCoreArchive(fileBytes, base44) {
  const zip = await JSZip.loadAsync(fileBytes);
  const observations = [];
  const metadata = {};

  // Find and parse metadata file
  const metadataFile = Object.keys(zip.files).find(f => 
    f.toLowerCase().includes('meta.xml') || f.toLowerCase().includes('eml.xml')
  );
  
  if (metadataFile) {
    const metaContent = await zip.files[metadataFile].async('text');
    metadata.xml = metaContent;
    // Extract basic metadata (can be enhanced with XML parser)
    metadata.extracted = extractDarwinCoreMetadata(metaContent);
  }

  // Find and parse occurrence data file
  const dataFile = Object.keys(zip.files).find(f => 
    f.toLowerCase().endsWith('.csv') && !f.toLowerCase().includes('meta')
  );

  if (dataFile) {
    const csvContent = await zip.files[dataFile].async('text');
    const parsed = await parseCSV(csvContent, base44);
    observations.push(...parsed);
  }

  return { observations, metadata };
}

/**
 * Extract Darwin Core Archive metadata
 */
function extractDarwinCoreMetadata(xmlContent) {
  // Simple XML parsing (can be enhanced with proper XML parser)
  const metadata = {
    title: extractXmlTag(xmlContent, 'title'),
    creator: extractXmlTag(xmlContent, 'creator'),
    description: extractXmlTag(xmlContent, 'description'),
    contact: extractXmlTag(xmlContent, 'contact'),
    pubDate: extractXmlTag(xmlContent, 'pubDate'),
    keywords: extractXmlTag(xmlContent, 'keyword')
  };

  return metadata;
}

function extractXmlTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * Parse CSV file
 */
async function parseCSV(csvText, base44) {
  return new Promise((resolve, reject) => {
    const records = [];
    
    parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    .on('readable', function() {
      let record;
      while ((record = this.read()) !== null) {
        // Map CSV columns to Darwin Core terms
        const mapped = mapToDarwinCore(record);
        if (mapped.scientificName || mapped.verbatimIdentification) {
          records.push(mapped);
        }
      }
    })
    .on('error', reject)
    .on('end', () => resolve(records));
  });
}

/**
 * Map CSV columns to Darwin Core standard terms
 */
function mapToDarwinCore(record) {
  const mapping = {
    // Taxonomy
    scientificName: ['scientificname', 'scientific_name', 'species', 'taxon', 'genus_species'],
    commonName: ['commonname', 'common_name', 'vernacularname', 'vernacular_name'],
    kingdom: ['kingdom'],
    phylum: ['phylum'],
    class: ['class', 'class_name'],
    order: ['order', 'order_name'],
    family: ['family'],
    genus: ['genus'],
    specificEpithet: ['specificepithet', 'specific_epithet'],

    // Location
    decimalLatitude: ['decimallatitude', 'decimal_latitude', 'latitude', 'lat'],
    decimalLongitude: ['decimallongitude', 'decimal_longitude', 'longitude', 'lon', 'lng'],
    coordinateUncertaintyInMeters: ['coordinateuncertaintyinmeters', 'coordinate_uncertainty_in_meters', 'uncertainty'],
    country: ['country', 'countrycode'],
    stateProvince: ['stateprovince', 'state_province', 'state', 'province'],
    locality: ['locality', 'location'],

    // Event
    eventDate: ['eventdate', 'event_date', 'date', 'observationdate', 'observation_date'],
    year: ['year'],
    month: ['month'],
    day: ['day'],

    // Record
    basisOfRecord: ['basisofrecord', 'basis_of_record', 'record_type'],
    occurrenceID: ['occurrenceid', 'occurrence_id', 'id', 'record_id'],
    catalogNumber: ['catalognumber', 'catalog_number', 'catalognum', 'catalog_num'],
    recordedBy: ['recordedby', 'recorded_by', 'collector', 'observer'],

    // Additional
    individualCount: ['individualcount', 'individual_count', 'count', 'abundance'],
    lifeStage: ['lifestage', 'life_stage', 'stage'],
    sex: ['sex', 'gender'],
    establishmentMeans: ['establishmentmeans', 'establishment_means', 'introduction_status']
  };

  const mapped = {};
  
  for (const [dwcTerm, possibleColumns] of Object.entries(mapping)) {
    for (const column of possibleColumns) {
      const value = record[column];
      if (value !== undefined && value !== null && value !== '') {
        mapped[dwcTerm] = value;
        break;
      }
    }
  }

  // Handle verbatim identification if no scientific name
  if (!mapped.scientificName && (record.identification || record.species)) {
    mapped.verbatimIdentification = record.identification || record.species;
  }

  return mapped;
}

/**
 * Validate observations
 */
async function validateObservations(observations, base44, autoValidate) {
  const validated = [];
  const invalid = [];

  for (const obs of observations) {
    const issues = [];

    // Check required fields
    if (!obs.scientificName && !obs.verbatimIdentification) {
      issues.push({
        field: 'scientificName',
        severity: 'error',
        message: 'Missing scientific name or identification'
      });
    }

    // Validate coordinates if present
    if (obs.decimalLatitude !== undefined) {
      const lat = parseFloat(obs.decimalLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        issues.push({
          field: 'decimalLatitude',
          severity: 'error',
          message: `Invalid latitude: ${obs.decimalLatitude}`
        });
      }
    }

    if (obs.decimalLongitude !== undefined) {
      const lon = parseFloat(obs.decimalLongitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        issues.push({
          field: 'decimalLongitude',
          severity: 'error',
          message: `Invalid longitude: ${obs.decimalLongitude}`
        });
      }
    }

    // Validate date if present
    if (obs.eventDate) {
      const date = new Date(obs.eventDate);
      if (isNaN(date.getTime())) {
        issues.push({
          field: 'eventDate',
          severity: 'warning',
          message: `Invalid date format: ${obs.eventDate}`
        });
      }
    }

    // Check for duplicates (simple check)
    if (obs.scientificName) {
      const existingSpecies = await base44.entities.Species.filter({
        scientific_name: obs.scientificName
      });
      
      if (existingSpecies.length > 0) {
        issues.push({
          field: 'scientificName',
          severity: 'info',
          message: 'Species already exists in database'
        });
      }
    }

    if (issues.filter(i => i.severity === 'error').length === 0) {
      validated.push({
        ...obs,
        validation_issues: issues,
        validation_score: calculateValidationScore(obs, issues)
      });
    } else {
      invalid.push({
        ...obs,
        validation_issues: issues
      });
    }
  }

  return { validated, invalid };
}

/**
 * Calculate validation score (0-1)
 */
function calculateValidationScore(observation, issues) {
  let score = 1.0;

  // Penalties for missing important fields
  if (!observation.decimalLatitude || !observation.decimalLongitude) score -= 0.1;
  if (!observation.eventDate) score -= 0.1;
  if (!observation.country) score -= 0.05;
  if (!observation.basisOfRecord) score -= 0.05;

  // Penalties for validation issues
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 0.3;
    if (issue.severity === 'warning') score -= 0.15;
    if (issue.severity === 'info') score -= 0.05;
  });

  return Math.max(0, Math.min(1, score));
}

/**
 * Find existing species or create new one
 */
async function findOrCreateSpecies(observation, base44) {
  const scientificName = observation.scientificName || observation.verbatimIdentification;
  
  if (!scientificName) {
    throw new Error('Cannot create species without name');
  }

  // Try to find existing species
  const existing = await base44.entities.Species.filter({
    scientific_name: scientificName
  });

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new species record
  const newSpecies = {
    scientific_name: scientificName,
    common_name: observation.commonName || null,
    kingdom: observation.kingdom || null,
    phylum: observation.phylum || null,
    class_name: observation.class || null,
    order_name: observation.order || null,
    family: observation.family || null,
    genus: observation.genus || null,
    country: observation.country || null,
    geographic_distribution: observation.locality || observation.stateProvince || null
  };

  const created = await base44.entities.Species.create(newSpecies);
  return created;
}