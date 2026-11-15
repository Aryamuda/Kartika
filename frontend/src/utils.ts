import type { Asset, CoipEvent, Incident, Intervention, Overview } from './types.ts';

export function incidentLabel(incident: Pick<Incident, 'id' | 'primary_asset'>): string {
  return `Investigasi ${incident.primary_asset ? `aset ${incident.primary_asset}` : incident.id}`;
}

export function interventionLabel(intervention: Intervention): string {
  if (intervention.type === 'isolate_asset') return `Isolasi ${intervention.asset_id ?? 'aset'}`;
  if (intervention.type === 'block_flows') return 'Blokir alur teramati';
  return 'Batasi akses segmen';
}

export function filterEvents(events: CoipEvent[], query: string, source: string, severity: string): CoipEvent[] {
  const term = query.trim().toLowerCase();
  return events.filter(event =>
    (!source || event.source === source) && (!severity || event.severity === severity) &&
    (!term || [event.id, event.title, event.primary_asset, event.src_ip, event.dst_ip, ...event.assets.map(asset => asset.asset_id)]
      .some(value => value?.toLowerCase().includes(term))),
  );
}

export function siteSummary(assets: Asset[], statuses: Overview['asset_status'], site: string) {
  const members = assets.filter(asset => asset.site === site);
  return { total: members.length, attention: members.filter(asset => statuses[asset.id] && statuses[asset.id].status !== 'healthy').length };
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waktu tidak diketahui';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak diketahui';
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function sortEvents(events: CoipEvent[], key: 'ts' | 'severity', descending: boolean): CoipEvent[] {
  const rank: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  return [...events].sort((a, b) => {
    const difference = key === 'ts' ? Date.parse(a.ts) - Date.parse(b.ts) : rank[a.severity] - rank[b.severity];
    return (descending ? -1 : 1) * difference;
  });
}

export function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
