# COIP: 3-person TODO

Deadline: submission closes 15 Nov 2026 (cutoff time unconfirmed, ask in the WhatsApp group). Plan to submit by 22:00 WIB.
Rule: build against `CONTRACT.md`. Any change to a shape means editing `models.py` and `types.ts` together and telling the others.

Owners: **A** = Fadil (Cyber Twin), **B** = Aldi (frontend), **C** = Arya (API, deploy, submission assets, and reports).

Checked items are implemented and verified locally unless public availability is explicitly stated. Publishing, deployment, and submission have separate checkboxes.

## Tonight (Sat 14 Nov), target 01:00
- [x] **C** `backend/app/main.py`: read endpoints over `Store` (`/api/overview`, `/assets`, `/topology`, `/events`, `/events/{id}`, `/incidents`, `/incidents/{id}`), CORS on. Already present on remote main in `f4c60f6`; exercised by the frontend.
- [x] **C** `/api/ingest/wazuh|suricata` (POST) + `/api/ingest/reset` and `/step`. Verified through actual HTTP requests against an isolated lab process.
- [x] **C** Public project link + hosted deployment at https://dwirupa.duckdns.org (VPS: Uvicorn systemd service + Nginx + HTTPS; Docker not needed).
- [x] **B** Vite + React + TS + Tailwind shell, five-page navigation, API client typed from `types.ts`, and Indonesian interface. Connected to the real local API.
- [x] **A** `backend/app/twin.py` (NetworkX): `simulate(intervention, incident)` and the three presets. Acceptance tests verify isolation with an outage, surgical blocking with residual exposure, and the dominated middle option.

## Sunday 15 Nov
**08:00-12:00**
- [x] **A + C** `/api/twin/presets|simulate|compare`: engine, `dominated`, `change_set`, observations, and `limitations` connected on the local feature branch. Actual HTTP and browser checks passed.
- [x] **B** Operations screen (incident list, event feed, replay controls) + Investigation screen (timeline, raw evidence, link reasons, relationship graph).
- [x] **C** Deploy first working version to a public URL: https://dwirupa.duckdns.org (API and frontend verified; HTTPS renewal dry-run passed).

**12:00-16:00**
- [x] **B** Infrastructure screen (asset registry + topology) + Cyber Twin screen (removed-flow graph, 3 preset buttons, comparison table, service status).
- [x] **C** `/api/reports`: minimal Markdown/printable HTML export with incident summary, evidence timeline, scenario comparison table, and limitations. Actual report download verified.
- [x] **C** Run/build/deployment integration instructions in `frontend/README.md`.
- [ ] **C** Architecture diagram and slide outline.

**16:00-18:00** Integration pass:
- [x] Local frontend/API checks: 13 frontend tests, 9 backend tests, production build, and browser checks against real simulator/report endpoints.
- [ ] Run the complete 10-scene demo against the blueprint and fix remaining breakages. The referenced blueprint is not present in this checkout.

**18:00 FEATURE FREEZE.**

**18:00-21:00**
- [ ] **C** Record the video following the 10-scene sequence (see blueprint section 6).
- [ ] **C** Slides: problem, COIP, Cyber Twin, demo result, honest limits, next steps.
- [x] **B** Local browser checks at 375, 768, 1024, and 1440 px, plus keyboard, dialog focus, empty/error states, and connection recovery.
- [ ] **A + B** Final bug fixes, check the hosted URL works from a phone and an incognito window, no localhost links.

**21:00-22:00**
- [ ] **C** Submit on CODEPOLITAN: public project link (hosted app + repo), video, slides. Screenshot the confirmation.

## Done means
- [x] Hosted URL loads without login and shows INC-0001 (verified by Arya on HTTPS).
- [x] Replay shows events arriving, then an incident forming (verified locally).
- [x] All three presets show distinct containment, residual exposure, and service-impact trade-offs on screen, matching the expected-results table; scenario C is dominated by A (real local API).
- [x] A report downloads for INC-0001 (real local API).
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
- [x] **A + C** Review draft PR #1 and merge into main (PR #1 and follow-up PR #2 are merged).
- Public deployment is complete at https://dwirupa.duckdns.org. Video, slides, and submission remain outstanding.
