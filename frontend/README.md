# Frontend COIP

Antarmuka operator berbahasa Indonesia dengan React, TypeScript, Vite, dan Tailwind CSS. Pilihan tema dan alasan desain ada di [DESIGN.md](./DESIGN.md). Kontrak data tetap mengikuti `../CONTRACT.md` dan `src/types.ts`.

## Menjalankan secara lokal

Gunakan Node.js 24 atau lebih baru untuk menjalankan pengujian TypeScript melalui test runner bawaan Node. Instal dependensi frontend dari folder ini:

```powershell
npm.cmd ci
npm.cmd run dev
```

Buka alamat yang dicetak Vite, biasanya `http://127.0.0.1:5173`. Proxy pengembangan meneruskan `/api/*` ke `http://127.0.0.1:8000` tanpa menghapus prefiks `/api`.

API dijalankan dari **root repo**, pada terminal terpisah. Gunakan lingkungan Python proyek yang sudah tersedia. Jika belum ada, contoh berikut membuat lingkungan terisolasi di folder frontend:

```powershell
python -m venv frontend/.venv
frontend/.venv/Scripts/python.exe -m pip install -r requirements.txt
frontend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

## Build dan pemeriksaan

Jalankan dari folder `frontend`:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Build memeriksa TypeScript sebelum menghasilkan `dist/`. Preview juga meneruskan `/api/*` ke API lokal. Dependensi dicatat dalam `package-lock.json`; tidak ada pustaka grafik atau animasi tambahan.

## Integrasi deployment untuk C

- Sajikan isi `frontend/dist/` sebagai berkas statis.
- Arahkan `/api/*` ke backend **sebelum** fallback halaman frontend. Jangan mengembalikan `index.html` untuk permintaan API.
- Routing frontend menggunakan hash, sehingga tautan seperti `/#investigations/INC-0001` tetap dapat dimuat ulang.
- Untuk API pada origin terpisah, salin `.env.example` menjadi `.env.local`, isi `VITE_API_BASE_URL` dengan origin backend tanpa akhiran `/api`, lalu build ulang. Contoh: `https://api.example.org`.
- Nilai `VITE_*` masuk ke bundle publik. Jangan masukkan kredensial atau rahasia.
- API pada origin terpisah perlu mengizinkan origin frontend melalui CORS. Hosting yang memakai HTTPS juga memerlukan API HTTPS.

## Fitur dan kontrak

1. **Operasi:** metrik dari API, antrean insiden, ringkasan lokasi, pemutaran skenario, pencarian/filter sumber/keparahan, serta pengurutan waktu dan tingkat keparahan.
2. **Investigasi:** pemilihan insiden, linimasa kronologis, pemfilteran melalui simpul graf, alasan korelasi, faktor risiko, dan modal rekaman asli beserta hash/provenans.
3. **Simulasi:** memuat preset dari `/api/twin/presets`, memanggil `/simulate` atau `/compare`, dan menampilkan blokir ancaman, sisa jangkauan, dampak layanan, dominasi skenario, serta usulan perubahan yang tidak dieksekusi.
4. **Infrastruktur:** inventaris aset siber yang dapat dicari/difilter per lokasi, detail aset beserta buktinya, topologi, dan dependensi layanan.
5. **Laporan:** mengirim `CompareRequest` ke `/api/reports` dan mengunduh respons Markdown. Bahasa isi laporan mengikuti layanan backend.

Pesan log dan ringkasan korelasi asli dapat berbahasa Inggris. Label antarmuka, status, petunjuk, dan waktu menggunakan Bahasa Indonesia/WIB.

## Status integrasi lokal

Branch `feat/aldi-frontend` menggabungkan mesin Cyber Twin Fadil dari commit `1dbd4c1` dengan rute `/api/twin/presets`, `/api/twin/simulate`, `/api/twin/compare`, dan `/api/reports`. Laporan minimal mencakup ringkasan, linimasa bukti beserta hash, perbandingan skenario, serta batasan model. Tersedia keluaran Markdown dan HTML cetak berbahasa Indonesia; data sumber dipertahankan.

Hasil simulator diselaraskan dengan kontrak yang sudah ada: jumlah pasangan jangkauan, jumlah alur sisa, dan jumlah alur sah yang dihapus berupa angka; matriks menggunakan 0/1. Rumus skor dan logika intervensi Fadil tidak diubah. Halaman tetap menyediakan pesan belum tersedia dan tombol coba kembali jika terhubung ke backend versi lama.

API yang telah berjalan sebelum pembaruan perlu dimuat ulang agar rute baru tersedia. Memulai ulang proses backend mengatur ulang data dalam memori; gunakan lab terpisah untuk verifikasi.

Tes backend dijalankan dari root repo dengan lingkungan Python proyek:

```powershell
frontend/.venv/Scripts/python.exe -B -m unittest discover -s backend/tests -v
```

Build frontend tersedia di `frontend/dist/`; petunjuk proxy dan hosting untuk C (Arya) ada pada bagian integrasi deployment di atas.

Memulai ulang skenario menghapus data dalam memori API untuk seluruh pengguna backend tersebut, termasuk peristiwa API-ingested. UI selalu meminta konfirmasi dan menyediakan pilihan Batal.

## Catatan pengujian

`npm.cmd test` menjalankan pengujian filter, pengurutan, zona waktu, ringkasan lokasi, label intervensi, payload API, kegagalan HTTP, dan respons HTML yang keliru. Browser diverifikasi dengan Playwright MCP. Selain pengujian mock yang terisolasi, tiga preset dan unduhan laporan telah diuji terhadap API lab asli tanpa mock.

Lihat [VERIFICATION.md](./VERIFICATION.md) untuk hasil pemeriksaan dan batas verifikasinya.

Pemeriksaan browser yang dapat digunakan ulang tersedia sebagai fungsi penerima objek Playwright `page`:

- `tests/browser-check.mjs`: `checkFrontend(page, origin)`, memeriksa alur utama dan koneksi gagal. Jalankan hanya pada backend lab terisolasi karena pengujian ini mengonfirmasi reset pemutaran.
- `tests/twin-browser-check.mjs`: `checkTwinRendering(page, origin)`, memakai mock respons untuk menguji tiga hasil berbeda, payload permintaan, dan unduhan laporan.
- `tests/live-twin-browser-check.mjs`: `checkLiveTwin(page, origin)`, memanggil API asli untuk ketiga preset dan laporan, tanpa memasang mock. Jalankan pada lab yang sudah memuat fixture INC-0001.
- `tests/contrast-audit.mjs`: `auditTextContrast`, dijalankan dengan `page.evaluate(auditTextContrast)` untuk teks CSS opak. SVG, kontrol nonaktif, dan teks khusus pembaca layar dikecualikan.

Fungsi tersebut dapat dipakai oleh runner Playwright yang sudah tersedia; paket Playwright tidak ditambahkan ke dependensi aplikasi. Pada pengerjaan ini, fungsi dijalankan melalui Playwright MCP.
