# COIP simulation and presentation guide

For Fadil (Developer A) and the presentation team. Prepared 15 November 2026 from the interface and contract at `d389a86`.

## Start here: what you should do next

1. Ask Arya (C) for the working demo URL and a time when the team can rehearse together. Ask for the official ten-scene blueprint and recording time limit too; neither is supplied by this guide.
2. Open the app and check that the sidebar says **API terhubung**. If the hosted version is not ready, use the local setup below to practise.
3. For your first practice, leave the loaded data alone. Open **Simulasi**, select the incident for **SRV-APP**, and run cards **A**, **B**, and **C** in order.
4. Click **Bandingkan semua skenario** and compare the table with the expected-results table below.
5. Open **Laporan**, select the same incident, and click **Unduh laporan investigasi**. Open the downloaded Markdown file and check the comparison.
6. Practise saying the explanations below while clicking. Then rehearse the complete team walkthrough, including replay, with B and C.

You do not need to add another feature before practising. Your immediate task is to demonstrate and verify the existing simulation.

## Your responsibility

You built the part that answers: “If we block this connection or disconnect this server, how much threat exposure remains, and what services would stop working?”

| Person | Responsibility during rehearsal |
|---|---|
| A — Fadil | Explain the Twin, verify its calculations and trade-offs, investigate simulation defects. |
| B — Aldi | Operate or support the interface, investigate incorrect rendering and browser behaviour. |
| C — Arya | Prepare the API/deployment and replay access, coordinate the presentation, recording and submission. |

Decide who controls the mouse before starting. A can narrate while B clicks. Scenario letters A/B/C are choices in the simulation; they are separate from the developers' role letters.

## What the demo is simulating

There are two different activities:

- **Event replay** loads synthetic security records and lets the team show how an incident forms. It changes the shared demo data.
- **Cyber Twin simulation** tests a hypothetical defensive response against that incident. It calculates results without changing real firewall rules or the shared network topology.

The main story is a suspected compromise of **SRV-APP**, the application server. Observed suspicious connections include traffic to **SRV-SCADA** and an external destination, **EXT-C2**. The Portal depends on the database/historian and optionally on SCADA status information.

“Flow” means a declared permitted network connection. “Reachability” means a destination can be reached through those declared connections; it does not mean that destination has been compromised.

## Prepare the environment

For a hosted rehearsal, have C confirm the deployed version, frontend URL, backend availability, and whether the data is freshly loaded or replayed. Reading, Twin simulation and report generation do not require the operator token. Replay does.

For local practice, follow [frontend/README.md](frontend/README.md). With the project's Python dependencies already installed, open two PowerShell terminals:

Terminal 1, from the repository root:

```powershell
Set-Location D:\Kartika
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
Set-Location D:\Kartika\frontend
npm.cmd ci
npm.cmd run dev
```

Use the URL printed by Vite, normally `http://127.0.0.1:5173`. If the Python environment is missing, use the virtual-environment installation instructions in the README. Keep both terminals running.

For replay on your own local demo instance, set `COIP_OPERATOR_TOKEN` in the backend terminal before starting the server, using a private value of your choice. Enter the same value in the app's **Token operator** field. C supplies the token for the shared hosted instance. The field must be filled again after a page reload; do not include the token in presentation material.

Fresh fixture startup should show 8 assets, 19 events and 2 incidents, including **INC-0001** for SRV-APP. After replay, incident and event IDs can change. Select the current SRV-APP incident and verify the full scenario is loaded instead of using an old saved incident link.

## Proposed complete ten-scene walkthrough

This is a practical rehearsal sequence based on the current application. It is **not the missing official blueprint**. C should reconcile the sequence and timing with that blueprint before recording.

### 1. Introduce the problem

**Action:** Open **Operasi** with the loaded fixture data.

**Say:** “Security teams need to understand both an incident and the consequences of responding. COIP connects investigation with a simulation of possible defensive actions.”

**Check:** The API is connected, assets and incidents are visible, and no connection error is displayed.

### 2. Explain the network and services

**Action:** Open **Infrastruktur**. Locate SRV-APP, SRV-DB and SRV-SCADA and show the topology and service dependencies.

**A says:** “The application server provides the Portal. Its database connection is required. Its SCADA status connection is optional. That difference matters when we block connections.”

**Check:** Eight assets are listed. Portal, Historian and SCADA services are represented.

### 3. Replay the security events

**Action:** On a demo instance reserved for the rehearsal, return to **Operasi**. Enter the operator token. Click **Ulangi**, read the confirmation and choose **Mulai ulang skenario**. Click **Lanjutkan** several times to show events arriving. Finally click **Muat sisa skenario**.

**Say:** “These are synthetic endpoint and network detections. As records arrive, the application groups related evidence into incidents.”

**Check:** Events arrive, incidents form, and replay reaches 19/19 before the Twin demonstration. Incident formation need not occur after the first click.

**Important:** Reset clears events and incidents in the connected backend's memory for everyone using it, including API-ingested records. Arrange this with the team first. The three Twin scenarios themselves do not require a reset between runs.

### 4. Investigate the SRV-APP incident

**Action:** Select the incident whose main asset is SRV-APP. Open **Investigasi**. Show the timeline, a relationship explanation and an evidence record.

**Say:** “We can trace the incident back to its source evidence. We use the observed suspicious connections as inputs to the simulation.”

**Check:** The selected incident concerns SRV-APP. With the complete fixture story, there are two observed outbound/lateral malicious flows for the Twin: f08 and f09. The inbound initial-access flow is not counted as one of these two.

### 5. Introduce the Twin

**Action:** Click **Bandingkan respons**, or open **Simulasi**. Confirm **Aset awal: SRV-APP**. Point to the limitation notice and the three cards.

**A says:** “We now test three possible responses against the same incident. The engine removes connections in a model, recalculates what remains reachable, and checks the effect on services. It does not apply firewall changes.”

**Check:** Three preset cards are available. If the simulator is still loading or reports an error, resolve it before presenting results.

### 6. Run scenario A: isolate the server

**Action:** Click **A — Isolasi SRV-APP**. Wait for the result, then show the removed connections and service statuses below the cards.

**Expected:** Six flows removed: f01, f02, f03, f08, f09, f10. Both malicious flows blocked. No destination remains reachable from SRV-APP. Portal is down; Historian and SCADA remain available.

**A says:** “Disconnecting the application server gives the strongest containment in this model. The cost is that the Portal stops working.”

### 7. Run scenario B: block the observed malicious connections

**Action:** Click **B — Blokir alur teramati**. Show the changed graph and service results.

**Expected:** Only f08 and f09 are removed. Both malicious flows are blocked. SRV-DB remains reachable. Portal is degraded; Historian and SCADA remain available.

**A says:** “This blocks both observed suspicious connections while keeping more functionality. The Portal loses its optional SCADA status connection, but its database connection remains. That remaining access also means containment is not complete.”

### 8. Run scenario C: block Operations access

**Action:** Click **C — Batasi akses segmen**.

**Expected:** f03 and f08 are removed. Only one of the two malicious flows is blocked. EXT-C2 remains reachable. Portal is down because its required database connection is removed. Historian and SCADA remain available.

**A says:** “This response breaks the Portal's required database connection but leaves the external suspicious connection open. It causes disruption without achieving the containment of full isolation.”

### 9. Compare the choices

**Action:** Click **Bandingkan semua skenario**. Show the table. Click a scenario name in the table to inspect its detailed result below.

**Expected:** The table matches the reference below, and C is marked as dominated by isolation. Running comparison initially selects A's details; this is normal.

**A says:** “A and B offer different trade-offs. A contains more; B preserves more service availability. C is dominated by A because it has the same availability score and worse containment. The analyst still makes the decision.”

### 10. Export and close

**Action:** Open **Laporan**, confirm the same incident, and click **Unduh laporan investigasi**. Open the downloaded `.md` file in a text editor or Markdown preview.

**Expected:** The file contains the incident summary, evidence timeline, all three scenario comparisons and model limitations. Its filename follows the current incident ID; it is `INC-0001.md` on the initial fixture instance. The report recomputes all three presets, rather than exporting only the last card clicked.

**A says:** “The results can be reviewed alongside the evidence. These are indicative calculations from declared policy and dependencies, not packet-level validation, attack prediction or automatic remediation.”

**Handoff:** C closes the presentation and handles the recording and submission. Do not reset or ingest new data between comparison and export, so both describe the same incident state.

## Expected-results reference

Use this table only after the complete SRV-APP fixture story has loaded.

| Check | A: isolate | B: observed flows | C: Operations access |
|---|---|---|---|
| Removed flows | f01 f02 f03 f08 f09 f10 | f08 f09 | f03 f08 |
| Malicious blocked | 2/2 | 2/2 | 1/2 |
| Remaining reach from SRV-APP | None | SRV-DB | EXT-C2 |
| Portal | Down / tidak tersedia | Degraded / terganggu | Down / tidak tersedia |
| Historian | Available | Available | Available |
| SCADA | Available | Available | Available |
| Exact containment score | 1.000000 | 0.833333 | 0.750000 |
| Exact availability score | 0.750 | 0.875 | 0.750 |
| UI Pembatasan | 100% | 83% | 75% |
| UI Ketersediaan | 75% | 88% | 75% |
| Comparison | Not dominated | Not dominated | Dominated by A |

The UI rounds percentages to whole numbers. B showing 88% availability is correct: its underlying value is 87.5%.

## Explain the scores without maths

**Containment** combines two things: how many observed malicious connections are blocked, and how much access to internal assets is reduced. More critical internal assets carry more weight. B blocks both malicious connections but still permits database access, so its score is below 100%.

**Availability** measures service impact using service importance. A down service counts as a full loss; a degraded service counts as half a loss. Portal has weight 4, Historian 4 and SCADA 8. Losing Portal is therefore a loss of 4 out of 16, giving 75% availability. Degrading Portal is a loss of 2 out of 16, giving 87.5%.

These scores are not probabilities, uptime measurements or proof that the infrastructure is secure. A 100% containment score means full containment according to this incident and model, not protection against every possible attack.

## If something goes wrong

| What you see | What to do | Who helps |
|---|---|---|
| API unavailable | Check the backend is running and the URL is correct; click **Hubungkan kembali**. | C; B if UI configuration is wrong |
| Reset or step returns 403 | Enter the correct operator token. C checks the backend token configuration. Reading and Twin simulation should still work. | C |
| INC-0001 is missing after replay | Click **Perbarui data** and select the current SRV-APP incident. IDs are not reused after reset. | C if the incident never forms |
| No incident or incomplete results | Finish **Muat sisa skenario**, refresh, and reselect SRV-APP. | C |
| Presets fail to load | Use **Hubungkan ulang simulator**; check the deployed backend version and endpoint response. | C, then A for engine errors |
| Scenario outcomes differ from the table | Confirm full replay and the correct incident first. Capture the input and actual result; compare API output with the displayed values. | A for wrong computation; B for wrong display |
| B shows 83% / 88% | Continue: these are the expected rounded UI values. | No fix needed |
| Report download fails or disagrees | Verify the same incident and unchanged data; capture the error and compare again. | C for report/API; A for scenario calculation; B for download UI |

For a bug, record: URL and deployed version, current incident ID, preset clicked, expected result, actual result, and the visible error or screenshot. Avoid calling a partial-replay result an engine bug until the full fixture has loaded.

During recording, pause if a result is wrong. Investigate and rerun the affected scene after correction; do not describe the expected result as though it appeared on screen.

## Rehearsal completion checklist

- [ ] C has reconciled this proposed sequence with the official blueprint and time limit.
- [ ] Team agrees on presenter, mouse operator, demo URL and replay timing.
- [ ] Full fixture story is loaded; SRV-APP is selected.
- [ ] A, B and C produce the expected removed flows, reach and service effects.
- [ ] Comparison shows the expected rounded scores and C dominated by A.
- [ ] Downloaded report agrees with the comparison and contains limitations.
- [ ] A can explain why B preserves more service and why C is dominated.
- [ ] Hosted app works from a phone and incognito window; C/B resolve any hosting or layout failures.
- [ ] Any discovered Twin defects are fixed and the affected steps are repeated.

## What has already been verified

At `d389a86`, review confirmed the required demo against [CONTRACT.md](CONTRACT.md). All 17 backend tests passed, including actual HTTP integration. Additional checks covered exact scores, service consumer rules, optional dependencies, unchanged input data and deterministic results.

That evidence covers the reviewed local backend. This document is an instruction guide, not evidence that the hosted rehearsal has occurred. Leave the checklist unchecked until the team performs those steps.
