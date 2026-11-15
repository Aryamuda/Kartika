import assert from 'node:assert/strict';

export async function checkLiveTwin(page, origin) {
  await page.unrouteAll({ behavior: 'wait' });
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  try {
    await page.goto(`${origin}/#twin/INC-0001`);
    await page.reload();
    await page.getByRole('button', { name: 'Bandingkan semua skenario', exact: true }).waitFor();
    const comparisonResponse = page.waitForResponse(response => response.url().endsWith('/api/twin/compare'));
    await page.getByRole('button', { name: 'Bandingkan semua skenario', exact: true }).click();
    const response = await comparisonResponse;
    assert.equal(response.status(), 200);
    const comparison = await response.json();
    assert.equal(comparison.results.length, 3);
    await page.getByRole('heading', { name: 'Perbandingan skenario', exact: true }).waitFor();
    const rows = await page.locator('tbody tr').allTextContents();
    assert.match(rows[0], /2 \/ 2Tidak adaOperator Portal: tidak tersedia/);
    assert.match(rows[1], /2 \/ 2SRV-DBOperator Portal: terganggu/);
    assert.match(rows[2], /1 \/ 2EXT-C2Operator Portal: tidak tersedia/);
    assert.match(rows[2], /Didominasi Isolasi SRV-APP/);
    for (let index = 0; index < 3; index++) {
      const simulationResponse = page.waitForResponse(result => result.url().endsWith('/api/twin/simulate'));
      await page.locator('.preset-card').nth(index).click();
      const actualResponse = await simulationResponse;
      assert.equal(actualResponse.status(), 200);
      const actual = await actualResponse.json();
      assert.equal(actual.scenario_name, comparison.results[index].scenario_name);
      await page.getByRole('heading', { name: `Hasil kebijakan / ${['Isolasi SRV-APP', 'Blokir alur teramati', 'Batasi akses segmen'][index]}`, exact: true }).waitFor();
      assert.equal(await page.locator('.graph-edge.is-removed').count(), [6, 2, 2][index]);
    }
    await page.getByRole('button', { name: 'B. Blokir alur teramati', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    }
    await page.locator('nav a[href^="#reports"]').click();
    const reportResponse = page.waitForResponse(result => result.url().endsWith('/api/reports'));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh laporan investigasi', exact: true }).click();
    const reportHttp = await reportResponse;
    assert.equal(reportHttp.status(), 200);
    const report = await reportHttp.json();
    assert.match(report.markdown, /Ringkasan insiden/);
    assert.match(report.markdown, /EVT-0005/);
    assert.match(report.markdown, /Didominasi/);
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'INC-0001.md');
    assert.equal(await download.failure(), null);
    assert.deepEqual(errors, []);
    return {
      mode: 'API asli; tidak memasang mock atau route interception',
      rows,
      scores: comparison.results.map(result => ({ scenario: result.scenario_name, ...result.scores })),
      reportDownload: download.suggestedFilename(),
      reportHtml: report.html,
      javascriptErrors: errors,
    };
  } finally {
    page.off('pageerror', onError);
  }
}
