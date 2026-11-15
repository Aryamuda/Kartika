import { useEffect, useRef, useState } from 'react';
import type { Asset, Overview } from './types';
import { siteSummary } from './utils';
import provinces from './data/indonesia.json';

export function SiteMap({ overview, assets, selected, onSelect }: { overview: Overview; assets: Asset[]; selected: string; onSelect: (id: string) => void }) {
  const [national, setNational] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(1.45);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setRatio(entry.contentRect.width / entry.contentRect.height);
    });
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  const sites = overview.sites.filter(site => Number.isFinite(site.lat) && Number.isFinite(site.lon));
  const west = Math.min(...sites.map(site => site.lon));
  const east = Math.max(...sites.map(site => site.lon));
  const north = Math.min(...sites.map(site => -site.lat));
  const south = Math.max(...sites.map(site => -site.lat));
  const height = Math.max(3.8, south - north + 3, (east - west + 5) / ratio);
  const width = height * ratio;
  const nationalWidth = Math.max(48, 24 * ratio);
  const bounds = national || !sites.length ? [118 - nationalWidth / 2, 4 - nationalWidth / ratio / 2, nationalWidth, nationalWidth / ratio] : [(west + east - width) / 2, (north + south - height) / 2, width, height];
  return <>
    <div className="map-toolbar"><span>Lokasi sintetis · {sites.length} titik</span><button className="text-button" aria-pressed={national} onClick={() => setNational(value => !value)}>{national ? 'Fokus lokasi' : 'Seluruh Indonesia'}</button></div>
    <div ref={canvas} className={`site-map ${national ? 'national-map' : ''}`}>
      <svg viewBox={bounds.join(' ')} preserveAspectRatio="none" role="img" aria-label="Batas provinsi Indonesia dengan lokasi aset sintetis">
        {provinces.map(province => <path key={province.name} d={province.path} fillRule="evenodd" vectorEffect="non-scaling-stroke"><title>{province.name}</title></path>)}
      </svg>
      {sites.map((site, index) => {
        const status = siteSummary(assets, overview.asset_status, site.id);
        return <button key={site.id} className={`map-pin ${selected === site.id ? 'selected' : ''} ${status.attention ? 'attention' : ''}`} style={{ left: `${(site.lon - bounds[0]) / bounds[2] * 100}%`, top: `${(-site.lat - bounds[1]) / bounds[3] * 100}%` }} onClick={() => onSelect(selected === site.id ? '' : site.id)} aria-pressed={selected === site.id} aria-label={`Pilih lokasi ${site.name}`}><span className="pin-target" /><span className={`pin-label ${index % 2 ? 'below' : 'above'}`}>{site.name}</span></button>;
      })}
      <span className="map-watermark">Lokasi demonstrasi</span>
    </div>
    <div className="map-sites">{overview.sites.map(site => {
      const summary = siteSummary(assets, overview.asset_status, site.id);
      return <button key={site.id} className={selected === site.id ? 'selected' : ''} aria-pressed={selected === site.id} onClick={() => onSelect(selected === site.id ? '' : site.id)}><strong>{site.name}</strong><span>{summary.total} aset · {summary.attention} perlu ditinjau</span><span className="site-choice">{selected === site.id ? 'Lokasi dipilih' : 'Lihat insiden lokasi'}</span></button>;
    })}</div>
    <p className="map-attribution">Batas provinsi disederhanakan dari GeoJSON Indonesia, Ardian Saputra Hasibuan (MIT). Lokasi tidak menunjukkan penempatan aset nyata.</p>
  </>;
}
