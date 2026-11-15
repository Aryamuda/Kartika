# COIP: 3-person TODO

Deadline: submission closes 15 Nov 2026 (cutoff time unconfirmed, ask in the WhatsApp group). Plan to submit by 22:00 WIB.
Rule: build against `CONTRACT.md`. Any change to a shape means editing `models.py` and `types.ts` together and telling the others.

Owners: **A** = Fadil (Cyber Twin), **B** = Aldi (frontend), **C** = Arya (API, deploy, submission assets, and reports).

Checked items are implemented and verified locally unless public availability is explicitly stated. Publishing, deployment, and submission have separate checkboxes.

## Tonight (Sat 14 Nov), target 01:00
- [x] **C** `backend/app/main.py`: read endpoints over `Store` (`/api/overview`, `/assets`, `/topology`, `/events`, `/events/{id}`, `/incidents`, `/incidents/{id}`), CORS on. Already present on remote main in `f4c60f6`; exercised by the frontend.
- [x] **C** `/api/ingest/wazuh|suricata` (POST) + `/api/ingest/reset` and `/step`. Verified through actual HTTP requests against an isolated lab process.
- [x] **C** Public hosted application: https://dwirupa.duckdns.org, verified 15 Nov. Container packaging was not inspected.
- [x] **B** Vite + React + TS + Tailwind shell, five-page navigation, API client typed from `types.ts`, and Indonesian interface. Connected to the real local API.
- [x] **A** `backend/app/twin.py` (NetworkX): `simulate(intervention, incident)` and the three presets. Acceptance tests verify isolation with an outage, surgical blocking with residual exposure, and the dominated middle option.

## Sunday 15 Nov
**08:00-12:00**
- [x] **A + C** `/api/twin/presets|simulate|compare`: engine, `dominated`, `change_set`, observations, and `limitations` connected on the local feature branch. Actual HTTP and browser checks passed.
- [x] **B** Operations screen (incident list, event feed, replay controls) + Investigation screen (timeline, raw evidence, link reasons, relationship graph).
- [x] **C** First working version deployed publicly; read, simulation, reports, and authorized replay verified on hosting.

**12:00-16:00**
- [x] **B** Infrastructure screen (asset registry + topology) + Cyber Twin screen (removed-flow graph, 3 preset buttons, comparison table, service status).
- [x] **C** `/api/reports`: minimal Markdown/printable HTML export with incident summary, evidence timeline, scenario comparison table, and limitations. Actual report download verified.
- [x] **C** Run/build/deployment integration instructions in `frontend/README.md`.
- [x] **C** Architecture diagram and slide outline (`docs/submission/architecture.md`, `slide-outline.md`).

**16:00-18:00** Integration pass:
- [x] Local frontend/API checks after fixes: 14 frontend tests, 17 backend tests, production build, and browser checks. See frontend/VERIFICATION.md for historical and current scopes.
- [ ] Run the complete 10-scene demo against the blueprint and fix remaining breakages. The referenced blueprint is not present in this checkout. The provisional read-aloud script is in `docs/submission/video-demo-script.md`; reconcile its order and duration when the official blueprint is available.

**18:00 FEATURE FREEZE.**

**18:00-21:00**
- [ ] **C** Record the video following the 10-scene sequence (see blueprint section 6).
- [x] **C** Slides: problem, COIP, Cyber Twin, demo result, honest limits, next steps (`docs/submission/dwirupa-submission-final-v2.pptx`).
- [ ] Re-record UI scenes after the planned frontend redesign; this deck intentionally has no current-UI screenshots.
- [x] **B** Local browser checks at 375, 768, 1024, and 1440 px, plus keyboard, dialog focus, empty/error states, and connection recovery.
- [ ] **A + B** Final bug fixes, check the hosted URL works from a phone and an incognito window, no localhost links.

**21:00-22:00**
- [ ] **C** Submit on CODEPOLITAN: public project link (hosted app + repo), video, slides. Screenshot the confirmation.

## Done means
- [x] Hosted URL loads without login and shows the SRV-APP incident. IDs are opaque and change after reset; select by asset, not a fixed INC-0001 URL.
- [x] Replay shows events arriving, then an incident forming (verified locally and through authorized hosted replay, 15 Nov).
- [x] All three presets show distinct containment, residual exposure, and service-impact trade-offs on screen, matching the expected-results table; scenario C is dominated by A (real local API and hosted application).
- [x] A report downloads for INC-0001 (real local API and hosted application).
- [ ] Video follows scenes 1-10 and stays under the stated length.

## If behind, cut in this order
1. Custom intervention controls (keep the three presets).
2. Elaborate reports (keep the minimal export: incident summary, evidence timeline, scenario comparison table, and limitations).
3. Map (optional two-pin stretch only if B has spare time late; Operations uses a site list showing asset status).
4. Infrastructure screen as its own page (keep the cyber asset inventory; reuse the Twin graph).

Never cut: cyber asset inventory + Investigation + three-preset Twin comparison + minimal export + the public link + the video.

## Claims to avoid (from the blueprint)
No autonomous prevention, no attack prediction, no production-grade digital replica, no deployment readiness. The Twin models declared firewall policy. State that it is not packet-level validation.

## Local integration handoff (15 Nov, `feat/aldi-frontend`)
- Fadil's engine from `1dbd4c1` is merged. Its original two acceptance tests passed before integration.
- Response counts/matrix now match the existing frontend contract; scoring formulas are unchanged.
- Local API routes for presets, individual simulation, comparison, and minimal report export are connected.
- Nine backend tests pass, including actual HTTP integration, ingest/replay, invalid requests, and escaped report output.
- Browser checks against the real lab API passed for all three presets and report download, without mock responses.
- Frontend build is in `frontend/dist/`; run/deployment instructions and verification evidence are in `frontend/README.md` and `frontend/VERIFICATION.md`.
- [x] **B** Push `feat/aldi-frontend` after approval and open [draft PR #1](https://github.com/Aryamuda/Kartika/pull/1) for Fadil/Arya to review.
- [x] PR #1 merged; bug-fix PR #2 also merged (d389a86). This records merge status, not an unverified reviewer approval.
- Public deployment and hosted replay are verified. Video finalization, slides, team rehearsal, and submission remain outstanding.

## Kesiapan demo Aldi / B (15 November 2026)
- [x] Domain terbaru dicatat: https://dwirupa.duckdns.org.
- [x] Uji hosted: investigasi, raw bukti/hash, tiga simulasi, dan laporan unduhan.
- [x] Token operator valid: reset 0/19, satu langkah 1/18, muat sisa 19/0; kembali 8 aset dan 2 insiden. Bukti lama 404.
- [x] Rancangan naskah, urutan klik, pergantian pembicara, dan rencana cadangan tersedia di DEMO_ALDI.md.
- [ ] Latihan lengkap Aldi?Fadil?Arya dan konfirmasi durasi resmi video.
- [ ] Konektor sensor nyata diverifikasi bersama C; pengujian saat ini memakai data sintetis.
- [ ] Resolusi DNS normal diperiksa dari perangkat/jaringan presentasi; uji browser terakhir memakai tunnel DNS sementara dengan HTTPS tervalidasi.

Jadwal dan deadline di atas berasal dari rencana awal, bukan hasil verifikasi ulang aturan kompetisi.

- [x] **B** Rekaman layar cadangan tanpa audio dan laporan contoh tersimpan lokal di coip-demo-backup/2026-11-15. Bukan video submission final.

## Adaptasi UI referensi SOC / B (lokal, 15 November 2026)
- [x] Susunan Operasi sesuai pilihan Aldi: ringkasan kiri, peta dominan tengah, insiden kanan; peta tampil pertama di ponsel.
- [x] Peta 38 provinsi dengan titik Jakarta/Bandung sintetis; pilihan lokasi memfilter insiden dan deteksi.
- [x] Investigasi: linimasa, graf relasi tersorot, dan rekaman bukti di panel terhubung.
- [x] Simulasi: kebijakan awal/hasil berdampingan, status layanan sebelum/sesudah, dan tiga konsekuensi A/B/C.
- [x] Build, 14 tes frontend, Playwright workspace/live Twin, unduh laporan, retry bukti, pemulihan koneksi, dan fokus dialog.
- [x] Lima halaman pada 375, 768, 1024, 1440, 1920 px tanpa overflow halaman; kontras teks CSS diperiksa.
- [x] Commit perubahan UI setelah izin Aldi, branch `feat/aldi-soc-workspace`; integrasikan pembaruan main hingga cd01dd5.
- [ ] Deploy UI dan periksa ulang hosting bersama Arya.
