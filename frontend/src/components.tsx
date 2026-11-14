import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, errorMessage } from './api';
import type { CoipEvent, Incident, Topology } from './types';
import { formatDate, formatTime, sortEvents } from './utils';

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    operations: <><path d="M3 13h4l3-8 4 14 3-8h4" /></>,
    investigations: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M8 10.5h5M10.5 8v5" /></>,
    infrastructure: <><rect x="4" y="3" width="16" height="7" rx="2" /><rect x="4" y="14" width="16" height="7" rx="2" /><path d="M8 6.5h.01M8 17.5h.01M13 6.5h4M13 17.5h4" /></>,
    twin: <><path d="M7 7h10M7 17h10M7 7v10M17 7v10" /><circle cx="5" cy="5" r="3" /><circle cx="19" cy="5" r="3" /><circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" /></>,
    reports: <><path d="M14 3H5v18h14V8l-5-5Z M14 3v5h5M8 12h8M8 16h6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.operations}</svg>;
}

export function Badge({ value }: { value: string }) {
  const labels: Record<string, string> = { critical: 'Kritis', high: 'Tinggi', medium: 'Sedang', low: 'Rendah', info: 'Informasi', healthy: 'Normal', alerting: 'Ada peringatan', targeted: 'Ditargetkan', compromised: 'Terindikasi kompromi', available: 'Tersedia', degraded: 'Terganggu', down: 'Tidak tersedia', loaded: 'Skenario dimuat', replay: 'Pemutaran', unknown: 'Belum diketahui' };
  return <span className={`badge badge-${value}`}><span aria-hidden="true" />{labels[value] ?? value.replaceAll('-', ' ')}</span>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><Icon name="investigations" size={30} /><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="dialog-title"><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup detail"><Icon name="close" /></button></div>{children}</dialog>;
}

export function EvidenceDialog({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [event, setEvent] = useState<CoipEvent | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(''); setEvent(null);
    api.event(eventId).then(value => { if (active) setEvent(value); }).catch(cause => { if (active) setError(cause instanceof ApiError && cause.status === 404 ? 'Peristiwa tidak ditemukan. Tutup detail dan perbarui data; skenario mungkin telah dimulai ulang.' : errorMessage(cause)); });
    return () => { active = false; };
  }, [eventId, attempt]);
  return <Dialog title={`Bukti / ${eventId}`} onClose={onClose}>
    {error ? <Empty title="Bukti tidak tersedia" action={<button onClick={() => setAttempt(value => value + 1)}>Muat ulang bukti</button>}>{error}</Empty> : !event ? <p className="loading" role="status">Memuat peristiwa asli…</p> : <div className="dialog-body">
      <div className="flex flex-wrap gap-2 items-center"><Badge value={event.severity} /><span className="source-label">{event.source}</span><span className="muted">{formatDate(event.ts)} · {formatTime(event.ts)} WIB</span></div>
      <h3 className="detail-title">{event.title}</h3><p>{event.detail}</p><p className="muted">Pesan deteksi dan alasan korelasi ditampilkan sesuai teks sumber.</p>
      <h4>Alasan keterkaitan dengan aset</h4><ul className="reason-list">{event.assets.map(asset => <li key={`${asset.asset_id}-${asset.role}`}><code>{asset.asset_id}</code><span>{asset.reason}</span></li>)}</ul>
      {event.iocs.length > 0 && <><h4>Indikator</h4><ul className="reason-list">{event.iocs.map(ioc => <li key={ioc.value}><code>{ioc.value}</code><span>{ioc.reason}</span></li>)}</ul></>}
      <h4>Asal-usul bukti</h4><dl className="detail-grid"><div><dt>Asal</dt><dd>{event.provenance.origin}</dd></div><div><dt>Parser</dt><dd>{event.provenance.parser}</dd></div><div><dt>Lokasi sumber</dt><dd>{event.provenance.source_location || 'Tidak disertakan'}</dd></div><div><dt>Diterima</dt><dd>{formatDate(event.provenance.received_at)} · {formatTime(event.provenance.received_at)} WIB</dd></div></dl>
      <p className="muted">SHA-256 JSON kanonis mendukung pemeriksaan konsistensi; hash ini tidak membuktikan keaslian sumber.</p><code className="hash">{event.provenance.raw_sha256}</code>
      <h4>Rekaman asli</h4><pre className="raw-record" tabIndex={0} aria-label="Rekaman peristiwa JSON asli">{JSON.stringify(event.raw ?? {}, null, 2)}</pre>
    </div>}
  </Dialog>;
}

export function EventTable({ events, onEvidence }: { events: CoipEvent[]; onEvidence: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: 'ts' | 'severity'; descending: boolean }>({ key: 'ts', descending: true });
  const toggleSort = (key: 'ts' | 'severity') => setSort(current => ({ key, descending: current.key === key ? !current.descending : true }));
  const sorted = sortEvents(events, sort.key, sort.descending);
  return events.length === 0 ? <Empty title="Tidak ada peristiwa yang cocok">Ubah filter atau lanjutkan pemutaran skenario.</Empty> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabel peristiwa keamanan"><table><thead><tr><th aria-sort={sort.key === 'ts' ? sort.descending ? 'descending' : 'ascending' : 'none'}><button className="table-sort" onClick={() => toggleSort('ts')}>Waktu / WIB <span aria-hidden="true">{sort.key === 'ts' ? sort.descending ? '↓' : '↑' : '↕'}</span></button></th><th>Deteksi asli</th><th>Sumber</th><th aria-sort={sort.key === 'severity' ? sort.descending ? 'descending' : 'ascending' : 'none'}><button className="table-sort" onClick={() => toggleSort('severity')}>Keparahan <span aria-hidden="true">{sort.key === 'severity' ? sort.descending ? '↓' : '↑' : '↕'}</span></button></th><th>Aset</th><th><span className="sr-only">Bukti</span></th></tr></thead><tbody>{sorted.map(event => <tr key={event.id}>
    <td className="mono muted">{formatTime(event.ts)}</td><td><button className="text-button event-title" onClick={() => onEvidence(event.id)}>{event.title}</button><span className="table-sub mono">{event.id}</span></td><td><span className={`source-label source-${event.source}`}>{event.source}</span></td><td><Badge value={event.severity} /></td><td className="mono">{event.primary_asset || 'Belum dipetakan'}</td><td><button className="icon-button" onClick={() => onEvidence(event.id)} aria-label={`Periksa ${event.id}`}><Icon name="arrow" size={17} /></button></td>
  </tr>)}</tbody></table></div>;
}

export function IncidentPicker({ incidents, value, onChange }: { incidents: Incident[]; value: string; onChange: (id: string) => void }) {
  return <label className="field"><span>Investigasi</span><select value={value} onChange={event => onChange(event.target.value)}>{incidents.map(incident => <option key={incident.id} value={incident.id}>{incident.id} · {incident.primary_asset ?? 'Belum dipetakan'}</option>)}</select></label>;
}

export function NetworkGraph({ topology, incident, removed = [], onSelect, selected = '' }: { topology: Topology; incident?: Incident; removed?: string[]; onSelect?: (id: string) => void; selected?: string }) {
  const evidenceNodes = incident?.relationships.nodes ?? [];
  const nodes = incident ? evidenceNodes.map((node, index) => {
    const known = topology.nodes.find(item => item.id === node.id);
    return { id: node.id, label: node.id, kind: node.kind === 'ioc' ? 'external' : node.type, x: known?.pos.x ?? index * 190, y: known?.pos.y ?? 150 };
  }) : topology.nodes.map(node => ({ id: node.id, label: node.id, kind: node.type, x: node.pos.x, y: node.pos.y }));
  const edges = incident ? incident.relationships.edges.map(edge => ({ id: edge.id, src: edge.source, dst: edge.target, label: `${edge.count} event${edge.count === 1 ? '' : 's'}`, removed: false })) : topology.flows.map(flow => ({ ...flow, label: `${flow.id} / ${flow.port}`, removed: removed.includes(flow.id) }));
  const maxX = Math.max(940, ...nodes.map(node => node.x));
  const maxY = Math.max(300, ...nodes.map(node => node.y));
  return <div className="network-wrap"><div className="graph-legend"><span><i className="legend-line" />{incident ? 'Relasi teramati' : 'Alur diizinkan'}</span>{!incident && <span><i className="legend-line removed" />Dihapus oleh skenario</span>}<span className="muted">{incident ? 'Asosiasi bukti belum membuktikan kompromi' : 'Kebijakan jaringan yang dideklarasikan'}</span></div>
    <svg className="network" viewBox={`-100 -15 ${maxX + 210} ${maxY + 90}`} role="img" aria-label={incident ? 'Relasi bukti insiden; detail tersedia di bawah' : 'Alur jaringan yang dideklarasikan; daftar aset tersedia di bawah'}>
      <defs><marker id={incident ? 'evidence-arrow' : 'policy-arrow'} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="currentColor" /></marker></defs>
      {edges.map((edge, index) => {
        const start = nodes.find(node => node.id === edge.src); const end = nodes.find(node => node.id === edge.dst);
        if (!start || !end) return null;
        const offset = index % 2 ? 14 : -14;
        return <g key={edge.id} className={`graph-edge ${edge.removed ? 'is-removed' : ''}`}><path d={`M${start.x} ${start.y + 24} Q${(start.x + end.x) / 2} ${(start.y + end.y) / 2 + offset} ${end.x} ${end.y + 24}`} markerEnd={`url(#${incident ? 'evidence-arrow' : 'policy-arrow'})`} /><text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 + offset / 2 + 15} textAnchor="middle">{edge.label}</text></g>;
      })}
      {nodes.map(node => <g key={node.id} transform={`translate(${node.x - 62},${node.y})`} className={`graph-node ${node.kind === 'external' ? 'external-node' : ''} ${selected === node.id ? 'selected-node' : ''}`}><rect width="124" height="49" rx="7" /><text x="62" y="21" textAnchor="middle">{node.label}</text><text x="62" y="37" textAnchor="middle" className="node-kind">{node.kind}</text></g>)}
    </svg>
    <div className="graph-assets" aria-label="Aset pada graf">{nodes.map(node => onSelect && (incident || node.kind !== 'external') ? <button key={node.id} className={selected === node.id ? 'chip selected' : 'chip'} aria-pressed={selected === node.id} onClick={() => onSelect(selected === node.id ? '' : node.id)}>{node.id}</button> : <span key={node.id} className="chip">{node.id}</span>)}</div>
  </div>;
}
