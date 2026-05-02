import React from 'react';
import ProFeatureGate from '@/components/ProFeatureGate';

export default function EnsembleSDMPaywall({ children }) {
  return (
    <ProFeatureGate featureName="Ensemble SDM Models">
      {children}
    </ProFeatureGate>
  );
}