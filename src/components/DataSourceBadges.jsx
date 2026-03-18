import React from 'react';

const SOURCES = [
  {
    name: 'IUCN Red List',
    short: 'IUCN',
    url: 'https://www.iucnredlist.org',
    color: '#004B2D',
    favicon: 'iucnredlist.org'
  },
  {
    name: 'iNaturalist',
    short: 'iNat',
    url: 'https://www.inaturalist.org',
    color: '#74AC00',
    favicon: 'inaturalist.org'
  },
  {
    name: 'GBIF',
    short: 'GBIF',
    url: 'https://www.gbif.org',
    color: '#2D7D46',
    favicon: 'gbif.org'
  },
  {
    name: 'ESRI ArcGIS',
    short: 'ESRI',
    url: 'https://www.esri.com',
    color: '#0077C0',
    favicon: 'esri.com'
  },
  {
    name: 'MaxEnt',
    short: 'MaxEnt',
    url: 'https://biodiversityinformatics.amnh.org/open_source/maxent/',
    color: '#6A1FA2',
    favicon: 'amnh.org'
  },
  {
    name: 'WorldClim',
    short: 'WorldClim',
    url: 'https://www.worldclim.org',
    color: '#1565C0',
    favicon: 'worldclim.org'
  },
];

const COMING_SOON = [
  {
    name: 'OBIS',
    short: 'OBIS',
    url: 'https://obis.org',
    color: '#5B7FA6',
    favicon: 'obis.org'
  },
  {
    name: 'AquaMaps',
    short: 'AquaMaps',
    url: 'https://www.aquamaps.org',
    color: '#1A6B8A',
    favicon: 'aquamaps.org'
  },
  {
    name: 'eBird',
    short: 'eBird',
    url: 'https://ebird.org',
    color: '#B85C2A',
    favicon: 'ebird.org'
  },
];

export default function DataSourceBadges({ size = 'sm', showLabel = false, sources, comingSoonOnly = false }) {
  const displaySources = comingSoonOnly ? [] : (sources
    ? SOURCES.filter(s => sources.includes(s.short))
    : SOURCES);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displaySources.map(source => (
        <a
          key={source.short}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.name}
          className="flex items-center gap-1.5 rounded-md hover:opacity-80 transition-opacity px-2 py-1"
          style={{ backgroundColor: source.color }}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${source.favicon}&sz=16`}
            alt={source.name}
            className="w-3 h-3 flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="text-white font-bold" style={{ fontSize: size === 'xs' ? '10px' : '11px' }}>
            {source.short}
          </span>
          {showLabel && (
            <span className="text-white/80 text-xs">{source.name}</span>
          )}
        </a>
      ))}
      {COMING_SOON.map(source => (
        <span
          key={source.short}
          title={`${source.name} — Coming Soon`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 opacity-50 cursor-default"
          style={{ backgroundColor: source.color }}
        >
          <span className="text-white font-bold" style={{ fontSize: size === 'xs' ? '10px' : '11px' }}>
            {source.short}
          </span>
          <span className="text-white/70 italic" style={{ fontSize: '9px' }}>soon</span>
        </span>
      ))}
    </div>
  );
}