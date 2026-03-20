import React, { createContext, useContext, useState } from 'react';

const SpeciesContext = createContext(null);

export function SpeciesProvider({ children }) {
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  return (
    <SpeciesContext.Provider value={{ selectedSpecies, setSelectedSpecies }}>
      {children}
    </SpeciesContext.Provider>
  );
}

export function useSpecies() {
  const context = useContext(SpeciesContext);
  if (!context) {
    throw new Error('useSpecies must be used within SpeciesProvider');
  }
  return context;
}