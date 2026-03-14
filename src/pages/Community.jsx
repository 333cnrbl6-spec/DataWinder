import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, MapPin, FlaskConical, Star, Rocket, Globe, Mail } from 'lucide-react';

const TIER_STYLES = {
  'Founding Member': 'bg-bangor-sun/20 text-yellow-700 border-bangor-sun/40',
  'Beta Tester':     'bg-purple-100 text-purple-700 border-purple-200',
  'Standard':        'bg-slate-100 text-slate-600 border-slate-200',
};

const TIER_ICONS = {
  'Founding Member': Star,
  'Beta Tester':     Rocket,
  'Standard':        Users,
};

export default function Community() {
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('All');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['community_members'],
    queryFn: () => base44.entities.CommunityMember.filter({ share_profile: true }, '-created_date', 200),
  });

  const fields = ['All', ...Array.from(new Set(members.map(m => m.field_of_interest).filter(Boolean))).sort()];

  const filtered = members.filter(m => {
    const matchesSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.institution?.toLowerCase().includes(search.toLowerCase()) ||
      m.country?.toLowerCase().includes(search.toLowerCase()) ||
      m.field_of_interest?.toLowerCase().includes(search.toLowerCase());
    const matchesField = fieldFilter === 'All' || m.field_of_interest === fieldFilter;
    return matchesSearch && matchesField;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-bangor-red/10 rounded-2xl mb-2">
            <Users className="w-7 h-7 text-bangor-red" />
          </div>
          <h1 className="text-3xl font-bold text-bangor-red">DataWinder Community</h1>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A growing network of researchers, conservationists and biodiversity enthusiasts from around the world.
            Members shape the future of DataWinder together.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-bangor-red" />{members.length} public members</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-bangor-red" />{Array.from(new Set(members.map(m => m.country).filter(Boolean))).length} countries</span>
            <span className="flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-bangor-red" />{Array.from(new Set(members.map(m => m.field_of_interest).filter(Boolean))).length} fields</span>
          </div>
        </div>

        {/* Membership CTA banner */}
        <div className="bg-gradient-to-r from-bangor-red to-bangor-red/80 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-lg font-bold">Become a Founding Member — Free</p>
            <p className="text-sm text-white/85">
              Help shape the development of DataWinder. Get early access to new features, connect with the community, and contribute your expertise.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-2 text-sm font-medium">
              <Star className="w-4 h-4 text-bangor-sun" /> Free lifetime access
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-2 text-sm font-medium">
              <Rocket className="w-4 h-4 text-bangor-sun" /> Early feature access
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-bangor-sun" /> Shape the roadmap
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {fields.slice(0, 8).map(f => (
              <button
                key={f}
                onClick={() => setFieldFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  fieldFilter === f ? 'bg-bangor-red text-white border-bangor-red' : 'border-slate-200 text-slate-600 hover:border-bangor-red/40'
                }`}
              >
                {f}
              </button>
            ))}
            {fields.length > 8 && (
              <span className="px-3 py-1.5 text-xs text-slate-400">+{fields.length - 8} more fields</span>
            )}
          </div>
        </div>

        {/* Member grid */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No members found{search ? ' matching your search' : ''}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => {
              const TierIcon = TIER_ICONS[member.membership_tier] || Users;
              return (
                <Card key={member.id} className="hover:shadow-md transition-shadow border-slate-200">
                  <CardContent className="p-5 space-y-3">
                    {/* Name + tier */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{member.full_name}</p>
                        {member.institution && (
                          <p className="text-xs text-slate-500 mt-0.5">{member.institution}</p>
                        )}
                      </div>
                      <Badge className={`text-xs border shrink-0 ${TIER_STYLES[member.membership_tier] || TIER_STYLES['Standard']}`}>
                        <TierIcon className="w-3 h-3 mr-1" />
                        {member.membership_tier || 'Standard'}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5">
                      {member.field_of_interest && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <FlaskConical className="w-3.5 h-3.5 text-bangor-red shrink-0" />
                          {member.field_of_interest}
                        </div>
                      )}
                      {member.country && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {member.country}
                        </div>
                      )}
                    </div>

                    {/* Goals snippet */}
                    {member.app_goals && (
                      <p className="text-xs text-slate-500 italic line-clamp-2 border-t border-slate-100 pt-2">
                        "{member.app_goals}"
                      </p>
                    )}

                    {/* Beta tester badge */}
                    {member.beta_tester && (
                      <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <Rocket className="w-3 h-3" /> Beta Tester
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}