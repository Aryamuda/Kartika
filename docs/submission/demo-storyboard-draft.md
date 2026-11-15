# Storyboard demo 10 adegan — draft sementara

**Status: provisional.** TODO menyebut “blueprint section 6”, tetapi blueprint itu tidak tersedia pada checkout ini. Urutan berikut adalah usulan untuk menyiapkan rekaman; belum bisa dianggap sesuai durasi, urutan, atau instruksi resmi. Cocokkan dengan blueprint sebelum merekam final.

UI akan dirombak besar, jadi jangan gunakan screenshot/tata letak UI saat ini sebagai final. Adegan aplikasi di bawah hanya menetapkan alur dan bukti yang perlu ditunjukkan; rekam ulang visual setelah redesign.

| Adegan | Aksi layar | Narasi draft | Bukti / catatan produksi |
| --- | --- | --- | --- |
| 1. Pembuka | Buka `https://dwirupa.duckdns.org`. | “Ini Dwirupa, demo untuk meninjau insiden dari alert host dan jaringan, lalu membandingkan dampak beberapa perubahan kebijakan.” | Hindari klaim pencegahan otomatis. Sebutkan bahwa data demo sintetis. |
| 2. Ringkasan operasi | Tampilkan halaman Operasi dan metrik fixture. | “Contoh ini memuat 19 event: 10 dari Wazuh dan 9 dari Suricata, dengan 8 aset dan 2 insiden terbuka.” | Nilai berasal dari fixture, bukan telemetry pelanggan atau feed live. |
| 3. Pilih INC-0001 | Buka detail insiden kritis yang terkait SRV-APP. | “Insiden pertama mengelompokkan 13 alert yang mengarah ke SRV-APP.” | Tampilkan ID/title; jangan menyamarkan data sintetis sebagai insiden nyata. |
| 4. Urutkan bukti | Tampilkan timeline dan label sumber. | “Timeline memperlihatkan enam alert Wazuh dan tujuh alert Suricata pada kasus ini.” | Gunakan rentang dan jam yang tampil di UI; jangan mengarang waktu baru. |
| 5. Buka provenance | Buka satu bukti mentah dan perlihatkan parser/hash. | “Detail bukti menyertakan rekaman sumber serta provenance untuk ditelusuri. Hash membantu pemeriksaan konsistensi, bukan membuktikan keaslian sumber.” | Hindari mengekspos token operator atau data lingkungan privat. |
| 6. Hubungan aset | Tampilkan graf dan alur eksternal/lateral. | “Bukti jaringan menghubungkan SRV-APP dengan endpoint eksternal dan menunjukkan komunikasi Modbus ke SRV-SCADA.” | Jelaskan bahwa ini sesuai fixture/topologi demo. |
| 7. Dampak insiden | Tampilkan aset terkait atau alur Modbus. | “Pada data demo, SRV-SCADA adalah aset kritis yang ditargetkan oleh aktivitas dari SRV-APP.” | Hindari menyimpulkan kendali proses benar-benar terganggu; aplikasi hanya menampilkan alert. |
| 8. Skenario A | Jalankan/tampilkan isolasi SRV-APP. | “Model menghapus semua alur yang menyentuh SRV-APP. Dua dari dua malicious flow terblokir, dan layanan Portal turun pada hasil fixture lokal.” | Simulasi tidak menerapkan firewall. Bila API hosting belum dicek, rekam hasil lokal yang terverifikasi. |
| 9. Bandingkan B dan C | Tampilkan perbandingan semua preset. | “Blokir alur teramati juga memblokir dua dari dua, tetapi masih menyisakan jangkauan ke SRV-DB. Opsi segmentasi memblokir satu dari dua dan masih menyisakan EXT-C2; model menandainya didominasi A.” | Sebutkan bahwa hasil dihitung dari topology dan dependensi yang dideklarasikan. |
| 10. Laporan dan penutup | Unduh laporan Markdown/HTML, sorot bagian batas model, akhiri pada URL. | “Laporan merangkum insiden, timeline bukti, perbandingan, dan batasan. Ini prototipe berbasis fixture sintetis, bukan validasi paket atau eksekusi perubahan jaringan.” | Waktu per adegan belum ditentukan. Ikuti batas durasi dan urutan resmi setelah blueprint diterima. |

## Sebelum rekaman final

- Cocokkan adegan dan durasi dengan blueprint resmi bagian 6.
- Pastikan versi hosted API menampilkan halaman Twin dan report yang sama dengan demo lokal; jangan klaim hosting sudah diverifikasi untuk alur itu sebelum pemeriksaan.
- Jangan tekan reset/step pada instance publik saat ada pengguna lain. Endpoint ingest/replay memerlukan token operator dan reset mengubah state bersama.
- Tutup kolom token dan semua terminal/variabel rahasia sebelum mengambil layar.
- Rekam tanpa localhost, tandai fixture sintetis pada pembuka, dan sisakan bagian batasan model di akhir.
