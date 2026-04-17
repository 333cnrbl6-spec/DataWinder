import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const IUCN_STATUSES = [
  { value: 'all', label: 'All Species', color: 'bg-slate-200' },
  { value: 'CR', label: 'Critically Endangered', color: 'bg-red-600' },
  { value: 'EN', label: 'Endangered', color: 'bg-red-500' },
  { value: 'VU', label: 'Vulnerable', color: 'bg-orange-500' },
  { value: 'NT', label: 'Near Threatened', color: 'bg-yellow-500' },
  { value: 'LC', label: 'Least Concern', color: 'bg-green-500' },
  { value: 'DD', label: 'Data Deficient', color: 'bg-slate-400' },
];

export default function ConservationStatusFilter({ selectedStatus, onStatusChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter by Conservation Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {IUCN_STATUSES.map((status) => (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`flex items-center justify-center px-3 py-2 rounded-lg font-semibold text-white text-xs transition-all ${
                selectedStatus === status.value
                  ? `${status.color} ring-2 ring-offset-2 ring-slate-800`
                  : `${status.color} opacity-60 hover:opacity-100`
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}