import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage } from './api';
import { Badge, Dialog, Empty, EventTable, EvidenceDialog, Icon, IncidentPicker, NetworkGraph, Notice, Panel } from './components';
import { SiteMap } from './SiteMap';
import { InvestigationWorkspace } from './InvestigationWorkspace';
import type { Asset, CoipEvent, CompareResult, Incident, Intervention, Overview, SimulationResult, Topology } from './types';
import { downloadText, filterEvents, formatTime, incidentLabel, interventionLabel } from './utils';

const pages = [
  { id: 'operations', label: 'Operasi', description: 'Pantau insiden dan kondisi aset di seluruh lokasi.' },
  { id: 'investigations', label: 'Investigasi', description: 'Telusuri bukti. Pahami rangkaian insiden.' },
  { id: 'twin', label: 'Simulasi', description: 'Bandingkan pembatasan ancaman dengan dampaknya pada layanan.' },
  { id: 'infrastructure', label: 'Infrastruktur', description: 'Kenali aset, layanan, dan kebijakan yang menopang operasi.' },
  { id: 'reports', label: 'Laporan', description: 'Ekspor investigasi beserta bukti dan pertimbangan responsnya.' },
] as const;
type Page = typeof pages[number]['id'];
type Data = { overview: Overview; assets: Asset[]; events: CoipEvent[]; topology: Topology };

function readRoute(): { page: Page; incident: string } {
  const [page, encoded = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  let incident = '';
  try { incident = decodeURIComponent(encoded); } catch { /* A malformed link opens the default investigation. */ }
  return { page: pages.some(item => item.id === page) ? page as Page : 'operations', incident };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [eventId, setEventId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReplay, setConfirmReplay] = useState(false);
  const [actionError, setActionError] = useState('');
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    try {
      const [overview, assets, events, topology] = await Promise.all([api.overview(), api.assets(), api.events(), api.topology()]);
      if (current !== sequence.current) return;
      setData({ overview, assets, events, topology }); setError(''); setUpdated(new Date().toISOString());
    } catch (cause) { if (current === sequence.current) setError(errorMessage(cause)); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => { ++sequence.current; window.removeEventListener('hashchange', onHash); };
  }, [refresh]);

  const currentPage = pages.find(page => page.id === route.page)!;
  useEffect(() => {
    document.title = `${currentPage.label} | Dwirupa`;
    window.scrollTo(0, 0);
  }, [currentPage.label, route.incident]);
  const incident = data?.overview.incidents.find(item => item.id === route.incident) ?? data?.overview.incidents[0];
  const go = (page: Page, id = incident?.id ?? '') => { window.location.hash = `${page}${id ? `/${encodeURIComponent(id)}` : ''}`; };

  async function replay(reset: boolean, count = 1) {
    if (busy) return;
    setBusy(true); setActionError('');
    try {
      if (reset) await api.reset(); else await api.step(count);
      await refresh();
    } catch (cause) { setActionError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Langsung ke konten</a>
    <aside className="sidebar">
      <a href="#operations" className="wordmark" aria-label="Operasi Dwirupa"><span>DWIRUPA<span className="wordmark-sub">COIP / OPERASI SIBER</span></span></a>
      <div className="workspace-label">RUANG KERJA <span>01</span></div>
      <nav aria-label="Navigasi utama">{pages.map(page => <a key={page.id} href={`#${page.id}${incident ? `/${incident.id}` : ''}`} aria-current={route.page === page.id ? 'page' : undefined}><Icon name={page.id} /><span>{page.label}</span>{page.id === 'investigations' && !!data?.overview.incidents.length && <span className="nav-count">{data.overview.incidents.length}</span>}</a>)}</nav>
      <div className="sidebar-note"><span className="small-label">LINGKUNGAN</span><strong>Skenario demonstrasi</strong><p>Peristiwa keamanan sintetis.<br />Respons oleh operator.</p><span className="environment-tag">LAB / DEMONSTRASI</span></div>
      <div className="sidebar-footer"><span className={`connection-dot ${data && !error ? 'connected' : ''}`} /><span>{data && !error ? 'API terhubung' : loading ? 'Menghubungkan API' : 'API tidak tersedia'}</span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Ruang kerja <span>/</span> <strong>{currentPage.label}</strong></div><div className="topbar-meta"><span className="snapshot-label">{updated ? `Data ${formatTime(updated)} WIB` : 'Menunggu data'}</span><span className="operator-avatar" aria-label="Operator keamanan">OP</span></div></header>
      <main id="main" tabIndex={-1} aria-busy={loading}>
        <div className="page-heading"><div><p className="eyebrow">COIP / {route.page === 'twin' ? 'DUKUNGAN KEPUTUSAN' : 'OPERASI KEAMANAN SIBER'}</p><h1>{currentPage.label}</h1><p className="page-description">{currentPage.description}</p></div><button className="button secondary" onClick={() => void refresh()} disabled={loading || busy}><Icon name="refresh" size={16} />{loading ? 'Memuat…' : 'Perbarui data'}</button></div>
        {error && <Notice error>{data && 'Menampilkan data terakhir yang berhasil dimuat. '}{error} <button className="text-button" onClick={() => void refresh()} disabled={loading}>Hubungkan kembali</button></Notice>}
        {actionError && <Notice error>{actionError}</Notice>}
        {data && route.incident && !data.overview.incidents.some(item => item.id === route.incident) && <Notice>Insiden yang diminta tidak ada dalam data saat ini. {incident ? `Menampilkan ${incident.id}.` : 'Muat peristiwa skenario berikutnya pada halaman Operasi.'}</Notice>}
        {!data ? loading ? <div className="initial-loading" role="status"><div className="loading-line" /><h2>Menghubungkan ruang kerja</h2><p>Memuat aset, insiden, dan bukti.</p></div> : <Empty title="Ruang kerja belum terhubung" action={<button className="button primary" onClick={() => void refresh()}>Hubungkan kembali</button>}>Jalankan API COIP atau periksa alamat koneksinya.</Empty> : <>
          {route.page === 'operations' && <Operations data={data} busy={busy || loading} onInvestigate={id => go('investigations', id)} onEvidence={setEventId} onReset={() => setConfirmReplay(true)} onStep={n => void replay(false, n)} />}
          {route.page === 'investigations' && <InvestigationWorkspace key={`${incident?.id}-${incident?.event_ids.join(',')}`} data={data} incident={incident} onIncident={id => go('investigations', id)} onTwin={() => go('twin')} />}
          {route.page === 'twin' && <Twin key={`${incident?.id}-${incident?.event_ids.join(',')}`} data={data} incident={incident} onIncident={id => go('twin', id)} />}
          {route.page === 'infrastructure' && <Infrastructure data={data} onEvidence={setEventId} />}
          {route.page === 'reports' && <Reports key={`${incident?.id}-${incident?.event_ids.join(',')}`} data={data} incident={incident} onIncident={id => go('reports', id)} />}
        </>}
        <footer className="page-footer"><span>COIP · Ruang investigasi siber</span><span>Seluruh waktu dalam WIB (UTC+7)</span></footer>
      </main>
    </div>
    {eventId && <EvidenceDialog key={eventId} eventId={eventId} onClose={() => setEventId('')} />}
    {confirmReplay && <Dialog title="Mulai ulang skenario bersama?" onClose={() => setConfirmReplay(false)}><div className="dialog-body"><p>Tindakan ini menghapus peristiwa dan insiden dalam memori API yang terhubung, termasuk peristiwa yang dikirim melalui API. Pengguna lain pada ruang kerja ini juga akan melihat pengaturan ulang tersebut.</p><p>Berkas data sintetis tetap utuh. Setelahnya, Anda dapat memuat peristiwa satu per satu atau melengkapi skenario.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setConfirmReplay(false)}>Batal</button><button className="button primary" onClick={() => { setConfirmReplay(false); void replay(true); }}>Mulai ulang skenario</button></div></div></Dialog>}
  </div>;
}

function Operations({ data, busy, onInvestigate, onEvidence, onReset, onStep }: { data: Data; busy: boolean; onInvestigate: (id: string) => void; onEvidence: (id: string) => void; onReset: () => void; onStep: (n: number) => void }) {
  const { overview, events, assets } = data;
  const [query, setQuery] = useState(''); const [source, setSource] = useState(''); const [severity, setSeverity] = useState('');
  const [site, setSite] = useState('');
  const siteAssets = new Set(assets.filter(asset => asset.site === site).map(asset => asset.id));
  const incidents = overview.incidents.filter(item => !site || item.affected_assets.some(asset => siteAssets.has(asset.asset_id)));
  const filtered = filterEvents(events.filter(event => !site || event.assets.some(asset => siteAssets.has(asset.asset_id))), query, source, severity);
  const attention = assets.filter(asset => overview.asset_status[asset.id]?.status && overview.asset_status[asset.id].status !== 'healthy').length;
  const critical = overview.incidents.filter(incident => incident.severity === 'critical').length;
  return <>
    <div className="operations-workspace">
    <Panel className="map-panel" title="Peta operasi" subtitle="Pilih lokasi untuk memfilter insiden dan deteksi"><SiteMap overview={overview} assets={assets} selected={site} onSelect={setSite} /></Panel>
    <div className="metrics-grid">
      <div className="metric metric-priority"><span>Insiden terbuka</span><strong>{overview.stats.open_incidents.toString().padStart(2, '0')}</strong><p><span className="status-dot critical-dot" />{critical} insiden kritis perlu ditelusuri</p><Icon name="investigations" size={22} /></div>
      <div className="metric"><span>Aset terdaftar</span><strong>{overview.stats.assets.toString().padStart(2, '0')}</strong><p>Tersebar di {overview.sites.length} lokasi</p><Icon name="infrastructure" size={22} /></div>
      <div className="metric"><span>Peristiwa keamanan</span><strong>{overview.stats.events.toString().padStart(2, '0')}</strong><p>{overview.stats.sources.wazuh} endpoint · {overview.stats.sources.suricata} jaringan</p><Icon name="operations" size={22} /></div>
      <div className="metric"><span>Aset perlu ditinjau</span><strong>{attention.toString().padStart(2, '0')}</strong><p>Memiliki peringatan atau indikasi ancaman</p><Icon name="location" size={22} /></div>
    </div>
        <Panel className="operations-incidents" title="Antrean insiden" subtitle={site ? `Melibatkan aset di ${overview.sites.find(item => item.id === site)?.name}` : 'Bukti terkorelasi, diurutkan oleh API'} action={<span className="count-label">{incidents.length} TERBUKA</span>}>
          {site && <div className="site-filter"><span>Filter lokasi aktif</span><button className="text-button" onClick={() => setSite('')}>Semua lokasi</button></div>}
          {incidents.length === 0 ? <Empty title={site ? 'Tidak ada insiden pada lokasi ini' : 'Belum ada insiden terbentuk'}>{site ? 'Pilih lokasi lain atau hapus filter lokasi.' : 'Lanjutkan skenario untuk memuat deteksi yang saling berkaitan.'}</Empty> : <div className="incident-list">{incidents.map((incident, index) => <button className="incident-card" key={incident.id} onClick={() => onInvestigate(incident.id)}><div className="incident-card-top"><span className="mono muted">{incident.id}</span><Badge value={incident.severity} /></div><h3>{incidentLabel(incident)}</h3><p className="incident-summary">{incident.event_ids.length} peristiwa terkait dari {incident.sources.wazuh} deteksi endpoint dan {incident.sources.suricata} deteksi jaringan. {incident.affected_assets.length} aset terlibat; mulai ditelusuri pada {formatTime(incident.first_seen)} WIB.</p><div className="incident-card-bottom"><span><strong className="mono">{incident.primary_asset ?? 'Belum dipetakan'}</strong><span className="muted"> · {incident.event_ids.length} peristiwa</span></span><span className="incident-action">{index === 0 ? 'Telusuri prioritas' : 'Buka investigasi'}<Icon name="arrow" size={17} /></span></div><div className="risk-strip" role="img" aria-label={`Skor risiko heuristik ${incident.risk_score} dari 100`}><span style={{ width: `${Math.max(0, Math.min(100, incident.risk_score))}%` }} /></div></button>)}</div>}
      </Panel>
        <Panel className="operations-replay" title="Pemutaran skenario" subtitle="Ikuti rangkaian peristiwa sintetis"><div className="replay-content"><div className="replay-count"><strong>{Math.max(0, overview.replay.total - overview.replay.remaining)}<span> / {overview.replay.total}</span></strong><Badge value={overview.replay.remaining ? 'replay' : 'loaded'} /></div><progress value={Math.max(0, overview.replay.total - overview.replay.remaining)} max={Math.max(1, overview.replay.total)} aria-label="Kemajuan pemutaran data sintetis" /><p>{overview.replay.remaining ? `${overview.replay.remaining} peristiwa skenario belum dimuat` : 'Seluruh skenario dimuat. Mulai ulang untuk mengikuti perkembangannya.'}</p><div className="replay-actions"><button className="button secondary" onClick={onReset} disabled={busy}><Icon name="refresh" size={15} />Ulangi</button><button className="button primary" onClick={() => onStep(1)} disabled={busy || !overview.replay.remaining}><Icon name="play" size={15} />Lanjutkan</button></div>{overview.replay.remaining > 0 && <button className="text-button load-all" onClick={() => onStep(overview.replay.remaining)} disabled={busy}>Muat sisa skenario</button>}</div></Panel>
    </div>
    <Panel title="Aliran deteksi" subtitle="Peristiwa dari sumber asli dalam satu rangkaian bukti" action={<span className="count-label">{filtered.length} PERISTIWA</span>}>
      <div className="filter-bar"><label className="search-field"><Icon name="search" size={17} /><span className="sr-only">Cari peristiwa</span><input placeholder="Cari deteksi, aset, atau IP…" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="field compact"><span className="sr-only">Sumber peristiwa</span><select value={source} onChange={event => setSource(event.target.value)}><option value="">Semua sumber</option><option value="wazuh">Wazuh</option><option value="suricata">Suricata</option></select></label><label className="field compact"><span className="sr-only">Keparahan peristiwa</span><select value={severity} onChange={event => setSeverity(event.target.value)}><option value="">Semua tingkat</option><option value="critical">Kritis</option><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option><option value="info">Informasi</option></select></label></div>
      <EventTable events={filtered} onEvidence={onEvidence} />
    </Panel>
  </>;
}

function usePresets(id?: string) {
  const [presets, setPresets] = useState<Intervention[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPresets([]); setError('');
    if (!id) return;
    setLoading(true);
    api.presets(id).then(value => { if (active) setPresets(value); }).catch(cause => { if (active) setError(errorMessage(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  return { presets, error, loading, retry: () => setAttempt(value => value + 1) };
}

function Twin({ data, incident, onIncident }: { data: Data; incident?: Incident; onIncident: (id: string) => void }) {
  const { presets, error: presetError, loading, retry } = usePresets(incident?.id);
  const [comparison, setComparison] = useState<CompareResult | null>(null); const [selected, setSelected] = useState(0); const [single, setSingle] = useState<SimulationResult | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const result = single ?? comparison?.results[selected];
  if (!incident) return <Empty title="Belum ada insiden untuk disimulasikan">Muat skenario pada halaman Operasi terlebih dahulu.</Empty>;
  const activeIncident = incident;
  async function run(index?: number) {
    setBusy(true); setError('');
    try {
      if (index === undefined) { setComparison(await api.compare(activeIncident.id, presets)); setSingle(null); setSelected(0); }
      else { setSingle(await api.simulate(activeIncident.id, presets[index])); setSelected(index); }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <><div className="section-toolbar"><IncidentPicker incidents={data.overview.incidents} value={incident.id} onChange={onIncident} /><span className="muted">Aset awal: <code>{incident.primary_asset ?? 'Belum dipetakan'}</code></span></div>
    <Notice>Simulasi memodelkan kebijakan firewall yang dideklarasikan, tanpa validasi tingkat paket. Hasil bersifat indikatif. Aplikasi tidak menjalankan perubahan firewall.</Notice>
    {presetError && <Notice error>{presetError} <button className="text-button" onClick={retry}>Hubungkan ulang simulator</button></Notice>}
    {error && <Notice error>{error}</Notice>}
    <div className="scenario-heading"><div><h2>Tiga respons. Konsekuensi berbeda.</h2><p>Lihat ancaman yang dibatasi, tujuan yang masih terjangkau, dan layanan yang ikut terganggu.</p></div><button className="button primary" disabled={busy || loading || !presets.length} onClick={() => void run()}><Icon name="twin" size={17} />{busy ? 'Menghitung…' : 'Bandingkan semua skenario'}</button></div>
    {loading ? <p className="loading" role="status">Memuat pilihan intervensi…</p> : !presets.length ? <Empty title="Menunggu pilihan dari simulator">API belum menyediakan pilihan intervensi. Hasil skenario akan muncul setelah simulator tersedia.</Empty> : <div className="preset-grid">{presets.map((preset, index) => <button className={`preset-card ${result && selected === index ? 'active' : ''}`} key={`${preset.type}-${index}`} disabled={busy} onClick={() => void run(index)}><span className="preset-index">{String.fromCharCode(65 + index)}</span><h3>{interventionLabel(preset)}</h3><p>{preset.type === 'isolate_asset' ? `Hapus seluruh alur yang melibatkan ${preset.asset_id}.` : preset.type === 'block_flows' ? `Hapus alur kebijakan terpilih: ${preset.flow_ids?.join(', ') || 'tidak ada'}.` : `Batasi akses dari ${preset.source} ke ${preset.segment}.`}</p><span className="preset-action">Simulasikan intervensi <Icon name="play" size={14} /></span></button>)}</div>}
    {comparison && <Panel title="Perbandingan skenario" subtitle="Dihitung oleh simulator yang terhubung"><div className="table-scroll" tabIndex={0} role="region" aria-label="Tabel perbandingan skenario"><table><thead><tr><th>Skenario</th><th>Alur berbahaya diblokir</th><th>Sisa jangkauan</th><th>Dampak layanan</th><th>Pembatasan</th><th>Ketersediaan</th><th>Pertimbangan</th></tr></thead><tbody>{comparison.results.map((item, index) => <tr key={item.scenario_name} className={selected === index && !single ? 'selected-row' : ''}><td><button className="text-button" onClick={() => { setSingle(null); setSelected(index); }}>{String.fromCharCode(65 + index)}. {interventionLabel(item.intervention)}</button></td><td className="mono">{item.security_impact.malicious_blocked} / {item.security_impact.malicious_total}</td><td>{item.reachability.compromised_reach_after.join(', ') || 'Tidak ada'}</td><td>{item.service_availability.filter(service => service.after !== 'available').map(service => `${service.name}: ${{ degraded: 'terganggu', down: 'tidak tersedia', available: 'tersedia' }[service.after]}`).join('; ') || 'Semua tersedia'}</td><td>{Math.round(item.scores.containment * 100)}%</td><td>{Math.round(item.scores.availability * 100)}%</td><td>{comparison.dominated[item.scenario_name] ? `Didominasi ${interventionLabel(comparison.results.find(candidate => candidate.scenario_name === comparison.dominated[item.scenario_name])?.intervention ?? item.intervention)}` : 'Tidak didominasi'}</td></tr>)}</tbody></table></div><p className="panel-note">Metode dari simulator: {comparison.results[0]?.scores.method}</p></Panel>}
    <Panel title={result ? `Hasil kebijakan / ${interventionLabel(result.intervention)}` : 'Kebijakan jaringan awal'} subtitle={result ? `${result.removed_flows.length} alur dihapus · ${result.reachability.compromised_reach_after.length} tujuan masih terjangkau` : 'Kondisi awal sebelum intervensi diterapkan'}>
      <div className={result ? 'policy-comparison' : ''}>
        <div className="policy-pane"><div className="policy-pane-heading"><h3>Kebijakan awal</h3><span>{data.topology.flows.length} alur dideklarasikan</span></div><NetworkGraph topology={data.topology} />{result && <div className="policy-services">{result.service_availability.map(service => <div key={service.service_id}><span>{service.name}</span><Badge value={service.before} /></div>)}</div>}</div>
        {result && <div className="policy-pane"><div className="policy-pane-heading"><h3>Hasil simulasi</h3><span>{data.topology.flows.length - result.removed_flows.length} alur tersisa</span></div><NetworkGraph topology={data.topology} removed={result.removed_flows.map(flow => flow.id)} /><div className="policy-services">{result.service_availability.map(service => <div key={service.service_id}><span>{service.name}</span><Badge value={service.after} /></div>)}</div></div>}
      </div>
      {result && <><div className="simulation-outcome"><div><span>Alur berbahaya diblokir</span><strong>{result.security_impact.malicious_blocked} / {result.security_impact.malicious_total}</strong></div><div><span>Tujuan masih terjangkau</span><strong>{result.reachability.compromised_reach_after.join(', ') || 'Tidak ada'}</strong></div><div><span>Alur sah ikut dihapus</span><strong>{result.collateral.legit_flows_removed}</strong></div></div><div className="result-details"><div><h3>Ketersediaan layanan</h3>{result.service_availability.map(service => <div className="service-row" key={service.service_id}><div><strong>{service.name}</strong><p>{service.reasons.join(' · ') || 'Tidak ada kehilangan dependensi yang dideklarasikan.'}</p></div><Badge value={service.after} /></div>)}</div><div><h3>Catatan analis dari simulator</h3><ul className="observation-list">{result.observations.map(observation => <li key={observation}>{observation}</li>)}</ul><h3>Usulan perubahan</h3>{result.change_set.map((change, index) => <p className="change-item" key={index}><code>{change.action}</code> {change.enforcement_point}: {change.rule}</p>)}<p className="muted">{result.limitations}</p></div></div></>}
    </Panel>
  </>;
}

function Infrastructure({ data, onEvidence }: { data: Data; onEvidence: (id: string) => void }) {
  const [query, setQuery] = useState(''); const [site, setSite] = useState(''); const [assetId, setAssetId] = useState('');
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.asset>> | null>(null); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const filtered = useMemo(() => data.assets.filter(asset => (!site || asset.site === site) && [asset.id, asset.hostname, asset.owner, asset.role, ...asset.ips].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))), [data.assets, query, site]);
  useEffect(() => {
    let active = true; setDetail(null); setError('');
    if (assetId) api.asset(assetId).then(value => { if (active) setDetail(value); }).catch(cause => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [assetId, attempt]);
  return <><Panel title="Inventaris aset siber" subtitle="Kepemilikan, tingkat kritis, dan kondisi keamanan" action={<span className="count-label">{filtered.length} ASET</span>}><div className="filter-bar"><label className="search-field"><Icon name="search" size={17} /><span className="sr-only">Cari aset</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari aset, pemilik, fungsi, atau IP…" /></label><label className="field compact"><span className="sr-only">Lokasi aset</span><select value={site} onChange={event => setSite(event.target.value)}><option value="">Semua lokasi</option>{data.overview.sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{!filtered.length ? <Empty title="Tidak ada aset yang cocok">Ubah pencarian atau filter lokasi.</Empty> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Inventaris aset siber"><table><thead><tr><th>Aset / hostname</th><th>Alamat</th><th>Pemilik</th><th>Lokasi</th><th>Tingkat kritis</th><th>Status</th></tr></thead><tbody>{filtered.map(asset => <tr key={asset.id}><td><button className="text-button mono" onClick={() => setAssetId(asset.id)}>{asset.id}</button><span className="table-sub">{asset.hostname}</span></td><td className="mono">{asset.ips.join(', ')}</td><td>{asset.owner}</td><td>{data.overview.sites.find(item => item.id === asset.site)?.name ?? asset.site}</td><td><Badge value={asset.criticality} /></td><td><Badge value={data.overview.asset_status[asset.id]?.status ?? 'unknown'} /></td></tr>)}</tbody></table></div>}</Panel>
    <Panel title="Topologi jaringan" subtitle="Alur yang diizinkan dan dependensi layanan"><NetworkGraph topology={data.topology} onSelect={id => { if (data.assets.some(asset => asset.id === id)) setAssetId(id); }} /><div className="service-grid">{data.topology.services.map(service => <div key={service.id}><h3>{service.name}</h3><p><code>{service.host}</code> · Port {service.port}</p><p className="muted">{service.depends_on.length ? service.depends_on.map(dependency => `${dependency.required ? 'Wajib' : 'Opsional'}: ${data.topology.services.find(item => item.id === dependency.service)?.name ?? dependency.service}`).join(' · ') : 'Tidak ada dependensi layanan yang dideklarasikan'}</p></div>)}</div></Panel>
    {assetId && <Dialog title={`Aset / ${assetId}`} onClose={() => setAssetId('')}>{error ? <Empty title="Aset tidak tersedia" action={<button onClick={() => setAttempt(value => value + 1)}>Muat ulang aset</button>}>{error}</Empty> : !detail ? <p className="loading" role="status">Memuat detail aset…</p> : <div className="dialog-body"><div className="flex gap-2 flex-wrap"><Badge value={detail.criticality} /><Badge value={data.overview.asset_status[detail.id]?.status ?? 'unknown'} /></div><h3 className="detail-title">{detail.role}</h3><dl className="detail-grid">{[['Pemilik', detail.owner], ['Sistem operasi', detail.os], ['Hostname', detail.hostname], ['Alamat', detail.ips.join(', ')], ['Agen', detail.agent_id || 'Belum ada agen'], ['Segmen', detail.segment]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><h4>Bukti terkait ({detail.events.length})</h4><div className="asset-events">{detail.events.map(event => <button className="text-button" key={event.id} onClick={() => { setAssetId(''); onEvidence(event.id); }}>{event.id} · {event.title}</button>)}{!detail.events.length && <p className="muted">Tidak ada peristiwa terkait pada data saat ini.</p>}</div><h4>Alur yang diizinkan</h4>{detail.flows.map(flow => <p key={flow.id} className="flow-detail"><code>{flow.id}</code> {flow.src} ke {flow.dst} / {flow.port}</p>)}</div>}</Dialog>}
  </>;
}

function Reports({ data, incident, onIncident }: { data: Data; incident?: Incident; onIncident: (id: string) => void }) {
  const { presets, error: presetError, loading, retry } = usePresets(incident?.id);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [downloaded, setDownloaded] = useState(false);
  if (!incident) return <Empty title="Belum ada investigasi untuk diekspor">Muat skenario pada halaman Operasi terlebih dahulu.</Empty>;
  const current = incident;
  async function download() {
    setBusy(true); setError(''); setDownloaded(false);
    try { const report = await api.report(current.id, presets); downloadText(report.markdown, report.filename.replace(/\.(html?|pdf)$/i, '.md')); setDownloaded(true); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <><div className="section-toolbar"><IncidentPicker incidents={data.overview.incidents} value={incident.id} onChange={onIncident} /></div>
    {presetError && <Notice error>{presetError} Perbandingan skenario memerlukan pilihan intervensi dari simulator. <button className="text-button" onClick={retry}>Periksa ulang layanan</button></Notice>}
    {error && <Notice error>{error}</Notice>}{downloaded && <Notice>Laporan berhasil diunduh. Isinya mencakup investigasi dan perbandingan skenario yang dihasilkan API.</Notice>}
    <section className="report-layout"><div className="report-cover"><span className="eyebrow">EKSPOR INVESTIGASI</span><div className="report-document"><Icon name="reports" size={44} /><span className="mono">{incident.id}</span><h2>Bukti.<br />Pilihan.<br />Konsekuensi.</h2><p>Catatan insiden dan pertimbangan respons yang dapat ditinjau kembali.</p></div><div className="report-cover-footer"><span>COIP</span><span>MARKDOWN</span></div></div><div className="report-content"><Badge value={incident.severity} /><h2>{incident.title}</h2><p>{incident.summary}</p><ol className="report-sections"><li><span>01</span><div><h3>Ringkasan insiden</h3><p>Lingkup insiden, aset terkait, dan konteks sumber.</p></div></li><li><span>02</span><div><h3>Linimasa bukti</h3><p>{incident.event_ids.length} peristiwa terkait beserta konteks investigasinya.</p></div></li><li><span>03</span><div><h3>Perbandingan skenario</h3><p>Pembatasan ancaman, sisa jangkauan, dan dampak pada layanan.</p></div></li><li><span>04</span><div><h3>Batasan model</h3><p>Kebijakan firewall yang dideklarasikan; tanpa validasi tingkat paket.</p></div></li></ol><button className="button primary" disabled={busy || loading || !presets.length} onClick={() => void download()}><Icon name="download" size={17} />{busy ? 'Menyiapkan laporan…' : loading ? 'Memeriksa layanan…' : 'Unduh laporan investigasi'}</button><p className="muted report-disclaimer">Laporan dibuat oleh layanan yang terhubung. Hasil skenario berasal dari simulator, bukan perhitungan di browser.</p></div></section>
  </>;
}
