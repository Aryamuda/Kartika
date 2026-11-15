# Outline slide Dwirupa

Draft 7 slide: satu cover dan enam slide isi. Fokusnya demonstrasi produk serta batas bukti, bukan klaim dampak yang belum diukur.

Pemilik frontend menyampaikan bahwa UI akan dirombak besar. Draft ini sengaja tidak memakai screenshot atau komposisi UI saat ini; ambil visual aplikasi setelah redesign selesai.

| No. | Judul | Tujuan dan isi | Bukti visual |
| --- | --- | --- | --- |
| 1 | Dwirupa | Kenalkan aplikasi triage insiden dan simulasi kebijakan jaringan. | Tipografi sederhana, nama aplikasi, URL publik. |
| 2 | Konteks: alert dari host dan jaringan | Nyatakan manfaat yang dirancang: membantu operator menelusuri alert dari Wazuh dan Suricata, lalu membandingkan dampak respons. Fixture berisi 10 + 9 alert sintetis; ini bukan pengukuran dampak operator. | Dua sumber mengarah ke alur event bersama. |
| 3 | Arsitektur aplikasi | Tunjukkan ingest, normalisasi/provenance, korelasi, UI, Cyber Twin, dan report; sebut FastAPI/Python, React/TypeScript, NetworkX, Store dalam memori, serta jalur Nginx/Uvicorn. | Diagram komponen yang dapat diedit. |
| 4 | INC-0001: SRV-APP menuju SRV-SCADA | Telusuri 13 alert terhubung, 6 Wazuh + 7 Suricata, dari dugaan eksploitasi hingga aktivitas Modbus lateral. Dataset sintetis. | Urutan bukti ringkas dan dua aset terkait. |
| 5 | Perbandingan Cyber Twin | Bandingkan tiga intervensi: cakupan blokir malicious flow, jangkauan tersisa, dan dampak Portal. Keluaran model fixture lokal, bukan tindakan jaringan. | Tabel perbandingan A/B/C. |
| 6 | Batas hasil | Tegaskan data sintetis, model alur kebijakan, skor indikatif, tanpa validasi paket atau eksekusi firewall. State backend demo hilang saat restart. | Kolom “dimodelkan” dan “belum dibuktikan”. |
| 7 | Demo dan langkah berikutnya | Tampilkan URL aplikasi dan repositori; sesuaikan storyboard dengan blueprint resmi, rekam video, uji akses publik, lalu submit dan simpan bukti. | Tautan publik dan daftar langkah. |

## Catatan sumber

Angka fixture dan metode berasal dari `CONTRACT.md`; rincian insiden juga dicek pada respons `/api/overview` yang dibagikan operator. Hasil A/B/C berasal dari verifikasi API lokal yang dicatat di `frontend/VERIFICATION.md`; tidak menyatakan pengujian simulasi pada hosting publik. Detail deploy memakai `DEPLOYMENT.md` dan output terminal operator.
