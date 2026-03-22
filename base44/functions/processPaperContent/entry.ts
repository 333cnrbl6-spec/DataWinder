import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_url, title, authors, year, journal, doi } = await req.json();

        if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

        // Use LLM with the PDF to extract structured methods & results
        const extractionPrompt = `You are an expert in Species Distribution Modelling (SDM) and ecological research.

Analyse this research paper PDF and extract the following structured information:

1. **Methods Summary** - What SDM/ecological methods were used? (e.g. MaxEnt, GLM, bioclimatic variables, occurrence data sources, spatial resolution, model validation approach)
2. **Key Results** - What were the main quantitative findings? (AUC values, habitat areas, percentage changes, key variables, species affected)
3. **Species Studied** - List all species mentioned with their scientific names
4. **Climate/Environmental Variables Used** - List bioclimatic variables (e.g. Bio1, Bio12), datasets (WorldClim, CHELSA), and spatial resolutions
5. **Occurrence Data Sources** - Where did they get occurrence records? (GBIF, iNaturalist, museum collections, etc.) and how many records?
6. **Replicability Score** - Rate 1-10 how replicable this is using MaxEnt + WorldClim + GBIF/iNaturalist + IUCN data
7. **Replication Steps** - Concrete numbered steps to replicate this in DataWinder
8. **Key Limitations** - What are the stated limitations of the study?

Return a JSON object with these exact keys:
- methods_summary (string)
- key_results (string)
- species_studied (array of {scientific_name, common_name})
- climate_variables (array of strings)
- occurrence_sources (array of strings)
- replicability_score (number 1-10)
- replication_steps (array of strings)
- key_limitations (string)
- paper_type (string: one of "SDM", "Conservation", "Ecology", "Phylogenetics", "Review", "Other")`;

        const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: extractionPrompt,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    methods_summary: { type: "string" },
                    key_results: { type: "string" },
                    species_studied: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                scientific_name: { type: "string" },
                                common_name: { type: "string" }
                            }
                        }
                    },
                    climate_variables: { type: "array", items: { type: "string" } },
                    occurrence_sources: { type: "array", items: { type: "string" } },
                    replicability_score: { type: "number" },
                    replication_steps: { type: "array", items: { type: "string" } },
                    key_limitations: { type: "string" },
                    paper_type: { type: "string" }
                }
            }
        });

        return Response.json({
            status: "success",
            title: title || "Untitled Paper",
            authors: authors || "",
            year: year || null,
            journal: journal || "",
            doi: doi || "",
            file_url,
            ...extracted
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});