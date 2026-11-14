import assert from 'node:assert/strict';

// Mock responses verify frontend rendering; they do not validate a simulator engine.
export async function checkTwinRendering(page, origin) {
  const presets = [
    { type: 'isolate_asset', name: 'A. Isolate SRV-APP', asset_id: 'SRV-APP' },
    { type: 'block_flows', name: 'B. Block observed flows', flow_ids: ['f08', 'f09'] },
    { type: 'block_segment_access', name: 'C. Block Operations access', source: 'SRV-APP', segment: 'seg-ops' },
  ];
  const definitions = [
    { removed: ['f01', 'f02', 'f03', 'f08', 'f09', 'f10'], blocked: 2, reach: [], status: 'down', containment: 1, availability: 0.75 },
    { removed: ['f08', 'f09'], blocked: 2, reach: ['SRV-DB'], status: 'degraded', containment: 5 / 6, availability: 0.875 },
    { removed: ['f03', 'f08'], blocked: 1, reach: ['EXT-C2'], status: 'down', containment: 0.75, availability: 0.75 },
  ];
  const flows = [
    { id: 'f01', src: 'WS-01', dst: 'SRV-APP', port: 443 },
    { id: 'f02', src: 'WS-02', dst: 'SRV-APP', port: 443 },
    { id: 'f03', src: 'SRV-APP', dst: 'SRV-DB', port: 5432 },
    { id: 'f08', src: 'SRV-APP', dst: 'SRV-SCADA', port: 502 },
    { id: 'f09', src: 'SRV-APP', dst: 'EXT-C2', port: 443 },
    { id: 'f10', src: 'EXT-C2', dst: 'SRV-APP', port: 443 },
  ];
  const results = definitions.map((definition, index) => ({
    scenario_name: presets[index].name, intervention: presets[index],
    removed_flows: flows.filter(flow => definition.removed.includes(flow.id)).map(flow => ({ ...flow, label: 'Fixture pengujian browser', malicious: ['f08', 'f09'].includes(flow.id) })),
    change_set: [{ enforcement_point: 'FW-01', action: index === 0 ? 'QUARANTINE' : 'DENY', rule: 'Fixture pengujian; tidak dieksekusi' }],
    reachability: { pairs_before: 10, pairs_after: 4, compromised_reach_before: ['SRV-DB', 'SRV-SCADA', 'EXT-C2'], compromised_reach_after: definition.reach, matrix: { assets: [], before: [], after: [] } },
    isolation: index === 0 ? { target: 'SRV-APP', isolated: true, remaining_flows: 0 } : null,
    service_availability: [{ service_id: 'svc-portal', name: 'Operator Portal', before: 'available', after: definition.status, reasons: ['Fixture pengujian browser'], users_affected: [] }, { service_id: 'svc-hist', name: 'Telemetry Historian', before: 'available', after: 'available', reasons: [], users_affected: [] }, { service_id: 'svc-scada', name: 'SCADA Control Gateway', before: 'available', after: 'available', reasons: [], users_affected: [] }],
    security_impact: { malicious_total: 2, malicious_blocked: definition.blocked, remaining_flow_ids: index === 2 ? ['f09'] : [], threat_path_interrupted: index !== 2, critical_reachable_before: ['SRV-SCADA'], critical_reachable_after: [] },
    collateral: { legit_flows_removed: definition.removed.length - definition.blocked, services_impacted: ['svc-portal'], assets_affected: [] },
    scores: { containment: definition.containment, availability: definition.availability, method: 'Fixture browser; bukan hasil mesin simulator.' },
    observations: ['Fixture ini hanya memverifikasi tampilan.'],
    limitations: 'Data mock pengujian. Kebijakan yang dideklarasikan; tanpa validasi tingkat paket.',
  }));
  const comparison = { incident_id: 'INC-0001', results, dominated: { [presets[2].name]: presets[0].name } };
  const requests = [];
  const javascriptErrors = [];
  const onError = error => javascriptErrors.push(error.message);
  page.on('pageerror', onError);
  try {
    await page.route('**/api/twin/presets?*', route => route.fulfill({ json: presets }));
    await page.route('**/api/twin/compare', route => {
      assert.deepEqual(route.request().postDataJSON(), { incident_id: 'INC-0001', interventions: presets });
      return route.fulfill({ json: comparison });
    });
    await page.route('**/api/twin/simulate', route => {
      const body = route.request().postDataJSON();
      requests.push(body);
      return route.fulfill({ json: results[presets.findIndex(preset => preset.type === body.intervention.type)] });
    });
    await page.route('**/api/reports', route => {
      assert.deepEqual(route.request().postDataJSON(), { incident_id: 'INC-0001', interventions: presets });
      return route.fulfill({ json: { filename: 'INC-0001.md', markdown: '# Fixture laporan browser\nBukan hasil layanan laporan.', html: '<h1>Fixture pengujian</h1>' } });
    });
    await page.goto(`${origin}/#twin/INC-0001`);
    await page.getByRole('button', { name: 'Bandingkan semua skenario', exact: true }).click();
    await page.getByRole('heading', { name: 'Perbandingan skenario', exact: true }).waitFor();
    const rows = await page.locator('tbody tr').allTextContents();
    assert.match(rows[0], /2 \/ 2Tidak adaOperator Portal: tidak tersedia/);
    assert.match(rows[1], /2 \/ 2SRV-DBOperator Portal: terganggu/);
    assert.match(rows[2], /1 \/ 2EXT-C2Operator Portal: tidak tersedia/);
    assert.match(rows[2], /Didominasi Isolasi SRV-APP/);
    for (let index = 0; index < 3; index++) {
      await page.locator('.preset-card').nth(index).click();
      await page.getByRole('heading', { name: `Hasil kebijakan / ${['Isolasi SRV-APP', 'Blokir alur teramati', 'Batasi akses segmen'][index]}`, exact: true }).waitFor();
      assert.equal(await page.locator('.graph-edge.is-removed').count(), definitions[index].removed.length);
      assert.equal(await page.locator('.service-row .badge').first().innerText(), index === 1 ? 'Terganggu' : 'Tidak tersedia');
    }
    assert.equal(requests.length, 3);
    assert.deepEqual(requests.map(request => request.intervention.type), presets.map(preset => preset.type));
    await page.getByRole('button', { name: 'B. Blokir alur teramati', exact: true }).click();
    assert.equal(await page.locator('.graph-edge.is-removed').count(), 2);
    await page.locator('nav a[href^="#reports"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh laporan investigasi', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'INC-0001.md');
    assert.deepEqual(javascriptErrors, []);
    return { rows, individualRequests: requests.length, reportDownload: download.suggestedFilename(), javascriptErrors, mode: 'Mock respons untuk pengujian frontend, bukan validasi simulator.' };
  } finally {
    await page.unrouteAll({ behavior: 'wait' });
    page.off('pageerror', onError);
  }
}
