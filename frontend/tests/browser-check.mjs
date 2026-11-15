import assert from 'node:assert/strict';

// Run only against an isolated synthetic lab: this checks the shared replay reset.
export async function checkFrontend(page, origin, operatorToken) {
  const pageErrors = [];
  const onError = error => pageErrors.push(error.message);
  page.on('pageerror', onError);
  const checks = [];
  const nav = id => page.locator(`nav a[href^="#${id}"]`).click();
  try {
    await page.goto(`${origin}/#operations`);
    await page.getByRole('heading', { name: 'Antrean insiden', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'id');
    assert.deepEqual(await page.locator('.metric > strong').allTextContents(), ['02', '08', '19', '03']);

    await page.getByRole('textbox', { name: 'Cari peristiwa', exact: true }).fill('NO_MATCH');
    assert.equal(await page.getByRole('heading', { name: 'Tidak ada peristiwa yang cocok', exact: true }).isVisible(), true);
    await page.getByRole('textbox', { name: 'Cari peristiwa', exact: true }).fill('');
    await page.getByRole('combobox', { name: 'Sumber peristiwa', exact: true }).selectOption('suricata');
    assert.equal(await page.locator('tbody tr').count(), 9);
    await page.getByRole('combobox', { name: 'Sumber peristiwa', exact: true }).selectOption('');
    await page.getByRole('combobox', { name: 'Keparahan peristiwa', exact: true }).selectOption('high');
    assert.equal(await page.locator('tbody tr').count() > 0, true);
    assert.equal((await page.locator('tbody .badge').allTextContents()).every(value => value === 'Tinggi'), true);
    await page.getByRole('combobox', { name: 'Keparahan peristiwa', exact: true }).selectOption('');
    await page.getByRole('button', { name: 'Waktu / WIB', exact: false }).click();
    assert.match(await page.locator('tbody tr').first().innerText(), /EVT-0001/);
    await page.getByRole('button', { name: 'Keparahan', exact: false }).click();
    assert.equal(await page.locator('tbody .badge').first().innerText(), 'Tinggi');
    checks.push('Bahasa, metrik, filter, pengurutan');

    await page.getByRole('button', { name: 'Periksa EVT-0019', exact: true }).click();
    await page.getByRole('heading', { name: 'Rekaman asli', exact: true }).waitFor();
    assert.match(await page.locator('.raw-record').innerText(), /"agent"/);
    for (let index = 0; index < 8; index++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Periksa EVT-0019');
    checks.push('Bukti asli, fokus dialog, Escape, pemulihan fokus');

    await nav('investigations');
    await page.getByRole('heading', { name: 'Linimasa bukti', exact: true }).waitFor();
    assert.equal(await page.locator('.timeline li').count(), 13);
    await page.locator('.original-summary summary').click();
    assert.equal(await page.locator('.original-summary h3').isVisible(), true);
    await page.locator('.relationship-list summary').first().click();
    assert.equal(await page.locator('.relationship-body').first().isVisible(), true);
    await page.locator('.graph-assets').getByRole('button', { name: 'SRV-SCADA', exact: true }).click();
    assert.equal(await page.locator('.timeline li').count(), 4);
    await page.getByRole('button', { name: 'Hapus filter simpul', exact: true }).click();
    await page.getByRole('combobox', { name: 'Investigasi', exact: true }).selectOption('INC-0002');
    await page.waitForFunction(() => location.hash.includes('INC-0002'));
    await page.reload();
    await page.getByRole('heading', { name: 'Linimasa bukti', exact: true }).waitFor();
    assert.equal(await page.locator('.timeline li').count(), 2);
    checks.push('Graf, filter simpul, insiden kedua, tautan langsung');

    await nav('infrastructure');
    await page.getByRole('combobox', { name: 'Lokasi aset', exact: true }).selectOption('site-jkt');
    assert.equal(await page.locator('tbody tr').count(), 4);
    await page.getByRole('combobox', { name: 'Lokasi aset', exact: true }).selectOption('');
    await page.getByRole('textbox', { name: 'Cari aset', exact: true }).fill('SRV-APP');
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.locator('tbody').getByRole('button', { name: 'SRV-APP', exact: true }).click();
    await page.getByRole('heading', { name: 'Bukti terkait (13)', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    checks.push('Pencarian dan detail aset');

    await page.route('**/api/twin/presets?*', route => route.fulfill({ status: 404, json: { detail: 'Not Found' } }));
    await page.goto(`${origin}/#twin/INC-0001`);
    await page.getByRole('heading', { name: 'Menunggu pilihan dari simulator', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Bandingkan semua skenario', exact: true }).isDisabled(), true);
    await nav('reports');
    await page.getByRole('button', { name: 'Periksa ulang layanan', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Unduh laporan investigasi', exact: true }).isDisabled(), true);
    await page.unroute('**/api/twin/presets?*');
    checks.push('Status layanan simulator/laporan yang belum tersedia');

    await nav('operations');
    assert.ok(operatorToken, 'Provide the isolated backend operator token for replay checks');
    await page.getByLabel('Token operator', { exact: true }).fill(operatorToken);
    await page.getByRole('button', { name: 'Ulangi', exact: true }).click();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    assert.equal(await page.locator('.metric > strong').nth(2).innerText(), '19');
    await page.getByRole('button', { name: 'Ulangi', exact: true }).click();
    await page.getByRole('button', { name: 'Mulai ulang skenario', exact: true }).click();
    await page.getByRole('heading', { name: 'Belum ada insiden terbentuk', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.metric > strong')[2].textContent === '01');
    await page.getByRole('button', { name: 'Muat sisa skenario', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.metric > strong')[2].textContent === '19');
    checks.push('Konfirmasi, pembatalan, reset, langkah tunggal, pemulihan skenario');

    for (const id of ['operations', 'investigations', 'infrastructure', 'twin', 'reports']) {
      await nav(id);
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${id} melebar pada ${width}px`);
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.button').first().evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    checks.push('Lima halaman pada empat lebar layar; pengurangan gerak');

    await page.route('**/api/overview', route => route.abort());
    await page.goto(`${origin}/#operations`);
    await page.reload();
    await page.getByRole('heading', { name: 'Ruang kerja belum terhubung', exact: true }).waitFor();
    await page.unroute('**/api/overview');
    await page.getByRole('button', { name: 'Hubungkan kembali', exact: true }).last().click();
    await page.getByRole('heading', { name: 'Antrean insiden', exact: true }).waitFor();
    checks.push('Kegagalan API dan pemulihan koneksi');

    await page.reload();
    await page.getByRole('heading', { name: 'Antrean insiden', exact: true }).waitFor();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    checks.push('Tautan lewati navigasi dengan keyboard');

    assert.deepEqual(pageErrors, []);
    return { checks, javascriptErrors: pageErrors };
  } finally {
    await page.unrouteAll({ behavior: 'wait' });
    page.off('pageerror', onError);
  }
}
