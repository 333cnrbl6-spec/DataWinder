import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Similarity scoring for species names (Levenshtein-like)
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length < 3 || s2.length < 3) return 0;
  
  // Simple substring matching for common variations
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Check if first 3 chars match (genus level)
  if (s1.substring(0, 3) === s2.substring(0, 3)) return 0.7;
  
  return 0;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { scientific_names } = await req.json();
    if (!scientific_names || !Array.isArray(scientific_names)) {
      return Response.json({ error: 'Missing scientific_names array' }, { status: 400 });
    }

    const duplicates = [];
    const seen = {};

    for (let i = 0; i < scientific_names.length; i++) {
      const name1 = scientific_names[i];
      
      for (let j = i + 1; j < scientific_names.length; j++) {
        const name2 = scientific_names[j];
        const similarity = calculateSimilarity(name1, name2);
        
        // Flag potential duplicates (similarity > 0.7)
        if (similarity > 0.7) {
          duplicates.push({
            species_1: name1,
            species_2: name2,
            similarity_score: similarity,
            recommendation: similarity === 1 ? 'DEFINITE_DUPLICATE' : 'REVIEW_REQUIRED'
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      total_species: scientific_names.length,
      potential_duplicates: duplicates.length,
      duplicates: duplicates,
      message: duplicates.length > 0 ? `Found ${duplicates.length} potential duplicate(s)` : 'No duplicates detected'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});