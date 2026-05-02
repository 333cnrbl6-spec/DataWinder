import React from 'react';
import ProFeatureGate from '@/components/ProFeatureGate';

export default function ShapefileExportPaywall({ children }) {
  return (
    <ProFeatureGate featureName="Shapefile Export">
      {children}
    </ProFeatureGate>
  );
}