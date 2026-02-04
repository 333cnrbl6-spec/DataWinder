export default async function fetchIUCNData({ level, term, endpoint, iucnToken }) {
  // Validate inputs
  if (!iucnToken) {
    return { 
      status: 'error', 
      message: 'IUCN API token is required' 
    };
  }

  try {
    // Build the appropriate IUCN API URL based on endpoint type
    let url;
    
    if (endpoint === 'taxa') {
      // For taxonomic searches
      url = `https://apiv4.iucnredlist.org/api/v4/taxa/${level}/${encodeURIComponent(term)}?token=${iucnToken}`;
    } else if (endpoint === 'assessment') {
      // For assessment details
      url = `https://apiv4.iucnredlist.org/api/v4/assessment/${term}?token=${iucnToken}`;
    } else if (endpoint === 'habitats') {
      // For habitats
      url = `https://apiv4.iucnredlist.org/api/v4/habitats/${term}?token=${iucnToken}`;
    } else if (endpoint === 'threats') {
      // For threats
      url = `https://apiv4.iucnredlist.org/api/v4/threats/${term}?token=${iucnToken}`;
    } else if (endpoint === 'range') {
      // For range data
      url = `https://apiv4.iucnredlist.org/api/v4/assessment/${term}/range?token=${iucnToken}`;
    } else if (endpoint === 'countries') {
      // For countries list
      url = `https://apiv4.iucnredlist.org/api/v4/countries/?token=${iucnToken}`;
    } else if (endpoint === 'scientific_name') {
      // For scientific name search
      const parts = term.split(' ');
      const genus = parts[0];
      const species = parts[1] || '';
      url = `https://apiv4.iucnredlist.org/api/v4/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}&token=${iucnToken}`;
    } else {
      return {
        status: 'error',
        message: 'Invalid endpoint type'
      };
    }

    // Make the request to IUCN API
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`IUCN API error:`, response.status, errorText);
      
      if (response.status === 401) {
        return {
          status: 'error',
          message: 'IUCN API token is invalid or expired',
          statusCode: 401
        };
      }
      
      return {
        status: 'error',
        message: `IUCN API returned status ${response.status}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    
    return {
      status: 'success',
      data: data
    };

  } catch (error) {
    console.error('Error fetching IUCN data:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to fetch IUCN data'
    };
  }
}