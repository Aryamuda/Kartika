import { useState } from 'react';
import { Badge, Empty, EvidenceRecord, Icon, IncidentPicker, NetworkGraph, Panel } from './components';
import type { CoipEvent, Incident, Overview, Topology } from './types';
import { formatDate, formatTime, incidentLabel } from './utils';

export function InvestigationWorkspace({ data, incident, onIncident, onTwin }: {
  data: { overview: Overview; events: CoipEvent[]; topology: Topology };
  incident?: Incident; onIncident: (id: string) => void; onTwin: () => void;
}) {
  const [node, setNode] = useState('');
  const [eventId, setEventId] = useState('');
  if (!incident) return <Empty title="Belum ada insiden untuk ditelusuri">Buka halaman Operasi, lalu lanjutkan pemutaran skenario.</Empty>;
  const linked = data.events.filter(event => incident.event_ids.includes(event.id)).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const events = node ? linked.filter(event => event.assets.some(asset => asset.asset_id === node) || event.iocs.some(ioc => ioc.value === node || data.topology.nodes.find(item => item.id === node)?.ips?.includes(ioc.value))) : linked;
  const selected = events.find(event => event.id === eventId) ?? events[0];
  const selectEvidence = (id: string) => { setNode(''); setEventId(id); };
  return <>
    <div className="section-toolbar"><IncidentPicker incidents={data.overview.incidents} value={incident.id} onChange={onIncident} /><button className="button primary" onClick={onTwin}><Icon name="twin" size={17} />Bandingkan respons</button></div>
    <section className="incident-brief investigation-brief"><div><div className="flex flex-wrap gap-3 items-center"><Badge value={incident.severity} /><span className="mono muted">{formatDate(incident.first_seen)} · {formatTime(incident.first_seen)} WIB</span></div><h2>{incidentLabel(incident)}</h2><p>{incident.event_ids.length} peristiwa · {incident.affected_assets.length} aset · {incident.sources.wazuh} Wazuh / {incident.sources.suricata} Suricata</p><details className="original-summary"><summary>Lihat judul dan ringkasan asli</summary><h3>{incident.title}</h3><p>{incident.summary}</p></details></div><div className="brief-score"><strong>{incident.risk_score}<span>/100</span></strong><span>Skor risiko heuristik</span></div></section>
    <div className="observed-tactics" aria-label="Taktik yang tercatat dalam bukti"><span>Taktik tercatat</span>{Array.from(new Set(incident.tactics.map(item => item.tactic))).map(tactic => <span className="tactic-label" key={tactic}>{tactic}</span>)}<small>Label dari deteksi, bukan konfirmasi tahapan serangan.</small></div>
    <div className="investigation-workspace">
      <Panel className="evidence-timeline" title="Linimasa bukti" subtitle={`${events.length} peristiwa${node ? ` terkait ${node}` : ' dalam urutan waktu'} · WIB`} action={<div className="evidence-actions">{node && <button className="text-button" onClick={() => setNode('')}>Hapus filter simpul</button>}{selected && <button className="text-button read-evidence-button" onClick={() => document.getElementById('selected-evidence')?.focus()}>Baca bukti</button>}</div>}>
        {events.length === 0 ? <Empty title="Tidak ada bukti yang cocok">Pilih simpul lain pada graf.</Empty> : <ol className="timeline">{events.map(event => <li key={event.id}><button className={`timeline-event ${selected?.id === event.id ? 'selected-event' : ''}`} aria-pressed={selected?.id === event.id} onClick={() => setEventId(event.id)}><div className="evidence-row-meta"><time className="mono">{formatTime(event.ts)}</time><span className="source-label">{event.source}</span><Badge value={event.severity} /></div><h3>{event.title}</h3><p>{event.evidence.join(' · ')}</p><span className="timeline-technique">{event.mitre.map(item => item.id).join(' · ') || event.category}{incident.context_event_ids.includes(event.id) ? ' · Peristiwa konteks' : ''}</span></button></li>)}</ol>}
      </Panel>
      <Panel className="evidence-graph" title="Relasi bukti" subtitle="Pilih simpul untuk memfilter linimasa; garis terang mengikuti bukti terpilih">
        <NetworkGraph topology={data.topology} incident={incident} onSelect={setNode} selected={node} eventId={selected?.id} />
        <div className="relationship-list">{incident.relationships.edges.map(edge => <details key={edge.id}><summary><code>{edge.source}</code><span className="muted">ke</span><code>{edge.target}</code><span className="muted">{edge.count} peristiwa</span></summary><div className="relationship-body"><p>{edge.label}</p>{edge.reasons.map(reason => <p key={reason}>{reason}</p>)}<div className="flex flex-wrap gap-2">{edge.event_ids.map(id => <button key={id} className="chip" onClick={() => selectEvidence(id)}>{id}</button>)}</div></div></details>)}</div>
        <details className="investigation-context"><summary>Konteks aset dan faktor risiko</summary><div className="context-body"><h3>Aset terkait</h3>{incident.affected_assets.map(asset => <div className="context-asset" key={asset.asset_id}><div><strong className="mono">{asset.asset_id}</strong><span className="muted">{{ 'suspected-compromised': 'Diduga terkompromi', targeted: 'Ditargetkan', involved: 'Terlibat' }[asset.role]}</span></div><Badge value={asset.criticality} /></div>)}<h3>Faktor risiko dari sumber</h3>{incident.score_factors.map(factor => <div className="factor" key={factor.label}><span>{factor.label}</span><strong>+{factor.points}</strong></div>)}<p className="muted">Korelasi menunjukkan keterkaitan. Aset yang ditargetkan belum tentu telah terkompromi.</p></div></details>
      </Panel>
      <Panel id="selected-evidence" className="evidence-detail" title="Bukti terpilih" subtitle={selected ? `${selected.source} · ${selected.id}` : 'Pilih peristiwa dari linimasa'}>
        {selected ? <EvidenceRecord key={selected.id} eventId={selected.id} /> : <Empty title="Belum ada bukti terpilih">Pilih simpul lain atau hapus filter untuk menampilkan peristiwa.</Empty>}
      </Panel>
    </div>
  </>;
}
