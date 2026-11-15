import type { Asset, CoipEvent, CompareResult, Incident, Intervention, Overview, SimulationResult, Topology } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let operatorToken = "";
export function setOperatorToken(value: string) { operatorToken = value; }

const base = (import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(operatorToken && path.startsWith('/ingest/') ? { Authorization: `Bearer ${operatorToken}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    let detail = `Permintaan gagal (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* A proxy failure can return HTML instead of JSON. */ }
    throw new ApiError(detail, response.status);
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('Server mengirim halaman, bukan data API. Periksa koneksi API.', response.status);
  }
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  overview: () => request<Overview>('/overview'),
  assets: () => request<Asset[]>('/assets'),
  asset: (id: string) => request<Asset & { events: CoipEvent[]; flows: Topology['flows']; services: Topology['services'] }>(`/assets/${encodeURIComponent(id)}`),
  events: () => request<CoipEvent[]>('/events'),
  event: (id: string) => request<CoipEvent>(`/events/${encodeURIComponent(id)}`),
  incident: (id: string) => request<Incident>(`/incidents/${encodeURIComponent(id)}`),
  topology: () => request<Topology>('/topology'),
  reset: () => post<Overview['replay']>('/ingest/reset'),
  step: (n = 1) => post<Overview['replay']>(`/ingest/step?n=${n}`),
  presets: (id: string) => request<Intervention[]>(`/twin/presets?incident_id=${encodeURIComponent(id)}`),
  simulate: (id: string, intervention: Intervention) => post<SimulationResult>('/twin/simulate', { incident_id: id, intervention }),
  compare: (id: string, interventions: Intervention[]) => post<CompareResult>('/twin/compare', { incident_id: id, interventions }),
  report: (id: string, interventions: Intervention[]) => post<{ filename: string; markdown: string; html: string }>('/reports', { incident_id: id, interventions }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'Layanan ini belum tersedia pada API yang terhubung.';
  if (error instanceof Error && error.name === 'TimeoutError') return 'API terlalu lama merespons. Coba kembali saat layanan tersedia.';
  if (error instanceof Error && error.message !== 'Failed to fetch') return error.message;
  return 'API tidak dapat dijangkau. Periksa koneksi backend, lalu coba kembali.';
}
