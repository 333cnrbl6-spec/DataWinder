import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, Binoculars, ChevronLeft, Loader } from 'lucide-react';
import { format } from 'date-fns';

export default function SurveyDetail() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  // Fetch survey
  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () =>
      base44.entities.Survey.filter({ id: surveyId }).then(s => s[0]),
    enabled: !!surveyId
  });

  // Fetch occurrences for this survey
  const { data: occurrences = [] } = useQuery({
    queryKey: ['survey-occurrences', surveyId],
    queryFn: () =>
      base44.entities.Occurrence.filter(
        { survey_id: surveyId },
        '-observation_date',
        100
      ),
    enabled: !!surveyId
  });

  // Fetch species info for occurrences
  const { data: speciesMap = {} } = useQuery({
    queryKey: ['survey-species', surveyId],
    queryFn: async () => {
      const speciesIds = [...new Set(occurrences.map(o => o.species_id).filter(Boolean))];
      if (speciesIds.length === 0) return {};
      
      const speciesData = await Promise.all(
        speciesIds.map(id => base44.entities.Species.filter({ id }).then(s => s[0]))
      );
      
      const map = {};
      speciesData.forEach(s => {
        if (s) map[s.id] = s;
      });
      return map;
    },
    enabled: occurrences.length > 0
  });

  const statusColor = {
    planning: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-slate-100 text-slate-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const habitatLabels = {
    woodland: '🌲 Woodland',
    wetland: '💧 Wetland',
    coastal: '🌊 Coastal',
    grassland: '🌾 Grassland',
    urban: '🏙️ Urban',
    agricultural: '🌾 Agricultural',
    mixed: '🌈 Mixed',
  };

  if (surveyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-600 mb-4">Survey not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const uniqueSpecies = [...new Set(occurrences.map(o => o.species_id))].length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{survey.name}</h1>
          <p className="text-slate-600 mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {survey.location}
          </p>
        </div>

        {/* Status & Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className={statusColor[survey.status] || ''}>
            {survey.status?.charAt(0).toUpperCase() + survey.status?.slice(1)}
          </Badge>
          {survey.habitat_type && (
            <Badge variant="outline">
              {habitatLabels[survey.habitat_type] || survey.habitat_type}
            </Badge>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 mb-1">Records</p>
              <p className="text-2xl font-bold text-bangor-red">{occurrences.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 mb-1">Species</p>
              <p className="text-2xl font-bold text-blue-600">{uniqueSpecies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 mb-1">Team Members</p>
              <p className="text-2xl font-bold text-green-600">{(survey.team_members || []).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 mb-1">Duration</p>
              <p className="text-xs font-medium text-slate-700 mt-2">
                {survey.start_date && format(new Date(survey.start_date), 'MMM d')}
                {survey.end_date && ` - ${format(new Date(survey.end_date), 'MMM d, yy')}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Survey Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {survey.description && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Description</p>
                <p className="text-sm text-slate-600">{survey.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </p>
                <p className="text-sm text-slate-600">
                  {survey.start_date ? format(new Date(survey.start_date), 'PPP') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  End Date
                </p>
                <p className="text-sm text-slate-600">
                  {survey.end_date ? format(new Date(survey.end_date), 'PPP') : 'Ongoing'}
                </p>
              </div>
              {survey.latitude && survey.longitude && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Coordinates
                  </p>
                  <p className="text-sm text-slate-600">
                    {survey.latitude.toFixed(4)}, {survey.longitude.toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        {survey.team_members && survey.team_members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {survey.team_members.map((member, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-600">{member.email}</p>
                    {member.role && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Occurrences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Binoculars className="w-5 h-5" />
              Recorded Observations ({occurrences.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {occurrences.length === 0 ? (
              <p className="text-sm text-slate-600 italic">No observations recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {occurrences.map((occ) => {
                  const species = speciesMap[occ.species_id];
                  return (
                    <div key={occ.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-slate-900">
                            {occ.species_name}
                          </p>
                          {species?.common_name && (
                            <p className="text-xs text-slate-600 italic">
                              {species.common_name}
                            </p>
                          )}
                        </div>
                        {occ.conservation_status && (
                          <Badge variant="outline" className="text-xs">
                            {occ.conservation_status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {occ.latitude?.toFixed(4)}, {occ.longitude?.toFixed(4)}
                        </p>
                        {occ.observation_date && (
                          <p>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(new Date(occ.observation_date), 'PPP')}
                          </p>
                        )}
                        {occ.observer_name && (
                          <p className="text-slate-500">Observer: {occ.observer_name}</p>
                        )}
                      </div>
                      {occ.notes && (
                        <p className="text-xs text-slate-600 mt-2 italic">"{occ.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}