/**
 * useDataSources — Extracted multi-source data fetching logic
 * Handles iNaturalist, GBIF, and SpeciesLink enrichment for Home.jsx
 * Extracted from Home.jsx to eliminate 300+ lines of duplicated logic
 */

import { base44 } from '@/api/base44Client';
import { buildOccurrenceCSV } from '@/lib/fileStorageManager';

// ── Shared CSV builder & uploader ────────────────────────────────────────────

const buildAndUploadCSV = async (rows, columns, filename) => {
  const csv = buildOccurrenceCSV(rows, columns);
  if (!csv) return null;
  try {
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    return file_uri;
  } catch (e) {
    console.warn(`CSV upload failed for ${filename}:`, e.message);
    return null;
  }
};

const inatObsColumns = ['latitude', 'longitude', 'location', 'observed_on', 'user', 'photo_url'];
const gbifColumns = ['latitude', 'longitude', 'location', 'date', 'basis_of_record', 'institution', 'catalog_number'];
const slColumns = ['latitude', 'longitude', 'location', 'date', 'basis_of_record', 'institution', 'collection', 'catalog_number', 'recorded_by', 'type_status'];

// ── iNaturalist ───────────────────────────────────────────────────────────────

const fetchInatTaxa = async (term, level) => {
  // For higher-order searches, look up parent taxon first then get species within it
  if (level !== 'species') {
    try {
      const parentRes = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&rank=${level}&per_page=1`);
      if (parentRes.ok) {
        const parentData = await parentRes.json();
        if (parentData.results?.[0]) {
          const parentId = parentData.results[0].id;
          const speciesRes = await fetch(`https://api.inaturalist.org/v1/taxa?taxon_id=${parentId}&rank=species&per_page=60`);
          if (speciesRes.ok) {
            const speciesData = await speciesRes.json();
            if (speciesData.results?.length > 0) return speciesData.results;
          }
        }
      }
    } catch (e) {
      console.warn('iNat parent taxon lookup failed, falling back to text search');
    }
  }
  // Fallback: text search
  const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&rank=species&per_page=300`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
};

const fetchInatObservations = async (taxonId) => {
  const res = await fetch(
    `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&per_page=200&order=desc&order_by=created_at&quality_grade=research`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter(obs => obs.location)
    .map(obs => ({
      latitude: parseFloat(obs.location.split(',')[0]),
      longitude: parseFloat(obs.location.split(',')[1]),
      location: obs.place_guess || '',
      observed_on: obs.observed_on,
      user: obs.user?.login || 'Unknown',
      photo_url: obs.photos?.[0]?.url || ''
    }));
};

export const enrichWithINaturalist = async (speciesName, level, terms, allSpeciesMap) => {
  const taxaToProcess = speciesName
    // Single-species enrichment mode
    ? await (async () => {
        const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(speciesName)}&rank=species`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results?.slice(0, 1) || [];
      })()
    : [];

  const termList = speciesName ? [speciesName] : terms;

  for (const term of termList) {
    try {
      const taxa = speciesName ? taxaToProcess : await fetchInatTaxa(term, level);
      if (!taxa.length) { console.warn(`No iNat taxa for ${term}`); continue; }

      for (const taxon of taxa.slice(0, 300)) {
        const observations = await fetchInatObservations(taxon.id);
        const csvUri = await buildAndUploadCSV(
          observations, inatObsColumns,
          `${taxon.name.replace(/ /g, '_')}_inat_observations.csv`
        );

        const inatData = {
          inat_taxon_id: taxon.id,
          inat_wikipedia_url: taxon.wikipedia_url || null,
          observation_count: taxon.observations_count || 0,
          observations,
          last_observed: observations[0]?.observed_on || null,
          inat_observations_csv_file_uri: csvUri,
          image_url: taxon.default_photo?.medium_url || null,
        };

        if (allSpeciesMap[taxon.name]) {
          allSpeciesMap[taxon.name] = {
            ...allSpeciesMap[taxon.name],
            ...inatData,
            data_source: allSpeciesMap[taxon.name].data_source
              ? `${allSpeciesMap[taxon.name].data_source} + iNaturalist`
              : 'iNaturalist',
            image_url: allSpeciesMap[taxon.name].image_url || inatData.image_url,
          };
        } else {
          allSpeciesMap[taxon.name] = {
            id: `inat-${taxon.id}`,
            scientific_name: taxon.name,
            common_name: taxon.preferred_common_name || '',
            iucn_status: 'NE',
            ...inatData,
            data_source: 'iNaturalist',
            dataset_name: term,
          };
        }
      }
    } catch (err) {
      console.error(`iNaturalist error for ${term}:`, err);
    }
  }
};

// ── GBIF ─────────────────────────────────────────────────────────────────────

const mergeGBIFIntoMap = async (gbifData, allSpeciesMap, terms) => {
  const csvUri = gbifData.gbif_occurrences?.length > 0
    ? await buildAndUploadCSV(gbifData.gbif_occurrences, gbifColumns,
        `${gbifData.scientific_name.replace(/ /g, '_')}_gbif_occurrences.csv`)
    : null;

  const gbifFields = {
    gbif_id: gbifData.gbif_id,
    gbif_occurrence_count: gbifData.gbif_occurrence_count,
    gbif_occurrences: gbifData.gbif_occurrences,
    gbif_basis_of_record: gbifData.gbif_basis_of_record,
    gbif_last_occurrence: gbifData.gbif_last_occurrence,
    gbif_occurrences_csv_file_uri: csvUri,
  };

  if (allSpeciesMap[gbifData.scientific_name]) {
    const existing = allSpeciesMap[gbifData.scientific_name];
    allSpeciesMap[gbifData.scientific_name] = {
      ...existing,
      ...gbifFields,
      data_source: existing.data_source ? `${existing.data_source} + GBIF` : 'GBIF',
    };
  } else {
    allSpeciesMap[gbifData.scientific_name] = {
      id: `gbif-${gbifData.gbif_id}`,
      scientific_name: gbifData.scientific_name,
      common_name: gbifData.common_name || '',
      kingdom: gbifData.kingdom, phylum: gbifData.phylum,
      class_name: gbifData.class_name, order_name: gbifData.order_name,
      family: gbifData.family, genus: gbifData.genus,
      iucn_status: 'NE',
      ...gbifFields,
      data_source: 'GBIF',
      dataset_name: terms.join(', '),
    };
  }
};

export const enrichWithGBIF = async (level, terms, allSpeciesMap) => {
  const isHigherTaxon = level && level !== 'species';
  const searchTargets = isHigherTaxon
    ? terms
    : Object.keys(allSpeciesMap).length > 0 ? Object.keys(allSpeciesMap) : terms.filter(t => t.trim());

  for (const target of searchTargets) {
    try {
      const result = await base44.functions.invoke('fetchGBIFData', {
        scientificName: target.trim(),
        level: isHigherTaxon ? level : 'species',
      });
      if (result?.data?.status !== 'success') continue;

      const gbifList = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
      for (const gbifData of gbifList) {
        await mergeGBIFIntoMap(gbifData, allSpeciesMap, terms);
      }
    } catch (err) {
      console.error(`GBIF error for ${target}:`, err);
    }
  }
};

// ── SpeciesLink ───────────────────────────────────────────────────────────────

export const enrichWithSpeciesLink = async (apiKey, terms, allSpeciesMap) => {
  const namesToSearch = Object.keys(allSpeciesMap).length > 0
    ? Object.keys(allSpeciesMap)
    : terms.filter(t => t.trim());

  for (const name of namesToSearch) {
    try {
      const result = await base44.functions.invoke('fetchSpeciesLinkData', {
        scientificName: name, apiKey, limit: 200
      });
      if (result.data?.status !== 'success') continue;

      const slData = result.data.data;
      const csvUri = slData.specieslink_occurrences?.length > 0
        ? await buildAndUploadCSV(slData.specieslink_occurrences, slColumns,
            `${name.replace(/ /g, '_')}_specieslink.csv`)
        : null;

      const slFields = {
        specieslink_occurrence_count: slData.specieslink_occurrence_count,
        specieslink_occurrences: slData.specieslink_occurrences,
        specieslink_last_collected: slData.specieslink_last_collected,
        specieslink_occurrences_csv_file_uri: csvUri,
      };

      if (allSpeciesMap[name]) {
        allSpeciesMap[name] = {
          ...allSpeciesMap[name],
          ...slFields,
          data_source: allSpeciesMap[name].data_source
            ? `${allSpeciesMap[name].data_source} + speciesLink`
            : 'speciesLink',
        };
      } else {
        allSpeciesMap[name] = {
          id: `specieslink-${name}`,
          scientific_name: name,
          common_name: '',
          iucn_status: 'NE',
          ...slFields,
          data_source: 'speciesLink',
          dataset_name: terms.join(', '),
        };
      }
    } catch (err) {
      console.error(`SpeciesLink error for ${name}:`, err);
    }
  }
};

// ── DB Persistence ────────────────────────────────────────────────────────────

export const persistNonIUCNSpecies = async (allSpeciesMap) => {
  for (const sp of Object.values(allSpeciesMap)) {
    if (sp.data_source === 'IUCN Red List') continue;
    try {
      const existing = await base44.entities.Species.filter({ scientific_name: sp.scientific_name });
      if (existing.length > 0) {
        const updates = {};
        if (sp.inat_taxon_id && !existing[0].inat_taxon_id) {
          Object.assign(updates, {
            inat_taxon_id: sp.inat_taxon_id, observation_count: sp.observation_count,
            observations: sp.observations, last_observed: sp.last_observed,
            inat_observations_csv_file_uri: sp.inat_observations_csv_file_uri,
          });
        }
        if (sp.gbif_id && !existing[0].gbif_id) {
          Object.assign(updates, {
            gbif_id: sp.gbif_id, gbif_occurrence_count: sp.gbif_occurrence_count,
            gbif_occurrences: sp.gbif_occurrences, gbif_basis_of_record: sp.gbif_basis_of_record,
            gbif_last_occurrence: sp.gbif_last_occurrence,
            gbif_occurrences_csv_file_uri: sp.gbif_occurrences_csv_file_uri,
          });
        }
        if (sp.specieslink_occurrence_count && !existing[0].specieslink_occurrence_count) {
          Object.assign(updates, {
            specieslink_occurrence_count: sp.specieslink_occurrence_count,
            specieslink_occurrences: sp.specieslink_occurrences,
            specieslink_last_collected: sp.specieslink_last_collected,
            specieslink_occurrences_csv_file_uri: sp.specieslink_occurrences_csv_file_uri,
          });
        }
        if (!existing[0].image_url && sp.image_url) updates.image_url = sp.image_url;
        if (Object.keys(updates).length > 0) {
          await base44.entities.Species.update(existing[0].id, updates);
        }
      } else {
        await base44.entities.Species.create({
          scientific_name: sp.scientific_name,
          common_name: sp.common_name || '',
          kingdom: sp.kingdom || '', phylum: sp.phylum || '',
          class_name: sp.class_name || '', order_name: sp.order_name || '',
          family: sp.family || '', genus: sp.genus || '',
          iucn_status: sp.iucn_status || 'NE',
          inat_taxon_id: sp.inat_taxon_id || null,
          inat_wikipedia_url: sp.inat_wikipedia_url || null,
          observation_count: sp.observation_count || 0,
          observations: sp.observations || [],
          last_observed: sp.last_observed || null,
          inat_observations_csv_file_uri: sp.inat_observations_csv_file_uri || null,
          gbif_id: sp.gbif_id || null,
          gbif_occurrence_count: sp.gbif_occurrence_count || 0,
          gbif_occurrences: sp.gbif_occurrences || [],
          gbif_basis_of_record: sp.gbif_basis_of_record || null,
          gbif_last_occurrence: sp.gbif_last_occurrence || null,
          gbif_occurrences_csv_file_uri: sp.gbif_occurrences_csv_file_uri || null,
          specieslink_occurrence_count: sp.specieslink_occurrence_count || 0,
          specieslink_occurrences: sp.specieslink_occurrences || [],
          specieslink_last_collected: sp.specieslink_last_collected || null,
          specieslink_occurrences_csv_file_uri: sp.specieslink_occurrences_csv_file_uri || null,
          image_url: sp.image_url || null,
        });
      }
    } catch (e) {
      console.error(`Error persisting ${sp.scientific_name}:`, e.message);
    }
  }
};

// ── Single-species iNat enrichment (for enrich button on cards) ───────────────

export const enrichSingleSpeciesWithINat = async (species) => {
  const taxonRes = await fetch(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(species.scientific_name)}&rank=species`
  );
  if (!taxonRes.ok) throw new Error('Failed to fetch iNaturalist data');

  const taxonData = await taxonRes.json();
  if (!taxonData.results?.length) throw new Error(`No iNaturalist data found for ${species.scientific_name}`);

  const taxon = taxonData.results[0];
  const observations = await fetchInatObservations(taxon.id);
  const csvUri = await buildAndUploadCSV(
    observations, inatObsColumns,
    `${species.scientific_name.replace(/ /g, '_')}_inat_observations.csv`
  );

  return {
    inat_taxon_id: taxon.id,
    inat_wikipedia_url: taxon.wikipedia_url || null,
    observation_count: taxon.observations_count || 0,
    observations,
    last_observed: observations[0]?.observed_on || null,
    inat_observations_csv_file_uri: csvUri,
    ...(!species.common_name && taxon.preferred_common_name ? { common_name: taxon.preferred_common_name } : {}),
    ...(!species.image_url && taxon.default_photo?.medium_url ? { image_url: taxon.default_photo.medium_url } : {}),
  };
};