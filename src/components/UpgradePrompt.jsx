import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function UpgradePrompt({ feature = 'This feature' }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
        <div className="p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-bangor-red/20">
            <Zap className="w-6 h-6 text-bangor-red" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Pro Feature</h2>
            <p className="text-slate-400">{feature} is only available on the Pro plan.</p>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2 text-left">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-bangor-red">Pro Plan includes:</span>
            </p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>✓ Unlimited projects & occurrences</li>
              <li>✓ Advanced SDM modeling</li>
              <li>✓ Climate scenario projections</li>
              <li>✓ Ensemble models & exports</li>
              <li>✓ REST API access</li>
              <li>✓ Priority support</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Link to="/Pricing" className="block">
              <Button className="w-full bg-bangor-red hover:bg-bangor-red/90">
                Upgrade to Pro
              </Button>
            </Link>
            <Link to="/ResearcherDashboard" className="block">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            New users get 14 days of Pro access free.
          </p>
        </div>
      </Card>
    </div>
  );
}