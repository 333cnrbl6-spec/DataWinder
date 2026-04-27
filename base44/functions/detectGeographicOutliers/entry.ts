import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { species_ids = [], z_threshold = 2.5 } = body;

    if (!species_ids || species_ids.length === 0) {
      return Response.json(
        { error: 'species_ids required' },
        { status: 400 }
      );
    }

    const results = [];

    // Process each species
    for (const speciesId of species_ids) {
      const occurrences = await base44.entities.Occurrence.filter({
        species_id: speciesId
      }, '-observation_date', 1000);

      if (occurrences.length === 0) continue;

      // Extract numeric values for Z-score calculation
      const latitudes = occurrences.map(o => o.latitude).filter(v => v !== null && v !== undefined);
      const longitudes = occurrences.map(o => o.longitude).filter(v => v !== null && v !== undefined);

      if (latitudes.length < 3 || longitudes.length < 3) {
        // Not enough data for meaningful outlier detection
        results.push({
          species_id: speciesId,
          total_records: occurrences.length,
          outliers: [],
          message: 'Insufficient records for outlier detection'
        });
        continue;
      }

      // Calculate mean and standard deviation
      const calculateStats = (values) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        return { mean, std };
      };

      const latStats = calculateStats(latitudes);
      const lonStats = calculateStats(longitudes);

      // Calculate Z-scores and identify outliers
      const outliers = [];
      occurrences.forEach((occurrence) => {
        const outlierFlags = [];
        let isOutlier = false;

        // Geographic outliers
        if (occurrence.latitude !== null && occurrence.latitude !== undefined) {
          const latZScore = Math.abs(
            (occurrence.latitude - latStats.mean) / (latStats.std || 1)
          );
          if (latZScore > z_threshold) {
            outlierFlags.push({
              type: 'latitude_outlier',
              z_score: latZScore.toFixed(2),
              value: occurrence.latitude,
              threshold: z_threshold
            });
            isOutlier = true;
          }
        }

        if (occurrence.longitude !== null && occurrence.longitude !== undefined) {
          const lonZScore = Math.abs(
            (occurrence.longitude - lonStats.mean) / (lonStats.std || 1)
          );
          if (lonZScore > z_threshold) {
            outlierFlags.push({
              type: 'longitude_outlier',
              z_score: lonZScore.toFixed(2),
              value: occurrence.longitude,
              threshold: z_threshold
            });
            isOutlier = true;
          }
        }

        // Temporal outliers (if observation_date exists)
        if (occurrence.observation_date) {
          const dates = occurrences
            .map(o => o.observation_date)
            .filter(d => d)
            .map(d => new Date(d).getTime());
          
          if (dates.length > 2) {
            const dateStats = calculateStats(dates);
            const dateValue = new Date(occurrence.observation_date).getTime();
            const dateZScore = Math.abs((dateValue - dateStats.mean) / (dateStats.std || 1));
            
            if (dateZScore > z_threshold) {
              outlierFlags.push({
                type: 'temporal_outlier',
                z_score: dateZScore.toFixed(2),
                value: occurrence.observation_date,
                threshold: z_threshold
              });
              isOutlier = true;
            }
          }
        }

        if (isOutlier) {
          outliers.push({
            occurrence_id: occurrence.id,
            species_name: occurrence.species_name,
            latitude: occurrence.latitude,
            longitude: occurrence.longitude,
            observation_date: occurrence.observation_date,
            outlier_flags: outlierFlags,
            observer_name: occurrence.observer_name,
            notes: occurrence.notes
          });
        }
      });

      results.push({
        species_id: speciesId,
        total_records: occurrences.length,
        outliers_count: outliers.length,
        outlier_percentage: ((outliers.length / occurrences.length) * 100).toFixed(1),
        outliers: outliers.slice(0, 50), // Return first 50 for display
        clean_records_count: occurrences.length - outliers.length
      });
    }

    return Response.json({
      success: true,
      z_threshold,
      results,
      timestamp: new Date().toISOString(),
      summary: {
        total_species: results.length,
        total_outliers: results.reduce((sum, r) => sum + r.outliers_count, 0),
        total_records: results.reduce((sum, r) => sum + r.total_records, 0)
      }
    });

  } catch (error) {
    console.error('Outlier detection error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});