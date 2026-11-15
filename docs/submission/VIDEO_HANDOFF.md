# Dwirupa video — handoff: restart from scene 1

## Current decision from the user

The previous four Remotion scenes were rejected as a direction: too much presentation text, slow pacing, diagrams, and small screenshots. Do not continue scene 5 or polish that approach. Restart at scene 1 as an application walkthrough.

The user wants the app flow itself: click this, zoom here, show the result, then continue. The app fills the frame. Remotion adds camera movements, cursor emphasis, short labels, and transitions around actual app interactions. A screenshot montage inside slide frames is not the intended result.

Scenes 1 and 2 of the old plan should become one short opening, approximately 15–20 seconds, while the app is already in use. The user agreed to rewrite the narration around the actual click flow. The latest draft is [video-walkthrough-narration-id.md](video-walkthrough-narration-id.md). It was delivered for review; no new motion has been produced for it yet.

## Immediate next deliverable

Make one representative 30–45 second application walkthrough starting from scene 1:

1. Start in Operasi with the complete synthetic fixture loaded. Introduce Dwirupa briefly while the app is visible.
2. Point to the incident queue and click the SRV-APP incident.
3. Show Investigasi opening; zoom the summary with 13 events, 6 Wazuh and 7 Suricata.
4. Move to Linimasa bukti and click the Wazuh command-injection / HTTP-200 event.
5. Show the selected evidence panel update and zoom the relevant detail.

This sample should establish pace, real clicks, camera movements and readability before extending the whole video. Do not generate the entire video in the previous style. Do not reuse old 40/35/45/35-second scene lengths as constraints.

## Narration and recording workflow

- Pair actual screen actions with narration. The latest walkthrough script has 12 action/voice pairs, from Operasi through report download.
- Aim initially for 4–5 minutes, including actions and pauses; the user's hard maximum is 10 minutes. Measure with a read-through rather than forcing the estimate.
- User will record their own voice. Do not generate AI speech or ask for a TTS key.
- Author flexible timing. User will align motion with recorded audio afterward.
- Avoid long title holds, repeated concept explanations, menu tours without purpose, and reading raw JSON or IDs aloud.
- The task at handoff was to save important documents and push them, excluding the video project. Do not resume video production until the user asks in the next session.

## Complete app route

Operasi → click SRV-APP incident → Investigasi summary → select timeline evidence → inspect source/parser/hash/raw record → select SRV-SCADA in relationship graph → inspect Modbus evidence → clear node filter → Bandingkan respons → run presets A/B/C → Bandingkan semua skenario → Laporan → Unduh laporan investigasi → open the actual Markdown report → brief close on app.

Actual UI behavior checked in source:

- Selecting a timeline event updates the inline **Bukti terpilih** panel. Do not invent a modal for this interaction.
- Selecting a graph node filters the timeline; **Hapus filter simpul** restores it.
- Source details contain **Asal-usul bukti**, **Parser**, hash, and **Rekaman asli** further down the evidence panel.
- Preset labels are **Isolasi SRV-APP**, **Blokir alur teramati**, **Batasi akses segmen**.
- Wait for API results to appear before describing them. Show the actual report after download.

## Facts and limits to preserve

Use [../../CONTRACT.md](../../CONTRACT.md) as authority. Synthetic fixture: 19 events, 8 assets, 2 incidents. SRV-APP case: 13 events, 6 Wazuh + 7 Suricata. Incident/event IDs can change after replay; select by asset, not a fixed ID.

| Response | Malicious flows blocked | Remaining reach from SRV-APP | Portal |
| --- | --- | --- | --- |
| A: isolate SRV-APP | 2/2 | None | Down |
| B: block observed flows | 2/2 | SRV-DB | Degraded |
| C: restrict Operations segment | 1/2 | EXT-C2 | Down |

C is dominated by A in this model. A and B have different trade-offs; do not label a universal winner. Reachability does not prove compromise. Alerts toward SCADA do not establish an industrial-process change. Hash supports consistency, not authenticity.

The Twin uses declared permitted flows and service dependencies. It does not validate packets, predict attacks, or apply firewall rules. Demo state is in process memory; persistent storage, sensor integration verification and access-control hardening are future work. Do not present the prototype as production-ready or already deployed operationally within TNI AD.

## Visual direction

The user explicitly rejected the uncommitted olive/khaki/terracotta palette and requested restoration to the last app commit. Frontend files were restored to `43b2d34`; the camouflage asset was removed. Keep that app palette:

- Background `#101614`, text `#e6ece8`, surface `#171f1c`, border `#33463b`.
- Accent `#b2e9c6`, muted `#a3b3aa`, critical `#ffaaaa`, warning `#efc580`.

Approval of early visuals was later superseded by the explicit rejection of the overall presentation approach. Do not interpret it as approval to continue the old structure.

## Files and local environment

- Latest script: `docs/submission/video-walkthrough-narration-id.md`.
- Existing facts: `CONTRACT.md`, `frontend/README.md`, `docs/submission/architecture.md`.
- `SIMULATION_GUIDE.md` is historical rehearsal guidance. Some replay/token and missing-blueprint notes are outdated; current code and the user's requirements take precedence.
- `local_deploy_guide.md` describes Windows startup. Inspect the running ports first; don't start duplicate services or reset the shared fixture.
- During this session, an existing API was on port 8000, app frontend used port 5174 (5173 was occupied), and Remotion Studio used port 3000. These are observations, not guarantees for the next session.
- Public project address recorded in the repo: https://dwirupa.duckdns.org. Public access was not reverified during this video revision. Prefer a controlled local instance for recording.

## Video files intentionally not pushed

`video/` remains local and untracked. It contains the rejected draft, Remotion 4.0.543, dependencies, sample frames and capture helpers. Do not rely on it existing on a fresh clone, and do not push its output or dependencies.

If continuing on this same machine, useful technical pieces may be salvaged: `video/scripts/capture-app.mjs` captures real local app screenshots, and `scripts/check-scene.mjs` compares standalone and combined rendered frames. The capture helper hardcodes port 5174 and is not a real-click video recorder. Existing scenes use static screenshots with animated overlays; they do not satisfy the new walkthrough direction.

If starting on a fresh machine, scaffold a fresh Remotion project in a separate folder using the installed Remotion skills. Read remotion-best-practices/create/markup/interactivity guidance, open Studio before authoring, use real interactions for the sample, and visually verify it. Preview first; don't export a full MP4 unless requested.

## Competition context

https://kartikacyberhackathon.id/ was read during this session. Published rubric: relevance/benefits 25%, technical innovation 25%, working prototype 25%, implementation feasibility 15%, documentation 10%. Use the demo to show evidence for those criteria. Do not add a long presentation before the app.

The user's stated video requirement is an overview of the work, its benefits and operation, maximum 10 minutes. No additional official scene-order document was supplied. Historical mentions of a ten-scene blueprint must not override the user-approved app walkthrough.
