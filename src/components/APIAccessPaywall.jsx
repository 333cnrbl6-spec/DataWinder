import React from 'react';
import ProFeatureGate from '@/components/ProFeatureGate';

export default function APIAccessPaywall({ children }) {
  return (
    <ProFeatureGate featureName="REST API Access">
      {children}
    </ProFeatureGate>
  );
}