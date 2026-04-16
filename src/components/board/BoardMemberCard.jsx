import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } = '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, CheckCircle } from 'lucide-react';

export default function BoardMemberCard({ member }) {
  if (!member) return null;

  return (
    <Card className="border-2 border-bangor-red/20 hover:border-bangor-red/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-bangor-red">{member.member_name}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{member.app_name}</p>
          </div>
          {member.active && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">Role</p>
          </div>
          <p className="text-sm text-slate-700">{member.role}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">Expertise</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {member.expertise?.map((exp, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {exp}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">Authority</p>
          </div>
          <ul className="text-xs text-slate-600 space-y-0.5">
            {member.decision_authority?.slice(0, 3).map((auth, idx) => (
              <li key={idx}>• {auth}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}