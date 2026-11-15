# COIP contract

Shared by backend, frontend and fixtures. Types: `backend/app/models.py` (Pydantic), mirrored in `frontend/src/types.ts`. Change both together.

## Data (synthetic, in `backend/app/data/`)
| File | Content |
|---|---|
| `assets.json` | 2 sites, 8 assets (1 firewall, 3 servers, 4 endpoints) |
| `topology.json` | 2 segments, node layout, 10 permitted `flows`, 3 `services` with dependencies |
| `wazuh_alerts.json` | 10 Wazuh alerts, real `alerts.json` layout |
| `suricata_eve.json` | 9 Suricata alerts, real `eve.json` layout |

Regenerate with `python tools/make_fixtures.py` (`--shift-now` re-times to the present).
Demo story: INC-0001 (critical): SRV-APP exploited, C2 beacon, Modbus activity toward SRV-SCADA. INC-0002 (medium): WS-02 download.

## Pipeline
Raw record -> `normalize_*` (store.py) -> Event (raw kept, SHA-256 + parser in `provenance`) -> `correlate` -> Incident.
- Seeds: events with severity >= medium, linked when they share an asset or external IP within 30 min.
- Low events attach as context if they touch an incident asset within 15 min.
- Every asset/IOC link carries a `reason` string. Every graph edge lists its `event_ids`.

## Endpoints
| Method | Path | Returns |
|---|---|---|
| GET | `/api/overview` | `Overview` |
| GET | `/api/assets`, `/api/assets/{id}` | `Asset[]` / `Asset` + `events`, `flows`, `services` |
| GET | `/api/topology` | segments, nodes (with `pos`), flows, services |
| GET | `/api/events?asset=&source=&severity=` | `Event[]` (no raw) |
| GET | `/api/events/{id}` | `Event` with `raw` |
| GET | `/api/incidents`, `/api/incidents/{id}` | `Incident[]` / `Incident` |
| POST | `/api/ingest/wazuh`, `/api/ingest/suricata` | body: one record or a list. Returns new event ids |
| POST | `/api/ingest/reset` then `/api/ingest/step?n=1` | demo replay. Status in `Overview.replay` |
| GET | `/api/twin/presets?incident_id=` | `Intervention[]` |
| POST | `/api/twin/simulate` | `SimulateRequest` -> `SimulationResult` |
| POST | `/api/twin/compare` | `CompareRequest` -> `CompareResult` |
| POST | `/api/reports` | `CompareRequest` -> `{filename, markdown, html}` |

Read/replay endpoints and Twin/report integration are implemented in `backend/app/main.py`. The Twin engine is in `twin.py`; the minimal Markdown/printable HTML export is in `reports.py`.

## Twin rules (so frontend and engine agree)
- Graph = `topology.flows` (edge = permitted flow). Interventions only remove flows; isolating an asset removes every flow touching it.
- `compromised` = `Incident.primary_asset`. Malicious flows = `observed_flows` with direction `outbound` or `lateral`. `inbound` is the initial access path, shown but not counted.
- Service status: host isolated -> `down`. Required dependency flow lost -> `down`. Optional dependency lost -> `degraded`. Some consumers lost -> `degraded`, all lost -> `down`. The isolated target is not counted as a consumer.
- Scores: containment = 0.5 x malicious blocked + 0.5 x reduction of weighted internal reach (low 1, medium 2, high 4, critical 8). Availability = 1 - weighted service impact (down 1, degraded 0.5) / total. Indicative only, not a recommendation.
- Always return `limitations`: results come from declared policy, not packet-level validation.
- Response counts (`pairs_before`, `pairs_after`, `remaining_flows`, `legit_flows_removed`) are integers; reachability matrix cells are numeric 0/1, matching `frontend/src/types.ts`. Full removed-flow records remain in `removed_flows`.

## Expected demo results (INC-0001) to test against
| Scenario | Flows removed | Malicious blocked | Compromised can still reach | Services |
|---|---|---|---|---|
| A. Isolate SRV-APP | f01 f02 f03 f08 f09 f10 | 2/2 | nothing | Portal down |
| B. Block observed (f08, f09) | f08 f09 | 2/2 | SRV-DB | Portal degraded |
| C. Block SRV-APP -> Operations segment (f03, f08) | f03 f08 | 1/2 | EXT-C2 | Portal down. Dominated by A |
