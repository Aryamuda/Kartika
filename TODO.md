# COIP: 3-person TODO

Deadline: submission closes 15 Nov 2026 (cutoff time unconfirmed, ask in the WhatsApp group). Plan to submit by 22:00 WIB.
Rule: build against `CONTRACT.md`. Any change to a shape means editing `models.py` and `types.ts` together and telling the others.

Owners: **A** = Cyber Twin, **B** = frontend, **C** = API, deploy, submission assets, and reports.

## Tonight (Sat 14 Nov), target 01:00
- [ ] **C** `backend/app/main.py`: read endpoints over `Store` (`/api/overview`, `/assets`, `/topology`, `/events`, `/events/{id}`, `/incidents`, `/incidents/{id}`), CORS on. Push by 23:00 so B is unblocked.
- [ ] **C** `/api/ingest/wazuh|suricata` (POST) + `/api/ingest/reset` and `/step`. Fastest first, then public repo + empty hosted deploy (Dockerfile, one container serving the built frontend).
- [ ] **B** Vite + React + TS + Tailwind shell, nav (Operations, Infrastructure, Investigations, Cyber Twin, Reports), API client typed from `types.ts`. Develop against C's endpoints, or `/api/*` JSON saved from `Store` until they land.
- [ ] **A** `backend/app/twin.py` (NetworkX): `simulate(intervention, incident)` and the three presets. First test their distinct trade-offs against the expected-results table in `CONTRACT.md` (`tests/test_twin.py`): isolation contains with an outage, surgical blocking leaves residual exposure, and the middle option is dominated.

## Sunday 15 Nov
**08:00-12:00**
- [ ] **A** `/api/twin/presets|simulate|compare`, `dominated` flag, `change_set`, observations, `limitations`.
- [ ] **B** Operations screen (incident list, event feed, replay button) + Investigation screen (timeline, evidence + "why linked", relationship graph).
- [ ] **C** Deploy first working version to a public URL (by 14:00 latest). Fix hosting issues now, not at 22:00.

**12:00-16:00**
- [ ] **B** Infrastructure screen (asset registry + topology) + Cyber Twin screen (graph with removed flows, 3 preset buttons, comparison table, service status).
- [ ] **A** `/api/reports`: minimal export (markdown + printable HTML) with incident summary, evidence timeline, scenario comparison table, and limitations.
- [ ] **C** README (run + deploy), architecture diagram, start slide outline.

**16:00-18:00** Integration pass: run the 10-scene demo end to end, fix breakages only. Nothing new.

**18:00 FEATURE FREEZE.**

**18:00-21:00**
- [ ] **C** Record the video following the 10-scene sequence (see blueprint section 6). Slides: problem, COIP, Cyber Twin, demo result, honest limits, next steps.
- [ ] **A + B** Final bug fixes, check the hosted URL works from a phone and an incognito window, no localhost links.

**21:00-22:00** Submit on CODEPOLITAN: public project link (hosted app + repo), video, slides. Screenshot the confirmation.

## Done means
- Hosted URL loads without login and shows INC-0001.
- Replay shows events arriving, then an incident forming.
- All three presets show distinct containment, residual exposure, and service-impact trade-offs on screen, matching the expected-results table; scenario C is dominated by A.
- A report downloads for INC-0001.
- Video follows scenes 1-10 and stays under the stated length.

## If behind, cut in this order
1. Custom intervention controls (keep the three presets).
2. Elaborate reports (keep the minimal export: incident summary, evidence timeline, scenario comparison table, and limitations).
3. Map (optional two-pin stretch only if B has spare time late; Operations uses a site list showing asset status).
4. Infrastructure screen as its own page (keep the cyber asset inventory; reuse the Twin graph).

Never cut: cyber asset inventory + Investigation + three-preset Twin comparison + minimal export + the public link + the video.

## Claims to avoid (from the blueprint)
No autonomous prevention, no attack prediction, no production-grade digital replica, no deployment readiness. The Twin models declared firewall policy. State that it is not packet-level validation.
