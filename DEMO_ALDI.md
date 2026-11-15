# Panduan demo Aldi / B

URL: https://dwirupa.duckdns.org. Peran B: menjalankan frontend dan menjelaskan investigasi. Fadil/A menjelaskan Cyber Twin; Arya/C menjelaskan API dan deployment.

Rundown ini adalah usulan latihan 4 menit. Durasi resmi kompetisi dan blueprint adegan 1–10 belum tersedia di checkout; cocokkan sebelum merekam video final.

## Persiapan

- Buka URL dari laptop dan ponsel tim melalui DNS normal. Pengujian sebelumnya memerlukan pemetaan DNS lokal sementara; pastikan jaringan presentasi tidak memiliki kendala yang sama.
- Pastikan Operasi menunjukkan 19 peristiwa, 8 aset, dan 2 insiden pada fixture lengkap. Klik **Perbarui data**.
- Pilih insiden dengan aset awal **SRV-APP**. Jangan menebak ID `INC-0001`: setelah reset, ID berubah.
- Hindari reset saat demo utama. Jika replay diperlukan, koordinasikan dengan tim, masukkan token sebelum perekaman, lalu Ulangi → konfirmasi → Lanjutkan → Muat sisa skenario. Reset menghapus event API dalam memori workspace bersama.
- Simpan laporan dan rekaman cadangan sebelum tampil. Tutup panel jaringan/devtools, terminal, serta pengelola rahasia sebelum merekam.

## Urutan klik dan narasi

| Waktu usulan | Operator dan layar | Klik / bukti yang ditunjukkan | Narasi yang bisa diucapkan |
| --- | --- | --- | --- |
| 00:00–00:25 | Aldi, Operasi | Tunjukkan metrik dan antrean insiden SRV-APP | “COIP membantu operator menelusuri peristiwa keamanan ke aset dan membandingkan konsekuensi respons. Demo ini memakai data sintetis Wazuh dan Suricata.” |
| 00:25–01:05 | Aldi, Investigasi | Buka insiden SRV-APP; tunjukkan linimasa dan relasi | “Deteksi endpoint dan jaringan dikaitkan melalui aset atau indikator dalam jendela waktu. Di sini terlihat rangkaian eksploitasi aplikasi, komunikasi C2, dan aktivitas menuju SCADA. Keterkaitan ini belum membuktikan semua aset telah terkompromi.” |
| 01:05–01:35 | Aldi, Bukti | Klik event Wazuh yang relevan; tunjukkan alasan aset, sumber, raw JSON, hash; tutup. Tunjukkan event Suricata dari linimasa | “Operator bisa memeriksa rekaman sumber dan alasan pemetaan aset. Hash mendukung pemeriksaan konsistensi JSON; hash tidak membuktikan keaslian sumber.” |
| 01:35–02:00 | Aldi, Simulasi | Klik Bandingkan respons atau buka Simulasi, lalu Bandingkan semua skenario | “Fadil akan menjelaskan apa yang berubah jika operator memilih respons berbeda. Aplikasi hanya mengusulkan perubahan; tidak mengeksekusi firewall.” |
| 02:00–03:00 | Fadil menjelaskan, Aldi mengklik | Tabel perbandingan; klik baris A, B, lalu C untuk perubahan graf dan layanan | “A mengisolasi SRV-APP: dua alur berbahaya diblokir, tidak ada tujuan tersisa, tetapi Portal mati. B memblokir dua alur teramati: SRV-DB masih terjangkau dan Portal terganggu. C memblokir satu dari dua alur, masih menjangkau C2, dan Portal tetap mati. A mendominasi C pada dua skor model ini.” |
| 03:00–03:30 | Aldi, Laporan | Buka Laporan; klik Unduh laporan investigasi | “Hasil investigasi dapat dibawa keluar sebagai ringkasan, linimasa bukti, perbandingan respons, dan batasan model.” |
| 03:30–04:00 | Arya menjelaskan, Aldi menutup | Tetap pada Laporan; serahkan penjelasan pipeline dan deployment ke Arya | “Simulasi menghitung kebijakan komunikasi dan dependensi layanan yang dideklarasikan. Hasilnya indikatif, tanpa validasi tingkat paket atau prediksi serangan. Data dan deployment demo sudah diuji; konektor sensor nyata belum diverifikasi dalam sesi ini.” |

## Patokan hasil fixture SRV-APP

| Respons | Blokir alur teramati | Sisa jangkauan dari SRV-APP | Portal | Pembatasan / ketersediaan |
| --- | --- | --- | --- | --- |
| A, isolasi | 2/2 | Tidak ada | Tidak tersedia | 100% / 75% |
| B, blokir alur teramati | 2/2 | SRV-DB | Terganggu | 83,33% / 87,5% |
| C, batasi akses segmen | 1/2 | EXT-C2 | Tidak tersedia | 75% / 75% |

Jelaskan sisa jangkauan B meski blokirnya 2/2: yang dihitung adalah alur berbahaya yang teramati, sedangkan kebijakan lain masih mengizinkan jangkauan. Angka skor adalah heuristik model, bukan peluang serangan atau ukuran efektivitas di jaringan nyata.

## Jika demo terganggu

1. Jika API lambat, coba Perbarui data satu kali. Jika tetap gagal, putar rekaman cadangan dan nyatakan bahwa itu rekaman pengujian sebelumnya.
2. Jika ID tidak ditemukan setelah reset, perbarui data dan pilih insiden berdasarkan aset SRV-APP.
3. Jika token ditolak, gunakan fixture yang sudah termuat untuk investigasi, simulasi, dan laporan. Pemutaran ulang memerlukan token valid.
4. Jika hasil tidak sesuai tabel, jangan mengubah angka untuk presentasi. Periksa apakah memilih insiden dan fixture yang benar bersama Fadil.

## Checklist latihan tim

- [ ] Aldi menjalankan seluruh urutan tanpa mencari-cari tombol.
- [ ] Fadil menjelaskan residual exposure B dan dominasi C oleh A.
- [ ] Arya menjelaskan normalisasi, korelasi, API, dan deployment sesuai implementasi.
- [ ] Pergantian pembicara dan durasi diukur dalam satu latihan lengkap.
- [ ] Domain terbuka melalui koneksi normal pada perangkat presentasi dan jaringan cadangan.
- [ ] Tim memeriksa rekaman, menambahkan narasi, dan menyesuaikannya dengan aturan video kompetisi.

Rekaman cadangan tanpa audio bukan bukti bahwa latihan bertiga atau video submission telah selesai.
