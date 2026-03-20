import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function FamilyHealthCard({ family, stats, onSelect, isSelected }) {
  const duplicationLevel = stats.duplicationRatio > 3 ? 'high' : stats.duplicationRatio > 1.5 ? 'medium' : 'low';
  const statusColor = duplicationLevel === 'high' ? 'text-red-600' : duplicationLevel === 'medium' ? 'text-amber-600' : 'text-green-600';
  const statusIcon = duplicationLevel === 'high' ? AlertTriangle : CheckCircle2;
  const StatusIcon = statusIcon;

  return (
    <Card 
      onClick={onSelect}
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-bangor-red border-bangor-red' : 'hover:shadow-md'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base italic">{family}</CardTitle>
          </div>
          <StatusIcon className={`w-5 h-5 ${statusColor}`} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-slate-500 font-medium">Records</p>
            <p className="text-lg font-bold text-slate-900">{stats.recordCount}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Unique Species</p>
            <p className="text-lg font-bold text-slate-900">{stats.uniqueSpecies}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Duplication</p>
            <p className="text-lg font-bold text-slate-900">{stats.duplicationRatio}x</p>
          </div>
        </div>

        <div>
          <Badge 
            className={`${
              duplicationLevel === 'high' ? 'bg-red-100 text-red-700' :
              duplicationLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}
          >
            {duplicationLevel === 'high' ? 'High Duplication' :
             duplicationLevel === 'medium' ? 'Medium Duplication' :
             'Clean'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}