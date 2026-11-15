# Deployment perbaikan COIP

Untuk Arya/C: deploy backend dan frontend dari commit yang sama. Build frontend dengan `npm.cmd ci` lalu `npm.cmd run build` dari `frontend/`. Sajikan `frontend/dist/`; arahkan `/api/*` ke backend sebelum fallback `index.html`.

## Environment

| Variabel | Lokasi | Nilai |
| --- | --- | --- |
| `COIP_OPERATOR_TOKEN` | Environment backend | Token rahasia untuk collector Wazuh/Suricata. Jika kosong, kedua endpoint ingest tersebut ditolak dengan 403. Jangan masukkan token ini ke frontend. |
| `COIP_PUBLIC_DEMO_REPLAY` | Environment backend | `true` mengizinkan reset/step fixture demo tanpa token; default `false`. Semua pengunjung berbagi state; reset anonim dibatasi satu kali tiap 2 detik per proses. |
| `COIP_ALLOWED_ORIGINS` | Environment backend | Origin frontend yang sebenarnya, dipisahkan koma; tanpa path. Default hanya localhost port 5173. |
| `VITE_API_BASE_URL` | Saat build frontend | Kosong untuk `/api` pada origin sama; origin backend tanpa `/api` jika terpisah. |

UI tidak meminta token. Untuk demo juri, set `COIP_PUBLIC_DEMO_REPLAY=true` di environment backend agar tombol ulangi dan lanjutkan dapat dipakai tanpa token. Reset mengubah state bersama dan dapat dipicu siapa pun; cooldown 2 detik hanya mengurangi klik reset berulang, bukan mengunci akses. Langkah fixture tidak diberi jeda agar alur demo bisa berlanjut langsung. Collector Wazuh/Suricata tetap harus mengirim `Authorization: Bearer <token>`. Simpan token hanya di environment backend; jangan masukkan ke repo atau `VITE_*`. Gunakan HTTPS dan pastikan proxy meneruskan header Authorization.

Jalankan backend dari root repo dengan satu worker: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`. State masih dalam memori proses; restart memuat fixture awal dan menghapus event API dalam memori. File log bukan mekanisme pemulihan state. Jangan mengaktifkan beberapa worker/replica untuk workspace bersama ini.

## Pemeriksaan setelah deploy

- [x] Operasi memuat aset, insiden, dan event dari API; respons API bukan HTML fallback.
- [x] Bukti dapat dibuka dan memuat raw JSON beserta hash.
- [x] Tiga simulasi fixture awal memberikan trade-off berbeda: blokir 2/2, 2/2, dan 1/2; skenario C didominasi A.
- [x] Laporan investigasi berhasil diunduh.
- [x] POST ingest tanpa token ditolak 403 tanpa mengubah data. Salah token diuji lokal, belum di hosting.
- [x] Dengan token benar, reset dan step berhasil. Lakukan hanya pada lab sintetis karena reset memengaruhi seluruh operator.
- [x] Setelah reset, referensi bukti lama memberikan 404; perbarui data sebelum investigasi berikutnya. ID baru adalah string opak, bukan nomor urut yang boleh ditebak.
- [x] UI tetap dapat dipakai pada ponsel dan tidak mencatat error JavaScript.

- [ ] Dengan `COIP_PUBLIC_DEMO_REPLAY=true`, reset/step fixture tanpa token berhasil; reset anonim yang terlalu berdekatan menerima 429, sedangkan step dapat langsung berurutan. Ingest Wazuh/Suricata tetap perlu token.
- [ ] Dengan `COIP_PUBLIC_DEMO_REPLAY=false` atau kosong, reset/step juga perlu token. Lakukan pemeriksaan hanya pada lab sintetis karena reset memengaruhi seluruh operator.

Checklist diuji pada hosting Arya, https://dwirupa.duckdns.org, 15 November 2026. Rincian bukti dan batas pengujian ada di frontend/VERIFICATION.md. Ukuran ponsel diperiksa melalui emulasi viewport, bukan perangkat fisik. DNS normal pada jaringan presentasi masih perlu diperiksa karena uji terakhir memakai tunnel DNS sementara dengan validasi HTTPS tetap aktif.

## Kompatibilitas dan rollback

Batch ingest yang tidak valid kini ditolak seluruhnya dengan 422. Nama skenario perbandingan harus unik. ID insiden yang digabung dapat memberikan 404; ID tersebut tidak dipakai untuk insiden lain. UI dan collector lama perlu penyesuaian token.

Rollback memerlukan pengembalian backend dan frontend ke versi yang sama; restart menghapus state dalam memori. Menghapus atau menonaktifkan `COIP_PUBLIC_DEMO_REPLAY` kembali mewajibkan token untuk replay. Rollback kode juga mengembalikan bug ingest, identitas, dan endpoint tulis tanpa otorisasi yang diperbaiki PR ini.
