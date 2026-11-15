# Naskah video demo Dwirupa

**Status:** siap untuk latihan, belum final terhadap blueprint resmi. Estimasi total sekitar 4 menit; atur ulang durasi dan urutan bila blueprint bagian 6 menetapkan ketentuan lain. Adegan layar ditulis berdasarkan tujuan/bukti, bukan posisi tombol, karena UI akan dirombak.

## Naskah 10 adegan

| Waktu perkiraan | Adegan dan aksi layar | Narasi siap baca |
| --- | --- | --- |
| 0:00–0:15 | **Pembuka.** Tampilkan nama Dwirupa dan alamat publik. | “Halo, ini Dwirupa, demo untuk membantu operator menelusuri alert dari host dan jaringan, memahami bukti yang membentuk insiden, lalu membandingkan dampak beberapa respons. Seluruh data yang tampil di demo ini sintetis.” |
| 0:15–0:35 | **Ringkasan.** Tampilkan halaman operasi dan metrik awal. | “Fixture ini memuat 19 peristiwa: 10 dari Wazuh dan 9 dari Suricata, dengan 8 aset dan 2 insiden terbuka. Dwirupa menyatukan sinyal lintas sumber agar rangkaian bukti dapat ditinjau bersama.” |
| 0:35–0:55 | **Kasus INC-0001.** Pilih insiden yang mengarah ke SRV-APP. | “Saya buka INC-0001. Di contoh sintetis ini, 13 alert terhubung dan mengarah ke SRV-APP. Ringkasan insiden memberi titik awal untuk menelusuri event yang mendasarinya.” |
| 0:55–1:20 | **Linimasa.** Tunjukkan urutan alert dan sumbernya. | “Linimasa memperlihatkan enam alert Wazuh dan tujuh alert Suricata. Urutan taktiknya bergerak dari dugaan eksploitasi dan eksekusi, ke command and control, persistence, discovery, aktivitas Modbus menuju SRV-SCADA, lalu defense evasion.” |
| 1:20–1:45 | **Bukti mentah dan provenance.** Buka satu detail event; sorot raw record, parser, dan hash. | “Setiap bukti dapat ditelusuri ke rekaman sumber dan informasi parser. Hash SHA-256 membantu memeriksa konsistensi data yang ditampilkan; hash ini sendiri bukan bukti bahwa sumbernya autentik.” |
| 1:45–2:10 | **Graf hubungan.** Tampilkan hubungan event, SRV-APP, endpoint eksternal, dan SRV-SCADA. | “Graf memperlihatkan hubungan yang dicatat antara SRV-APP, endpoint eksternal, dan SRV-SCADA. Edge menyertakan event dan alasan pemetaan, jadi operator dapat kembali ke bukti yang mendasarinya.” |
| 2:10–2:30 | **Aset terdampak.** Sorot peran SRV-APP dan status critical SRV-SCADA. | “Pada fixture ini, SRV-APP ditandai sebagai aset yang diduga terkompromi, sementara SRV-SCADA adalah aset critical yang menjadi target. Alert ini tidak membuktikan bahwa proses industri benar-benar berubah.” |
| 2:30–2:55 | **Cyber Twin A.** Pilih isolasi SRV-APP dan tunjukkan flow serta dampak layanan. | “Sekarang saya bandingkan respons di Cyber Twin. Skenario A mengisolasi SRV-APP dengan menghapus semua flow yang menyentuh aset tersebut. Pada verifikasi fixture lokal, dua dari dua malicious flow diblokir, sementara layanan Portal menjadi down.” |
| 2:55–3:35 | **Cyber Twin B dan C.** Tampilkan tabel perbandingan, sisa jangkauan, dan status Portal. | “Skenario B juga memblokir dua dari dua malicious flow, tetapi masih menyisakan jangkauan ke SRV-DB dan membuat Portal degraded. Skenario C memblokir satu dari dua, masih menyisakan jangkauan ke EXT-C2, dan membuat Portal down. Model menandai C didominasi A. Ini keluaran model kebijakan, bukan rekomendasi otomatis.” |
| 3:35–4:00 | **Laporan dan penutup.** Unduh laporan; sorot rangkuman, perbandingan, dan batasan. Akhiri dengan URL proyek. | “Laporan merangkum insiden, linimasa bukti, perbandingan skenario, dan batas model. Dwirupa menghitung perubahan berdasarkan topology dan dependensi yang dideklarasikan. Data demo sintetis; simulasi tidak memvalidasi paket dan tidak mengeksekusi perubahan firewall. Terima kasih.” |

## Pemeriksaan sebelum take final

1. Tunggu redesign UI, lalu sesuaikan aksi layar dengan label dan navigasi yang benar-benar tersedia. Jangan pakai screenshot UI lama.
2. Ikuti urutan dan batas durasi dari blueprint resmi bagian 6 setelah dokumennya tersedia. Total 4 menit di atas hanya perkiraan untuk latihan.
3. Pastikan fixture INC-0001 sudah dimuat. Jangan reset atau step pada instance publik saat operator lain mungkin memakainya.
4. Verifikasi alur Twin dan report pada environment yang akan direkam. Verifikasi tercatat saat ini adalah API lab lokal; jangan menyebut hasil itu sebagai hasil hosting.
5. Tutup kolom token operator, terminal, dan data privat sebelum merekam. Jangan tampilkan localhost pada video publik.
6. Saat menyunting, pertahankan label “data sintetis” dan batasan model di pembuka/penutup. Jangan tambahkan klaim pencegahan otomatis, prediksi serangan, atau dampak operasional yang tidak diukur.
