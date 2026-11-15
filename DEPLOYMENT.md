# Deployment perbaikan COIP

Untuk Arya/C: deploy backend dan frontend dari commit yang sama. Build frontend dengan `npm.cmd ci` lalu `npm.cmd run build` dari `frontend/`. Sajikan `frontend/dist/`; arahkan `/api/*` ke backend sebelum fallback `index.html`.

## Environment

| Variabel | Lokasi | Nilai |
| --- | --- | --- |
| `COIP_OPERATOR_TOKEN` | Environment backend | Token rahasia yang dibuat oleh operator deployment. Jika kosong, seluruh POST `/api/ingest/*` ditolak dengan 403. |
| `COIP_ALLOWED_ORIGINS` | Environment backend | Origin frontend yang sebenarnya, dipisahkan koma; tanpa path. Default hanya localhost port 5173. |
| `VITE_API_BASE_URL` | Saat build frontend | Kosong untuk `/api` pada origin sama; origin backend tanpa `/api` jika terpisah. |

Masukkan token operator melalui kolom password di UI. Token berada dalam memori tab dan perlu dimasukkan kembali setelah reload. Collector Wazuh/Suricata harus mengirim header `Authorization: Bearer <token>` untuk ingest. Jangan menyimpan token di repo atau `VITE_*`. Gunakan HTTPS; pastikan proxy meneruskan header Authorization.

Jalankan backend dari root repo dengan satu worker: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`. State masih dalam memori proses; restart memuat fixture awal dan menghapus event API dalam memori. File log bukan mekanisme pemulihan state. Jangan mengaktifkan beberapa worker/replica untuk workspace bersama ini.

## Pemeriksaan setelah deploy

- [ ] Operasi memuat aset, insiden, dan event dari API; respons API bukan HTML fallback.
- [ ] Bukti dapat dibuka dan memuat raw JSON beserta hash.
- [ ] Tiga simulasi fixture awal memberikan trade-off berbeda: blokir 2/2, 2/2, dan 1/2; skenario C didominasi A.
- [ ] Laporan investigasi berhasil diunduh.
- [ ] POST reset/ingest tanpa token atau dengan token salah ditolak 403 tanpa mengubah data.
- [ ] Dengan token benar, reset dan step berhasil. Lakukan hanya pada lab sintetis karena reset memengaruhi seluruh operator.
- [ ] Setelah reset, referensi bukti lama memberikan 404; perbarui data sebelum investigasi berikutnya. ID baru adalah string opak, bukan nomor urut yang boleh ditebak.
- [ ] UI tetap dapat dipakai pada ponsel dan tidak mencatat error JavaScript.

Checklist deployment ini belum dieksekusi pada hosting Arya. Verifikasi lokal menggunakan API lab terisolasi; alamat deployment diperlukan untuk pemeriksaan hosting.

## Kompatibilitas dan rollback

Batch ingest yang tidak valid kini ditolak seluruhnya dengan 422. Nama skenario perbandingan harus unik. ID insiden yang digabung dapat memberikan 404; ID tersebut tidak dipakai untuk insiden lain. UI dan collector lama perlu penyesuaian token.

Rollback memerlukan pengembalian backend dan frontend ke versi yang sama; restart menghapus state dalam memori. Rollback kode juga mengembalikan bug ingest, identitas, dan endpoint tulis tanpa otorisasi yang diperbaiki PR ini.
