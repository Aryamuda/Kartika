# Verifikasi frontend COIP

Tanggal: 15 November 2026, WIB. Lingkup: frontend B dan integrasi lokal setelah pembaruan Fadil `1dbd4c1` digabungkan pada branch `feat/aldi-frontend`. Model Python dan `src/types.ts` dipertahankan. Backend kini memiliki penghubung API dan ekspor minimal; serialisasi hasil Twin diselaraskan dengan kontrak tanpa mengubah rumus skor.

## Hasil pemeriksaan

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| `npm.cmd ci` | PASS | Instalasi lockfile berhasil; audit instalasi: 0 kerentanan. |
| `npm.cmd test` | PASS | 13 tes, 13 lulus, 0 gagal. |
| `npm.cmd run build` | PASS | TypeScript tanpa error; Vite menghasilkan bundle produksi. |
| Tes awal Fadil sebelum perubahan integrasi | PASS | Dua tes skenario/dominasi dan validasi/arah lulus. |
| Tes regresi tipe sebelum perbaikan | RED terkonfirmasi | Menangkap daftar pada field jumlah dan boolean pada matriks yang seharusnya numerik. |
| `python -B -W error::ResourceWarning -m unittest discover -s backend/tests -v` | PASS | 9 tes backend, termasuk HTTP nyata, ingest/replay, dan ekspor yang di-escape, tanpa ResourceWarning. |
| `checkFrontend(page, origin)` melalui Playwright MCP | PASS | Sembilan kelompok pemeriksaan; tidak ada `pageerror` JavaScript. |
| `checkTwinRendering(page, origin)` melalui Playwright MCP | PASS | Tiga payload simulasi, tiga hasil berbeda, dominasi C oleh A, dua garis diblokir pada B, serta unduhan `INC-0001.md`. |
| `checkLiveTwin(page, origin)` melalui Playwright MCP | PASS | API asli, tanpa mock: tiga simulasi individual dan perbandingan HTTP 200, C didominasi A, serta unduhan laporan asli berhasil. |
| Responsif | PASS | Lima halaman diuji pada 375, 768, 1024, dan 1440 px; tidak ada pelebaran dokumen. Tabel menggulir dalam panel. |
| Audit teks CSS | PASS | Operasi: 232 node; Investigasi: 219; Infrastruktur: 124; Simulasi: 53; Laporan: 58. Rasio terendah 4,5937:1; tidak ada kegagalan pada cakupan audit. |
| Teks graf SVG | PASS | Label simpul 10,73:1; jenis simpul 7,11:1; label alur 12,82:1. |
| Batas kontrol dan fokus | PASS | Tombol sekunder 3,30:1; select 3,62:1; chip 3,50:1; fokus 12,30:1; penanda navigasi aktif 9,04:1. |
| Pemeriksaan visual | PASS | Tangkapan layar desktop 1440 px dan ponsel 375 px diperiksa; konten dan navigasi tersusun, tanpa pelebaran halaman. |
| Detail seluruh fixture | PASS | Seluruh 19 dialog bukti dan 8 dialog aset berhasil dimuat dari API nyata. |
| Pemeriksaan akhir | PASS | Setelah revisi CSS terakhir: 20 kombinasi halaman/lebar layar tanpa overflow; halaman Operasi dimuat ulang dengan 0 error dan 0 peringatan konsol. |

Pemeriksaan browser memakai API lab terpisah pada port 8011 agar reset tidak memengaruhi ruang kerja utama. Frontend dari repo dijalankan pada port 5174 saat verifikasi. Angka port pengujian tidak ditanamkan ke bundle produksi; konfigurasi standar tetap menggunakan proxy lokal pada port 8000.

`checkFrontend` memeriksa metrik fixture 2 insiden/8 aset/19 peristiwa/3 aset perlu ditinjau, pencarian kosong, filter sumber/keparahan, pengurutan, rekaman JSON, fokus dialog, Escape, pemulihan fokus, pemfilteran graf, tautan insiden kedua, detail aset, reset yang dikonfirmasi/dibatalkan, pemuatan ulang skenario, pengurangan gerak, koneksi gagal/pulih, dan tautan lewati navigasi. Respons 404 untuk layanan belum tersedia dan kegagalan jaringan sengaja diuji; hal tersebut dibedakan dari error JavaScript.

## Batas pemeriksaan perubahan setelah snapshot

Hasil di atas mendokumentasikan versi sebelum akses replay publik ditambahkan. Perubahan `COIP_PUBLIC_DEMO_REPLAY`, cooldown reset anonim, dan penghapusan kolom token UI belum tercakup dalam hasil PASS tersebut.

## Batas bukti

- API baca dan pemutaran diuji dengan implementasi backend dan fixture repo yang sebenarnya.
- Pengujian awal frontend memakai mock untuk simulator/laporan. Setelah integrasi, endpoint asli juga diuji melalui HTTP dan browser tanpa mock: A memberi pembatasan 1,0/ketersediaan 0,75; B 0,833333/0,875; C 0,75/0,75. Semua merupakan hasil model kebijakan pada fixture sintetis, bukan validasi tingkat paket.
- Audit kontras otomatis mencakup teks CSS opak; tidak mencakup SVG, kontrol nonaktif, dan teks khusus pembaca layar. Pasangan teks SVG dan batas kontrol diperiksa terpisah menggunakan rumus luminans WCAG.
- Pengujian keyboard dilakukan di Chromium melalui Playwright. Uji pembaca layar, Safari/Firefox, beban produksi, Lighthouse, dan deployment publik belum dilakukan.
- Branch `feat/aldi-frontend` sudah dipush setelah persetujuan pengguna dan [draft PR #1](https://github.com/Aryamuda/Kartika/pull/1) dibuka. Belum ada merge ke main atau deployment publik. Identitas commit memakai identitas yang diberikan pengguna, tanpa mengubah rahasia atau konfigurasi Git global.

## Integrasi yang diuji

- `GET /api/twin/presets?incident_id=INC-0001`, `POST /api/twin/simulate`, `POST /api/twin/compare`, dan `POST /api/reports` terhubung ke mesin Fadil.
- ID tidak ditemukan mengembalikan 404; intervensi tidak valid dan perbandingan kosong mengembalikan 422.
- `pairs_before`/`pairs_after`, jumlah alur sisa, dan jumlah alur sah yang dihapus berupa integer; matriks memakai 0/1.
- Laporan memakai snapshot bukti dan perbandingan yang sama. Nama skenario yang mengandung HTML di-escape; HTML cetak memblokir sumber eksternal melalui CSP.
- Pembagian tugas: Fadil=A, Aldi=B, Arya=C. Build dan dokumentasi siap ditinjau C; deployment publik dan materi submission belum dilakukan.

## Gerbang Anti Slop

Status berikut menilai frontend dalam lingkup di atas; bukan sertifikasi aksesibilitas atau kesiapan produksi.

### Hard Gate

- R-02 PASS: salinan UI yang ditulis tidak menggunakan em dash; log sumber dipertahankan.
- R-03 PASS: lima halaman pada empat lebar layar tanpa pelebaran dokumen; tabel memiliki area gulir sendiri.
- R-17 PASS: seluruh metrik Operasi berasal dari API; nilai fixture diperiksa melalui browser.
- R-18 PASS: tidak ada testimoni atau identitas pelanggan buatan.
- R-23 PASS: data sintetis diizinkan dalam kontrak; tidak ada foto, logo baru, atau identitas tim buatan.
- R-24 PASS: kelima tautan navigasi membuka halaman yang diimplementasikan.
- R-25 PASS: audit teks CSS minimum 4,5937:1; pasangan SVG diperiksa terpisah di atas.
- R-26 PASS: kontrol diuji sesuai alurnya; layanan yang belum tersedia memiliki penjelasan, tombol coba kembali, dan tindakan bergantung layanan yang dinonaktifkan.
- R-27 PASS: keadaan memuat, kosong, gagal, dan pulih tersedia; pencarian kosong serta API gagal/pulih diuji.
- R-28 PASS: tidak ada FAQ pengisi.
- R-32 PASS: fokus keyboard, tautan lewati navigasi, dialog native, Escape, dan pemulihan fokus diuji.
- R-33 PASS: fitur ditulis langsung dalam berkas sumber; tidak ada skrip yang memodifikasi UI saat runtime.
- R-34 PASS: satu tema gelap; tidak ada pengalih tema setengah selesai.
- R-35 PASS: build dijalankan, alur interaksi direkam melalui Playwright, dan hasil mock dibedakan dari API sebenarnya.
- R-36 PASS: tidak ada klaim pencegahan otomatis, keamanan produksi, atau performa yang tidak diukur.
- R-37 PASS: arah konsol operator ditentukan; tema final dan dial ENERGY 1 / RHYTHM 2 / MOTION 1 dicatat di DESIGN.md dan diterapkan pada revisi akhir.
- R-38 PASS: data realistis berasal dari fixture sintetis yang disepakati; mock hanya berada dalam pengujian.
- R-39 PASS: kontrol native bernama, label formulir, fokus terlihat, status teks, pengurangan gerak, `lang=id`, judul halaman, landmark, dan zoom tersedia; tidak ada media tanpa teks alternatif.
- R-40 PASS: tidak ada aset media atau skrip pihak ketiga yang menghambat render; tidak ada angka performa rekaan.

### Purpose Gate

- R-01 PASS: tanpa gradien atau glow.
- R-04 PASS: ikon dipilih berdasarkan fungsi; alasan tercatat di DESIGN.md.
- R-06 PASS: font sistem untuk keterbacaan; monospace hanya untuk data teknis; label kapital kecil membedakan metadata.
- R-07 PASS: tanpa pola latar dekoratif.
- R-08 PASS: panah membuka detail; bukan dekorasi setiap tindakan.
- R-09 PASS: badge menyampaikan status atau tingkat ancaman dari data, tanpa klaim pemasaran.
- R-10 PASS: tanpa glassmorphism.
- R-12 PASS: bayangan hanya memisahkan dialog modal dari konten belakang.
- R-13 PASS: tanpa glow serentak.
- R-14 PASS: struktur kartu preset setara untuk perbandingan A/B/C; alasan tertulis.
- R-19 PASS: transisi warna singkat mendukung interaksi; tidak ada animasi berulang; preferensi pengurangan gerak diuji.
- R-22 PASS: tanpa ilustrasi generik.

### Liveliness

- Dial PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 eksplisit dalam DESIGN.md.
- Konsistensi PASS: tema tenang, panel terstruktur, dan transisi warna mengikuti dial.
- Titik fokus PASS: antrean insiden, linimasa bukti, perbandingan, inventaris, dan ekspor memiliki fokus masing-masing.
- Ruang PASS: jarak memisahkan kelompok tugas; panel menumpuk pada ponsel.
- Aksen PASS: hijau muda untuk tindakan/navigasi; warna risiko hanya bermakna status.
- Identitas PASS: ID insiden/peristiwa, waktu WIB, alur kebijakan, dan urutan A/B/C berulang secara fungsional.
- Pembacaan desain PASS: audiens operator keamanan, gaya Data-Dense Dashboard gelap, dan alasan pemilihan dicatat.

### Craftsmanship dan Quality Locks

- C-1 PASS: pilihan visual memiliki alasan dalam DESIGN.md.
- C-2 PASS: interaksi utama, pemulihan gagal, tiga preset, serta unduhan diuji.
- C-3 PASS: setiap halaman berasal dari tugas B dan kontrak, tanpa bagian pemasaran pengisi.
- C-4 PASS: lima halaman diuji pada empat lebar layar; keyboard, reset, koneksi gagal/pulih, dan pengurangan gerak diperiksa.
- C-5 PASS: tidak ada testimoni, statistik pelanggan, atau klaim manfaat buatan.
- R-05 PASS: susunan mengikuti pekerjaan operator dan data kontrak, bukan pola landing page.
- R-11 PASS: sudut panel, kontrol, dan badge bervariasi sesuai fungsi; tidak seluruhnya berbentuk pil.
- R-15 PASS: tindakan bernama spesifik seperti Perbarui data, Telusuri prioritas, Bandingkan respons, dan Unduh laporan investigasi.
- R-16 PASS: tanpa jargon pemasaran AI.
- R-20 PASS: rangkaian bukti Wazuh/Suricata dan trade-off kebijakan membentuk identitas produk.
- R-21 PASS: alasan tema gelap untuk konsol operator dicatat; tidak ada pengalih tema yang dijanjikan lalu ditunda.
- R-29 PASS: palet netral/hijau dengan aksen utama dan warna semantik ancaman yang konsisten.
- R-30 PASS: tidak menyalin referensi produk lain; tema diturunkan dari gaya CSV yang diminta.
- R-31 PASS: alasan warna, tipografi, ruang, ikon, kartu preset, dan gerak tersedia dalam DESIGN.md.
