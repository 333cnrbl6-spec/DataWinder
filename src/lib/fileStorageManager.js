/**
 * File Storage Manager with Safety Limits
 * Prevents storage overflow and enforces size constraints
 */

const FILE_SIZE_LIMITS = {
  CSV: 50 * 1024 * 1024, // 50MB
  JSON: 30 * 1024 * 1024, // 30MB
  GeoJSON: 100 * 1024 * 1024, // 100MB
  default: 25 * 1024 * 1024 // 25MB
};

const MAX_OCCURRENCES_PER_FILE = 50000; // Prevent massive CSV files

/**
 * Estimate file size before upload
 */
const estimateFileSize = (content, type = 'json') => {
  if (typeof content === 'string') {
    return new Blob([content]).size;
  }
  if (typeof content === 'object') {
    return new Blob([JSON.stringify(content)]).size;
  }
  return content.size || 0;
};

/**
 * Check if file size is within limits
 */
const isFileSizeValid = (content, fileType = 'default') => {
  const size = estimateFileSize(content);
  const limit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
  return size <= limit;
};

/**
 * Chunk CSV data to prevent oversized files
 * Returns array of CSV strings, each under size limit
 */
const chunkCSVData = (occurrences, filename, maxOccurrencesPerChunk = MAX_OCCURRENCES_PER_FILE) => {
  if (occurrences.length <= maxOccurrencesPerChunk) {
    return [occurrences];
  }

  const chunks = [];
  for (let i = 0; i < occurrences.length; i += maxOccurrencesPerChunk) {
    chunks.push(occurrences.slice(i, i + maxOccurrencesPerChunk));
  }
  return chunks;
};

/**
 * Build CSV with column validation
 */
const buildOccurrenceCSV = (occurrences, columns = ['latitude', 'longitude', 'date']) => {
  if (occurrences.length === 0) return null;

  // Ensure all required columns exist in occurrences
  const headers = columns.filter(col => 
    occurrences.some(o => o[col] !== undefined && o[col] !== null)
  );
  
  if (headers.length === 0) return null;

  const csvLines = [headers.join(',')];
  
  for (const occ of occurrences) {
    const values = headers.map(col => {
      const val = occ[col] ?? '';
      // Escape quotes and wrap in quotes if contains comma/newline
      const stringVal = String(val);
      return stringVal.includes(',') || stringVal.includes('\n') 
        ? `"${stringVal.replace(/"/g, '""')}"` 
        : stringVal;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
};

/**
 * Safe file upload with size validation
 */
const safeUploadFile = async (base44, content, filename, fileType = 'default') => {
  try {
    // Check size before uploading
    if (!isFileSizeValid(content, fileType)) {
      const size = estimateFileSize(content);
      const limit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
      throw new Error(
        `File exceeds size limit. ${(size / 1024 / 1024).toFixed(2)}MB > ${(limit / 1024 / 1024).toFixed(0)}MB`
      );
    }

    const blob = new Blob([content], { type: 'application/octet-stream' });
    const file = new File([blob], filename, { type: 'application/octet-stream' });
    
    const result = await base44.integrations.Core.UploadPrivateFile({ file });
    return result.file_uri;
  } catch (error) {
    console.error(`File upload failed for ${filename}:`, error.message);
    throw error;
  }
};

export {
  FILE_SIZE_LIMITS,
  MAX_OCCURRENCES_PER_FILE,
  estimateFileSize,
  isFileSizeValid,
  chunkCSVData,
  buildOccurrenceCSV,
  safeUploadFile
};