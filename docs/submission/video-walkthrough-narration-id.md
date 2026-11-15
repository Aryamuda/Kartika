# Dwirupa — naskah walkthrough aplikasi

Status: draf untuk ditinjau. Menggantikan pendekatan presentasi pada `video-narration-id.md`. Belum menjadi instruksi untuk mengubah motion. Suara direkam sendiri setelah alur dan naskah disepakati.

Target awal: sekitar 4–5 menit termasuk klik, perpindahan, dan jeda membaca hasil; maksimal 10 menit. Estimasi mengikuti latihan baca dan waktu respons aplikasi, bukan durasi scene lama. Bacakan hanya teks di bawah label Ucapan.

Prinsip visual: aplikasi memenuhi layar sejak pembuka. Klik kontrol asli, tunggu hasil muncul, lalu zoom ke detail yang sedang dijelaskan. Kembalikan tampilan sebelum berpindah halaman. Tidak ada slide judul terpisah, screenshot kecil di bingkai presentasi, atau animasi diagram yang menggantikan penggunaan aplikasi. Cursor dan sorotan mengikuti tindakan sebenarnya. Zoom adalah arahan editing, bukan fitur aplikasi.

## 01 — Langsung masuk ke Operasi

**Aksi layar:** mulai pada halaman Operasi dengan fixture lengkap. Tampilkan aplikasi penuh; sorot singkat jumlah insiden dan antreannya. Nama Dwirupa cukup terlihat dari aplikasi.

**Ucapan**

Ini Dwirupa, platform untuk menelusuri insiden dan membandingkan dampak respons keamanan. Kita akan mengikuti satu kasus, dari alert sampai laporan. Seluruh data pada demonstrasi ini sintetis.

Di halaman Operasi, ada dua insiden terbuka. Kita pilih insiden pada server aplikasi, SRV-APP.

## 02 — Klik insiden SRV-APP

**Aksi layar:** klik kartu “Investigasi aset SRV-APP” pada antrean. Setelah Investigasi terbuka, zoom ringkasan insiden dan sumbernya. Jangan membaca ID insiden; ID bisa berubah setelah replay.

**Ucapan**

Insiden ini menghubungkan tiga belas peristiwa: enam dari Wazuh dan tujuh dari Suricata. Bukti dari host dan jaringan dikelompokkan berdasarkan keterkaitan aset atau alamat eksternal dalam rentang waktu tertentu.

Sekarang kita telusuri apa yang mendasari insiden ini.

## 03 — Pilih bukti pada linimasa

**Aksi layar:** zoom Linimasa bukti, tunjukkan urutan waktunya, lalu klik peristiwa Wazuh dengan judul tentang command injection dan HTTP 200. Geser perhatian ke panel Bukti terpilih setelah isinya berubah.

**Ucapan**

Linimasa menyusun peristiwa berdasarkan waktu. Kita pilih deteksi Wazuh ini. Pesannya menunjukkan indikasi eksploitasi pada server aplikasi.

Panel Bukti terpilih menampilkan detail peristiwa serta alasan keterkaitannya dengan aset. Jadi, ringkasan insiden bisa diperiksa kembali melalui bukti sumbernya.

## 04 — Periksa asal-usul dan rekaman asli

**Aksi layar:** gulir panel Bukti terpilih menuju Asal-usul bukti. Sorot Parser, hash, lalu Rekaman asli. Beri jeda singkat pada JSON tanpa membacakannya. Gunakan panel yang tersedia, bukan modal buatan.

**Ucapan**

Kita gulir ke asal-usul bukti. Di sini tersedia informasi parser, hash, dan rekaman asli yang dipertahankan setelah normalisasi.

Hash membantu memeriksa konsistensi rekaman. Keaslian sumber tetap memerlukan verifikasi tersendiri.

## 05 — Telusuri hubungan ke aset OT

**Aksi layar:** kembali ke graf Relasi bukti. Klik simpul atau chip SRV-SCADA untuk menyaring linimasa, lalu pilih deteksi Modbus. Buka rincian relasi terkait bila diperlukan untuk memperlihatkan alasan dan rujukan peristiwa. Buka Konteks aset dan faktor risiko bila menyebut peran aset.

**Ucapan**

Berikutnya, kita pilih SRV-SCADA pada graf. Linimasa tersaring ke peristiwa yang terkait dengan aset tersebut.

Di sini ada aktivitas Modbus dari server aplikasi menuju aset operasional yang kritis. Relasinya dapat ditelusuri ke peristiwa pendukung. Alert ini menjadi dasar pemeriksaan lebih lanjut; perubahan pada proses industri belum dibuktikan.

## 06 — Masuk ke Simulasi

**Aksi layar:** klik Hapus filter simpul, kembalikan tampilan agar navigasi terlihat, lalu klik Bandingkan respons. Pada Simulasi, pastikan insiden SRV-APP tetap terpilih. Sorot tiga preset dan pemberitahuan batas model.

**Ucapan**

Setelah menelusuri buktinya, kita klik Bandingkan respons.

Dwirupa menyediakan tiga pilihan untuk kasus yang sama. Cyber Twin menghitung perubahan pada model koneksi jaringan dan dependensi layanan. Simulasi ini tidak menerapkan perubahan firewall.

## 07 — Jalankan A: Isolasi SRV-APP

**Aksi layar:** klik Isolasi SRV-APP. Tunggu hasil, lalu gulir ke perbandingan Kebijakan awal dan Hasil simulasi. Zoom alur yang dihapus, sisa jangkauan, dan status Portal secara berurutan.

**Ucapan**

Kita jalankan isolasi server aplikasi. Kedua alur berbahaya terblokir, dan tidak ada tujuan yang masih dapat dijangkau dari server tersebut dalam model.

Namun, lihat status Portal: layanan menjadi tidak tersedia. Pembatasan ancaman ini memiliki konsekuensi terhadap layanan.

## 08 — Jalankan B: Blokir alur teramati

**Aksi layar:** kembali ke preset, klik Blokir alur teramati, tunggu hasil. Sorot angka 2/2, SRV-DB sebagai jangkauan tersisa, dan Portal yang terganggu.

**Ucapan**

Sekarang kita pilih Blokir alur teramati. Kedua alur berbahaya juga terblokir, tetapi koneksi menuju basis data masih tersedia.

Portal mengalami penurunan fungsi karena kehilangan koneksi opsionalnya. Pilihan ini mempertahankan lebih banyak fungsi layanan, sementara jangkauan ke basis data masih perlu dipertimbangkan.

## 09 — Jalankan C: Batasi akses segmen

**Aksi layar:** klik Batasi akses segmen. Sorot angka 1/2, EXT-C2 sebagai jangkauan tersisa, dan Portal yang tidak tersedia.

**Ucapan**

Pilihan ketiga membatasi akses ke segmen operasional. Hasilnya, hanya satu dari dua alur berbahaya yang terblokir. Tujuan eksternal masih dapat dijangkau.

Portal juga menjadi tidak tersedia karena koneksi wajib ke basis data terputus.

## 10 — Bandingkan hasil berdampingan

**Aksi layar:** klik Bandingkan semua skenario. Zoom tabel; arahkan perhatian berturut-turut ke kolom alur berbahaya, sisa jangkauan, dan dampak layanan. Tunjukkan penanda C didominasi A tanpa menambahkan label “pilihan terbaik”.

**Ucapan**

Kita klik Bandingkan semua skenario untuk melihat hasilnya berdampingan.

A memberikan pembatasan lebih menyeluruh. B mempertahankan lebih banyak fungsi Portal. C masih menyisakan koneksi berbahaya, dengan dampak Portal yang sama seperti A.

Di sinilah manfaat Dwirupa: operator dapat mempertimbangkan bukti ancaman bersama konsekuensi responsnya. Keputusan tetap berada pada operator.

## 11 — Unduh dan buka laporan

**Aksi layar:** klik menu Laporan, pastikan insiden sama, lalu klik Unduh laporan investigasi. Buka berkas Markdown sebenarnya dalam viewer yang mudah dibaca. Gulir ringkasan, linimasa bukti, tabel perbandingan, dan batasan. Jangan hanya menampilkan notifikasi unduhan.

**Ucapan**

Terakhir, kita buka Laporan dan unduh hasil investigasinya.

Laporan ini memuat ringkasan insiden, linimasa bukti, perbandingan skenario, dan batasan model. Bukti serta pertimbangan respons dapat ditinjau kembali dalam satu dokumen.

## 12 — Tutup pada aplikasi dan hasil karya

**Aksi layar:** setelah bagian batasan laporan terlihat, kembali ke aplikasi. Tampilkan URL demo sebagai label kecil dan akhiri dengan tampilan aplikasi; tidak perlu slide kesimpulan berisi daftar fitur.

**Ucapan**

Hasil simulasi bergantung pada koneksi dan dependensi yang dideklarasikan, tanpa validasi paket jaringan. Integrasi sensor nyata dan penyimpanan persisten menjadi langkah pengembangan berikutnya.

Melalui alur ini, Dwirupa kami ajukan untuk membantu operator pengamanan IT dan OT di lingkungan satuan TNI AD: menelusuri insiden, membandingkan respons, dan mendokumentasikan pertimbangannya. Terima kasih.

## Catatan produksi

- UI dan hasil fixture mengikuti frontend serta CONTRACT.md. Wording merujuk kontrol yang tersedia: kartu insiden, Linimasa bukti, Bukti terpilih, Relasi bukti, Bandingkan respons, tiga preset, Bandingkan semua skenario, dan Unduh laporan investigasi.
- Hasil A/B/C mensyaratkan fixture SRV-APP lengkap. Angka 2/2 dan 1/2 menghitung alur berbahaya outbound/lateral dalam model, bukan seluruh alert atau seluruh koneksi.
- Langkah 03 menggunakan deteksi Wazuh yang benar-benar tersedia; langkah 05 menggunakan peristiwa Modbus yang benar-benar terkait SRV-SCADA. Verifikasi judul saat rekaman, jangan mengarang bukti agar cocok dengan narasi.
- Pemilihan simpul graf memfilter linimasa. Pilihan bukti mengubah panel detail. Klik bukti berbeda harus terlihat menghasilkan perubahan sebelum narasi berpindah.
- Tidak perlu replay/reset dalam walkthrough ini. Mulai dengan fixture lengkap, gunakan instance yang disiapkan untuk rekaman, dan jangan ubah state di antara perbandingan dan laporan.
- Hindari jeda kosong yang panjang. Potong waktu tunggu setelah ada rekaman lengkap; jangan mempercepat hasil sehingga penonton kehilangan kesempatan membaca.
- Nama teknis terlihat di UI; SRV-APP boleh dibaca “server aplikasi”, SRV-SCADA “server skada”, dan EXT-C2 “tujuan eksternal”. Tidak perlu membaca ID peristiwa, hash lengkap, angka skor heuristik, atau isi JSON.
- Narasi tidak mengklaim waktu respons lebih cepat, efektivitas lapangan terukur, deployment operasional TNI AD, prediksi serangan, atau eksekusi firewall.
