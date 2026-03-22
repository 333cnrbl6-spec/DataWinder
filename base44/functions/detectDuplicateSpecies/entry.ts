import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Enhanced similarity scoring with phonetic matching
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length < 3 || s2.length < 3) return 0;
  
  // Exact substring match
  if (s1.includes(s2) || s2.includes(s1)) return 0.95;
  
  // Check genus (first word) match
  const genus1 = s1.split(' ')[0];
  const genus2 = s2.split(' ')[0];
  if (genus1 === genus2) {
    // Same genus - check if species epithet is similar
    const species1 = s1.split(' ').slice(1).join(' ');
    const species2 = s2.split(' ').slice(1).join(' ');
    if (species1.substring(0, 3) === species2.substring(0, 3)) return 0.85;
    return 0.7;
  }
  
  // Levenshtein distance for name variations
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity > 0.8 ? similarity : 0;
};

// Levenshtein distance algorithm
const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { scientific_names, threshold = 0.8 } = await req.json();
    if (!scientific_names || !Array.isArray(scientific_names)) {
      return Response.json({ error: 'Missing scientific_names array' }, { status: 400 });
    }

    const duplicates = [];
    const grouped = {};

    // Detect duplicates and group them
    for (let i = 0; i < scientific_names.length; i++) {
      const name1 = scientific_names[i];
      let foundGroup = false;
      
      for (let j = i + 1; j < scientific_names.length; j++) {
        const name2 = scientific_names[j];
        const similarity = calculateSimilarity(name1, name2);
        
        // Flag potential duplicates with configurable threshold (default 0.8)
        if (similarity >= threshold) {
          const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
          if (!grouped[key]) {
            grouped[key] = [name1];
          }
          if (!grouped[key].includes(name2)) {
            grouped[key].push(name2);
          }
          
          duplicates.push({
            name_1: name1,
            name_2: name2,
            similarity_score: parseFloat(similarity.toFixed(3)),
            recommendation: similarity === 1 ? 'DEFINITE_DUPLICATE' : 'REVIEW_REQUIRED'
          });
          
          foundGroup = true;
        }
      }
    }

    // Convert to group review format
    const reviewGroups = Object.entries(grouped).map(([key, names]) => ({
      review_group_id: `dup-${key}-${Date.now()}`,
      duplicate_species_ids: names,
      ai_analysis: {
        reason: `Potential duplicate species names detected with high similarity`,
        confidence: Math.round(
          duplicates
            .filter(d => names.includes(d.name_1) || names.includes(d.name_2))
            .reduce((sum, d) => sum + d.similarity_score, 0) / duplicates.length * 100
        ),
        suggested_canonical_id: names[0],
        merge_recommendations: {
          keep_primary: names[0],
          merge_from: names.slice(1)
        }
      }
    }));

    return Response.json({
      status: 'success',
      total_species: scientific_names.length,
      potential_duplicates: duplicates.length,
      duplicate_groups: reviewGroups.length,
      duplicates: duplicates,
      review_groups: reviewGroups,
      message: duplicates.length > 0 
        ? `Found ${duplicates.length} potential duplicate pairs (${reviewGroups.length} groups)` 
        : 'No duplicates detected'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});