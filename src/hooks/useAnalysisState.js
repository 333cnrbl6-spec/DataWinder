import { useState } from 'react';

export function useAnalysisState() {
  const [analysisResults, setAnalysisResults] = useState([]);

  const addResult = (result) => {
    setAnalysisResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setAnalysisResults([]);
  };

  return {
    analysisResults,
    addResult,
    clearResults
  };
}