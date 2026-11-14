import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, formatDate, formatTime, incidentLabel, interventionLabel, siteSummary, sortEvents } from '../src/utils.ts';
import { api, ApiError, errorMessage, request } from '../src/api.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const events = [
  { id: 'EVT-1', source: 'wazuh', severity: 'high', title: 'Shell spawned', primary_asset: 'SRV-APP', src_ip: null, dst_ip: null, assets: [{ asset_id: 'SRV-APP' }] },
  { id: 'EVT-2', source: 'suricata', severity: 'medium', title: 'Network activity', primary_asset: null, src_ip: '203.0.113.45', dst_ip: '10.0.0.1', assets: [{ asset_id: 'SRV-SCADA' }] },
];

test('event filters intersect search, source and severity, without mutating the snapshot', () => {
  assert.deepEqual(filterEvents(events, ' srv-app ', 'wazuh', 'high').map(event => event.id), ['EVT-1']);
  assert.equal(filterEvents(events, 'srv-app', 'suricata', '').length, 0);
  assert.equal(events.length, 2);
});

test('event search includes linked target assets, IPs, and unmapped events', () => {
  assert.equal(filterEvents(events, 'scada', '', '')[0].id, 'EVT-2');
  assert.equal(filterEvents(events, '203.0.113.45', '', '')[0].id, 'EVT-2');
  assert.equal(filterEvents(events, 'missing', '', '').length, 0);
});

test('site status counts only declared assets at the selected site', () => {
  const assets = [{ id: 'A', site: 'jkt' }, { id: 'B', site: 'jkt' }, { id: 'C', site: 'bdg' }];
  assert.deepEqual(siteSummary(assets, { A: { status: 'targeted' }, B: { status: 'healthy' }, C: { status: 'compromised' } }, 'jkt'), { total: 2, attention: 1 });
  assert.deepEqual(siteSummary(assets, {}, 'missing'), { total: 0, attention: 0 });
});

test('time and date use WIB even across a UTC date boundary', () => {
  assert.equal(formatTime('2026-11-14T20:30:00Z'), '03:30:00');
  assert.equal(formatDate('2026-11-14T20:30:00Z'), '15 Nov 2026');
  assert.equal(formatTime('bad'), 'Waktu tidak diketahui');
  assert.equal(formatDate('bad'), 'Tanggal tidak diketahui');
});

test('comparison sends the contract body to the real API path', async () => {
  const interventions = [{ type: 'block_flows', flow_ids: ['f08', 'f09'] }];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/twin/compare');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), { incident_id: 'INC-0001', interventions });
    return Response.json({ incident_id: 'INC-0001', results: [], dominated: {} });
  };
  assert.equal((await api.compare('INC-0001', interventions)).incident_id, 'INC-0001');
});

test('HTTP failures preserve status and produce honest unavailable-service feedback', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Not Found' }, { status: 404 });
  await assert.rejects(() => api.presets('INC-0001'), cause => {
    assert.equal(cause.status, 404);
    assert.match(errorMessage(cause), /belum tersedia/);
    return true;
  });
});

test('a hosting fallback page cannot masquerade as successful API data', async () => {
  globalThis.fetch = async () => new Response('<html>App</html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(() => request('/overview'), /bukan data API/);
});

test('error handling tolerates HTML failures and network outages', async () => {
  globalThis.fetch = async () => new Response('Bad gateway', { status: 502 });
  await assert.rejects(() => request('/events'), cause => cause instanceof ApiError && cause.status === 502);
  assert.match(errorMessage(new TypeError('Failed to fetch')), /tidak dapat dijangkau/);
});

test('IDs are escaped before being placed in API paths', async () => {
  globalThis.fetch = async url => {
    assert.equal(url, '/api/events/EVT%2F1%3Fx%3D2');
    return Response.json({ id: 'EVT/1?x=2' });
  };
  await api.event('EVT/1?x=2');
});

test('severity sorting follows severity rank rather than alphabetical order', () => {
  const sorted = sortEvents([...events, { ...events[0], id: 'EVT-3', severity: 'critical' }], 'severity', true);
  assert.deepEqual(sorted.map(event => event.severity), ['critical', 'high', 'medium']);
  assert.equal(events[0].id, 'EVT-1');
});

test('time sorting compares instants across timezone offsets', () => {
  const input = [{ ...events[0], ts: '2026-11-15T08:00:00+07:00' }, { ...events[1], ts: '2026-11-15T00:30:00Z' }];
  assert.deepEqual(sortEvents(input, 'ts', false).map(event => event.id), ['EVT-2', 'EVT-1']);
});

test('intervention labels are Indonesian without changing API identifiers', () => {
  assert.equal(interventionLabel({ type: 'isolate_asset', asset_id: 'SRV-APP' }), 'Isolasi SRV-APP');
  assert.equal(interventionLabel({ type: 'block_flows', flow_ids: ['f08'] }), 'Blokir alur teramati');
  assert.equal(interventionLabel({ type: 'block_segment_access', segment: 'seg-ops' }), 'Batasi akses segmen');
});

test('incident headings are Indonesian and tolerate unmapped assets', () => {
  assert.equal(incidentLabel({ id: 'INC-0001', primary_asset: 'SRV-APP' }), 'Investigasi aset SRV-APP');
  assert.equal(incidentLabel({ id: 'INC-0002', primary_asset: null }), 'Investigasi INC-0002');
});
