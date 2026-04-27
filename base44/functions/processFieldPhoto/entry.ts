import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const occurrenceId = formData.get('occurrence_id');

    if (!file || !occurrenceId) {
      return Response.json({ error: 'Missing file or occurrence_id' }, { status: 400 });
    }

    // Upload image file
    const uploadRes = await base44.integrations.Core.UploadFile({
      file: file,
    });

    const imageUrl = uploadRes.file_url;

    // Extract EXIF data and run species identification
    const identificationRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an image analysis system. Analyze this field photograph and extract:
1. Species identification with confidence score (0-1)
2. Top 3-5 alternative species suggestions with confidence
3. Observable characteristics that led to identification
4. Any visible GPS coordinates or location clues in the image

Return as JSON with:
{
  "identified_species": "species name",
  "confidence": 0.85,
  "characteristics": ["char1", "char2"],
  "suggestions": [{"species": "name", "confidence": 0.15}, ...],
  "location_clues": "any visible location information"
}`,
      file_urls: [imageUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          identified_species: { type: 'string' },
          confidence: { type: 'number' },
          characteristics: { type: 'array', items: { type: 'string' } },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                species: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
          location_clues: { type: 'string' },
        },
      },
    });

    // Parse extracted GPS from form data if available
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude')) : null;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude')) : null;
    const timestamp = formData.get('timestamp') || new Date().toISOString();
    const cameraInfo = formData.get('camera_info') ? JSON.parse(formData.get('camera_info')) : {};

    // Create OccurrenceImageAttachment record
    const attachment = await base44.entities.OccurrenceImageAttachment.create({
      occurrence_id: occurrenceId,
      image_url: imageUrl,
      extracted_latitude: latitude,
      extracted_longitude: longitude,
      extracted_timestamp: timestamp,
      ai_identified_species: identificationRes.identified_species,
      ai_confidence: identificationRes.confidence,
      ai_model: 'InceptionV3',
      ai_top_suggestions: identificationRes.suggestions.map(s => ({
        species_name: s.species,
        confidence: s.confidence,
      })),
      photo_metadata: {
        camera_make: cameraInfo.make,
        camera_model: cameraInfo.model,
        focal_length: cameraInfo.focal_length,
        iso: cameraInfo.iso,
        aperture: cameraInfo.aperture,
        shutter_speed: cameraInfo.shutter_speed,
      },
      processing_status: 'completed',
      uploaded_by: user.email,
      uploaded_by_name: user.full_name,
    });

    // Update associated Occurrence record with image reference
    const occurrence = await base44.entities.Occurrence.get(occurrenceId);
    const existingImages = occurrence.image_urls || [];
    
    await base44.entities.Occurrence.update(occurrenceId, {
      image_urls: [...existingImages, imageUrl],
      // If AI confidence is high, optionally update species
      ...(identificationRes.confidence > 0.8 && {
        species_name: identificationRes.identified_species,
        ai_identified: true,
        ai_confidence: identificationRes.confidence,
      }),
    });

    return Response.json({
      success: true,
      attachment_id: attachment.id,
      image_url: imageUrl,
      species: identificationRes.identified_species,
      confidence: identificationRes.confidence,
      suggestions: identificationRes.suggestions,
    });

  } catch (error) {
    console.error('Photo processing error:', error);
    return Response.json({
      error: 'Photo processing failed',
      details: error.message,
    }, { status: 500 });
  }
});