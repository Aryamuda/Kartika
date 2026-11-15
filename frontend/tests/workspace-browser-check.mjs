// Run against the isolated, fully loaded synthetic backend. Does not reset shared data.
export async function checkWorkspace(page, origin) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  const checks = [];
  page.on('pageerror', onError);
  try {
    await page.goto(`${origin}/#operations`);
    await page.getByRole('heading', { name: 'Peta operasi', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pilih lokasi Control Site, Bandung', exact: true }).click();
    assert(await page.locator('.incident-card').count() === 1, 'Bandung must show only its related incident');
    assert(!(await page.locator('tbody').innerText()).includes('WS-02'), 'Location filter must exclude unrelated events');
    await page.getByRole('button', { name: 'Seluruh Indonesia', exact: true }).click();
    assert(await page.locator('.site-map svg path').count() === 38, 'All province shapes must be present');
    await page.getByRole('button', { name: 'Fokus lokasi', exact: true }).click();
    await page.getByRole('button', { name: 'Semua lokasi', exact: true }).click();
    assert(await page.locator('.incident-card').count() === 2, 'Clearing location must restore incidents');
    checks.push('Peta, 38 provinsi, filter lokasi, pemulihan filter');
    for (const width of [375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      await page.waitForFunction(() => {
        const svg = document.querySelector('.site-map svg');
        const box = svg.getBoundingClientRect(), view = svg.viewBox.baseVal;
        return Math.abs(box.width / box.height - view.width / view.height) < .01;
      });
      const layout = await page.evaluate(() => {
        const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; };
        return { map: box('.map-panel'), summary: box('.metrics-grid'), incidents: box('.operations-incidents') };
      });
      if (width >= 1280) {
        assert(layout.summary.x < layout.map.x && layout.map.x < layout.incidents.x, 'Desktop map must sit between summary and incidents');
        assert(layout.map.width > layout.incidents.width && layout.map.width > layout.summary.width, 'Map must be the largest desktop panel');
      } else if (width < 900) {
        assert(layout.map.y < layout.summary.y && layout.summary.y < layout.incidents.y, 'Narrow layout must show map before summary and incidents');
      }
    }
    checks.push('Peta di tengah desktop, pertama di ponsel; rasio geografis konsisten setelah resize');

    await page.locator('.incident-card').first().click();
    await page.getByRole('heading', { name: 'Rekaman asli', exact: true }).waitFor();
    await page.locator('.timeline-event').nth(1).click();
    await page.waitForFunction(() => document.querySelector('.evidence-detail .raw-record')?.textContent.includes('agent'));
    assert(await page.locator('.evidence-detail .hash').innerText() !== '', 'Selected evidence must include provenance hash');
    assert(await page.locator('.is-evidence-selected').count() > 0, 'Selected evidence must highlight its relationship');
    await page.locator('.graph-assets').getByRole('button', { name: 'SRV-SCADA', exact: true }).click();
    assert(await page.locator('.timeline li').count() === 4, 'Node filter must retain only matching evidence');
    await page.getByRole('button', { name: 'Hapus filter simpul', exact: true }).click();
    assert(await page.locator('.timeline li').count() === 13, 'Clearing node must restore timeline');
    await page.getByRole('combobox', { name: 'Investigasi', exact: true }).selectOption('INC-0002');
    await page.waitForFunction(() => document.querySelectorAll('.timeline li').length === 2);
    assert(!(await page.locator('.evidence-detail').innerText()).includes('EVT-0006'), 'Switching incident must clear previous evidence');
    checks.push('Pemilihan bukti, JSON asli, hash, sorotan graf, filter simpul, pergantian insiden');

    await page.goto(`${origin}/#twin/INC-0001`);
    await page.getByRole('button', { name: 'Bandingkan semua skenario', exact: true }).click();
    await page.getByRole('heading', { name: 'Hasil simulasi', exact: true }).waitFor();
    const outcomes = [];
    for (const [index, removed, reach] of [[0, 6, 'Tidak ada'], [1, 2, 'SRV-DB'], [2, 2, 'EXT-C2']]) {
      await page.locator('tbody .text-button').nth(index).click();
      assert(await page.locator('.policy-pane').count() === 2, 'Before and after must both be visible');
      assert(await page.locator('.policy-pane').first().locator('.is-removed').count() === 0, 'Baseline must not contain removed flows');
      assert(await page.locator('.policy-pane').last().locator('.is-removed').count() === removed, 'Simulation must identify removed flows');
      assert((await page.locator('.simulation-outcome').innerText()).includes(reach), 'Remaining reach must match selected scenario');
      outcomes.push(await page.locator('.simulation-outcome').innerText());
    }
    assert(new Set(outcomes).size === 3, 'The three presets must show distinct outcomes');
    checks.push('Dua graf, tiga konsekuensi berbeda, alur dihapus, sisa jangkauan');

    for (const id of ['operations', 'investigations', 'twin', 'infrastructure', 'reports']) {
      await page.goto(`${origin}/#${id}/INC-0001`);
      await page.locator('.panel, .report-layout').first().waitFor();
      for (const width of [375, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 950 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id} overflows at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 375, height: 850 });
    await page.goto(`${origin}/#investigations/INC-0001`);
    await page.getByRole('button', { name: 'Baca bukti', exact: true }).click();
    assert(await page.evaluate(() => document.activeElement.id === 'selected-evidence'), 'Mobile evidence shortcut must move focus');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await page.locator('.button').first().evaluate(element => getComputedStyle(element).transitionDuration) === '0s', 'Reduced motion must disable transitions');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    checks.push('Lima halaman × lima lebar; pintasan bukti ponsel; pengurangan gerak');
    assert(errors.length === 0, errors.join('\n'));
    return { checks, javascriptErrors: errors, outcomes };
  } finally {
    page.off('pageerror', onError);
  }
}
