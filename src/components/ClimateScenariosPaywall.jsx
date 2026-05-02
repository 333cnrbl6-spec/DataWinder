import React from 'react';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import ProFeatureGate from '@/components/ProFeatureGate';

export default function ClimateScenariosPaywall({ children }) {
  return (
    <ProFeatureGate featureName="Climate Scenario Projections">
      {children}
    </ProFeatureGate>
  );
}