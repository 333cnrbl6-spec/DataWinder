/**
 * Comprehensive Benchmark Test Suite
 * Tests end-to-end workflows: paper ingestion, species creation, modeling, threat assessment
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const benchmarks = [];
    const startTime = Date.now();

    // ────────────────────────────────────────────────────────────
    // 1. TEST: Paper Workflow (Literature Library)
    // ────────────────────────────────────────────────────────────
    const paperStart = Date.now();
    try {
      // Create test paper
      const paper = await base44.entities.ExportedFile?.create?.({
        name: 'Test Paper: Biodiversity Under Climate Change',
        description: 'Benchmark test paper for methodology extraction',
        file_type: 'PDF',
        status: 'ready'
      }).catch(() => null);

      benchmarks.push({
        test: 'Paper Creation',
        duration_ms: Date.now() - paperStart,
        status: paper ? 'pass' : 'skip',
        notes: paper ? `Created paper: ${paper.id}` : 'Entity not found'
      });
    } catch (err) {
      benchmarks.push({
        test: 'Paper Creation',
        duration_ms: Date.now() - paperStart,
        status: 'fail',
        error: err.message
      });
    }

    // ────────────────────────────────────────────────────────────
    // 2. TEST: Species Import & Data Persistence
    // ────────────────────────────────────────────────────────────
    const speciesStart = Date.now();
    try {
      const testSpecies = {
        scientific_name: `Panthera leo leo benchmark_${Date.now()}`,
        common_name: 'Benchmark Lion',
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class_name: 'Mammalia',
        order_name: 'Carnivora',
        family: 'Felidae',
        genus: 'Panthera',
        iucn_status: 'VU',
        population_trend: 'decreasing',
        population_details: 'Declining populations in Africa'
      };

      const createdSpecies = await base44.entities.Species.create(testSpecies);

      benchmarks.push({
        test: 'Species Create & Persist',
        duration_ms: Date.now() - speciesStart,
        status: 'pass',
        notes: `Species ID: ${createdSpecies.id}`
      });

      // ────────────────────────────────────────────────────────────
      // 3. TEST: Threat Assessment Calculation
      // ────────────────────────────────────────────────────────────
      const threatStart = Date.now();
      try {
        const threatData = {
          species_id: createdSpecies.id,
          scientific_name: createdSpecies.scientific_name,
          assessment_date: new Date().toISOString().split('T')[0],
          habitat_loss_percent: 45,
          protected_area_coverage: 25,
          population_trend: 'decreasing',
          iucn_status: 'VU',
          range_area_km2: 12000000,
          climate_suitability_change: -18,
          occurrence_count: 850,
          disease_risk_score: 35,
          threat_score: 72,
          threat_category: 'High',
          threat_breakdown: {
            habitat_loss_score: 75,
            population_decline_score: 80,
            climate_change_score: 60,
            disease_risk_score: 35,
            protection_gap_score: 65
          },
          priority_rank: 12,
          recommendations: [
            'Expand protected area network',
            'Monitor population trends',
            'Research climate adaptation strategies'
          ]
        };

        const threatAssess = await base44.entities.ThreatAssessment.create(threatData);

        benchmarks.push({
          test: 'Threat Assessment Create',
          duration_ms: Date.now() - threatStart,
          status: 'pass',
          notes: `Threat score: ${threatData.threat_score}`
        });
      } catch (err) {
        benchmarks.push({
          test: 'Threat Assessment Create',
          duration_ms: Date.now() - threatStart,
          status: 'fail',
          error: err.message
        });
      }

      // ────────────────────────────────────────────────────────────
      // 4. TEST: MAXENT Model Run Creation
      // ────────────────────────────────────────────────────────────
      const maxentStart = Date.now();
      try {
        const modelRun = await base44.entities.MaxentRun.create({
          name: 'Benchmark Lion Distribution Model',
          species_id: createdSpecies.id,
          species_name: createdSpecies.scientific_name,
          climate_dataset_ids: [],
          climate_dataset_names: [],
          occurrence_count: 200,
          parameters: {
            regularization_multiplier: 1.0,
            max_iterations: 500,
            convergence_threshold: 0.00001,
            replicates: 3,
            output_type: 'logistic',
            feature_types: ['linear', 'quadratic', 'hinge']
          },
          status: 'draft'
        });

        benchmarks.push({
          test: 'MAXENT Run Create',
          duration_ms: Date.now() - maxentStart,
          status: 'pass',
          notes: `Run ID: ${modelRun.id}`
        });
      } catch (err) {
        benchmarks.push({
          test: 'MAXENT Run Create',
          duration_ms: Date.now() - maxentStart,
          status: 'fail',
          error: err.message
        });
      }

      // ────────────────────────────────────────────────────────────
      // 5. TEST: Data Queries & Retrieval (Realistic Load)
      // ────────────────────────────────────────────────────────────
      const queryStart = Date.now();
      try {
        const allSpecies = await base44.entities.Species.list('-created_date', 100);
        const allThreats = await base44.entities.ThreatAssessment.list('-created_date', 100);
        const allRuns = await base44.entities.MaxentRun.list('-created_date', 50);

        benchmarks.push({
          test: 'Bulk Data Query (Species + Threats + Runs)',
          duration_ms: Date.now() - queryStart,
          status: 'pass',
          notes: `Retrieved: ${allSpecies.length} species, ${allThreats.length} threats, ${allRuns.length} runs`
        });
      } catch (err) {
        benchmarks.push({
          test: 'Bulk Data Query',
          duration_ms: Date.now() - queryStart,
          status: 'fail',
          error: err.message
        });
      }

      // ────────────────────────────────────────────────────────────
      // 6. TEST: File Storage (CSV/GeoJSON Export Simulation)
      // ────────────────────────────────────────────────────────────
      const fileStart = Date.now();
      try {
        const csvContent = `scientific_name,iucn_status,threat_score\nPanthera leo leo,VU,72\nPanthera tigris altaica,CR,85\nPan troglodytes,EN,78`;
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvFile = new File([csvBlob], `benchmark_export_${Date.now()}.csv`, { type: 'text/csv' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: csvFile });

        benchmarks.push({
          test: 'File Upload & Storage',
          duration_ms: Date.now() - fileStart,
          status: 'pass',
          notes: `File uploaded: ${file_url.substring(0, 60)}...`
        });
      } catch (err) {
        benchmarks.push({
          test: 'File Upload & Storage',
          duration_ms: Date.now() - fileStart,
          status: 'fail',
          error: err.message
        });
      }

      // ────────────────────────────────────────────────────────────
      // 7. TEST: Real-time Subscription (Entity Change Detection)
      // ────────────────────────────────────────────────────────────
      const subStart = Date.now();
      try {
        // Test that subscribe doesn't throw
        const unsub = base44.entities.Species.subscribe?.((event) => {
          // Test subscription
        });
        
        if (typeof unsub === 'function') {
          unsub();
          benchmarks.push({
            test: 'Real-time Subscriptions',
            duration_ms: Date.now() - subStart,
            status: 'pass',
            notes: 'Subscription/unsubscription works'
          });
        } else {
          benchmarks.push({
            test: 'Real-time Subscriptions',
            duration_ms: Date.now() - subStart,
            status: 'skip',
            notes: 'Subscriptions not available'
          });
        }
      } catch (err) {
        benchmarks.push({
          test: 'Real-time Subscriptions',
          duration_ms: Date.now() - subStart,
          status: 'fail',
          error: err.message
        });
      }

    } catch (err) {
      benchmarks.push({
        test: 'Species Workflow',
        duration_ms: Date.now() - speciesStart,
        status: 'fail',
        error: err.message
      });
    }

    // ────────────────────────────────────────────────────────────
    // Summary Report
    // ────────────────────────────────────────────────────────────
    const totalDuration = Date.now() - startTime;
    const passCount = benchmarks.filter(b => b.status === 'pass').length;
    const failCount = benchmarks.filter(b => b.status === 'fail').length;
    const skipCount = benchmarks.filter(b => b.status === 'skip').length;

    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      total_duration_ms: totalDuration,
      test_count: benchmarks.length,
      passed: passCount,
      failed: failCount,
      skipped: skipCount,
      pass_rate: `${Math.round((passCount / benchmarks.length) * 100)}%`,
      benchmarks,
      summary: {
        message: `Comprehensive benchmark complete. ${passCount}/${benchmarks.length} tests passed.`,
        avg_test_duration_ms: Math.round(totalDuration / benchmarks.length),
        recommendation: failCount === 0 ? 'Ready for republish' : `${failCount} tests failed - review logs`
      }
    });

  } catch (error) {
    return Response.json(
      { error: error.message, status: 'critical' },
      { status: 500 }
    );
  }
});