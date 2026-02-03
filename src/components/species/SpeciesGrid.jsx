import React from 'react';
import SpeciesCard from './SpeciesCard';
import { motion } from 'framer-motion';

export default function SpeciesGrid({ species, selectedIds, onSelect }) {
  if (!species || species.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {species.map((sp, index) => (
        <SpeciesCard
          key={sp.id || sp.scientific_name}
          species={sp}
          selected={selectedIds.includes(sp.id || sp.scientific_name)}
          onSelect={onSelect}
          index={index}
        />
      ))}
    </motion.div>
  );
}