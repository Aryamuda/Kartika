# Arah desain frontend COIP

Antarmuka berbahasa Indonesia untuk operator keamanan yang menelusuri bukti dan membandingkan konsekuensi respons. Pesan deteksi, identitas aset, alasan korelasi, dan JSON sumber ditampilkan sesuai data API agar bukti dapat diperiksa tanpa perubahan makna.

## Tema yang dipilih

**Data-Dense Dashboard**, `Style ID: data-dense-dashboard`, baris `No: 28` dalam [styles.csv UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/data/styles.csv).

Baris ini berstatus aktif, mendukung mode gelap, dan ditujukan untuk dashboard operasional. Tabel, filter, pemilihan bukti, dan perbandingan skenario merupakan pekerjaan utama operator, sehingga tema ini lebih sesuai daripada pola halaman pemasaran. Rekomendasi awal generator yang mengandung pola pemasaran tidak diterapkan.

Pembanding yang diperiksa: Minimalism & Swiss Style, Dark Mode (OLED), Real-Time Monitoring, dan Cyberpunk UI. Real-Time Monitoring merupakan gaya tambahan; aplikasi ini menampilkan snapshot dan pemutaran skenario, sehingga tidak diberi indikator seolah-olah sedang menerima aliran langsung. Efek neon, glitch, dan animasi dekoratif tidak mendukung pembacaan bukti.

## Penerapan

- Latar gelap kehijauan membentuk ruang kerja operasional yang tenang. Aksen hijau muda menandai navigasi dan tindakan utama; merah/kuning hanya menyampaikan tingkat ancaman atau gangguan.
- Tema gelap dipilih untuk konteks konsol operator. Tidak ada klaim penghematan daya atau pengurangan kelelahan mata yang belum diukur.
- Teks data utama berukuran 12–14 px; judul, nilai metrik, dan ruang antarpanel membentuk hierarki. Teks kecil dibatasi untuk metadata.
- Segoe UI/Arial mengikuti platform Windows dan tetap tersedia tanpa jaringan. Cascadia Code/Consolas digunakan untuk ID, alamat IP, dan waktu agar karakter mudah dibandingkan.
- Kepadatan terkontrol: tabel dapat digulir dalam panel, bukan melebarkan halaman. Pada ponsel, panel ditumpuk dan lima tujuan navigasi tetap terlihat.
- Ikon SVG menggambarkan tindakan atau objek sebenarnya: pencarian, server, topologi, dokumen, lokasi, pemutaran, dan pemuatan ulang. Ikon dekoratif dan logo buatan tidak digunakan.
- Pola identitas berulang: penomoran insiden/peristiwa, label waktu WIB, garis kebijakan, serta huruf A/B/C untuk pilihan respons. Tidak ada latar kisi dekoratif atau gradien.
- Ketiga kartu preset memakai struktur setara agar operator dapat membandingkan pilihan secara adil. Panah dipakai untuk membuka detail, bukan sebagai dekorasi setiap tombol. Bayangan hanya memisahkan dialog modal dari ruang kerja di belakangnya.
- Transisi warna 160 ms membantu mengenali hover/tekan. Tidak ada animasi berulang. Preferensi pengurangan gerak menonaktifkan transisi.
- Dialog bukti memakai elemen `dialog` native: fokus dibatasi dalam dialog, Escape menutup, dan fokus dikembalikan ke pemicu.
- Skor serta hasil simulasi berasal dari API. Frontend tidak menghitung simulator pengganti atau menyisipkan hasil palsu ketika layanan belum tersedia.

Dial: **ENERGY 1 / RHYTHM 2 / MOTION 1**. Fokus layar Operasi adalah antrean insiden; fokus layar Simulasi adalah perbandingan konsekuensi, sedangkan graf mendukung penjelasannya.

## Batas lingkup

Frontend tidak mengubah model bersama, menjalankan perubahan firewall, atau menambah inventaris senjata. Peta dan pembuat intervensi bebas tidak termasuk implementasi ini. Tiga preset dan ekspor minimal mengikuti kontrak API.
