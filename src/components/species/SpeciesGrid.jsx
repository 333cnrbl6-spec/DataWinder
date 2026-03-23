import React from 'react';
import SpeciesCard from './SpeciesCard';
import { motion } from 'framer-motion';

export default function SpeciesGrid({ species, selectedIds, onSelect, onEnrichWithINaturalist, onDelete }) {
  if (!species || species.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 xs:gap-3 md:gap-4"
    >
      {species.map((sp, index) => (
        <SpeciesCard
          key={sp.id || sp.scientific_name}
          species={sp}
          selected={selectedIds.includes(sp.id || sp.scientific_name)}
          onSelect={onSelect}
          onEnrichWithINaturalist={onEnrichWithINaturalist}
          index={index}
        />
      ))}
    </motion.div>
  );
}