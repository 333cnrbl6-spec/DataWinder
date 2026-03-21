import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RecommendationsList({ recommendations, threatCategory }) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getIcon = (rec) => {
    if (rec.includes('Urgent') || rec.includes('Critical')) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else if (rec.includes('High priority')) {
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    } else {
      return <Lightbulb className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriority = (rec) => {
    if (rec.includes('Urgent') || rec.includes('Critical')) return 'Critical';
    if (rec.includes('High priority')) return 'High';
    return 'Standard';
  };

  const sortedRecs = [...recommendations].sort((a, b) => {
    const priorityOrder = { Critical: 0, High: 1, Standard: 2 };
    return priorityOrder[getPriority(a)] - priorityOrder[getPriority(b)];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Conservation Recommendations</CardTitle>
        <CardDescription>
          Priority actions based on threat assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedRecs.map((rec, idx) => {
          const priority = getPriority(rec);
          const priorityColor = {
            Critical: 'bg-red-50 border-red-200',
            High: 'bg-orange-50 border-orange-200',
            Standard: 'bg-blue-50 border-blue-200'
          }[priority];

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border-2 ${priorityColor} flex gap-3`}
            >
              {getIcon(rec)}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {rec}
                </p>
                <div className="mt-2">
                  <Badge 
                    variant={priority === 'Critical' ? 'destructive' : priority === 'High' ? 'outline' : 'secondary'}
                    className="text-xs"
                  >
                    {priority} Priority
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}