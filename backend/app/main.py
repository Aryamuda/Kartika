"""HTTP API for the COIP demo application."""
from __future__ import annotations

from copy import deepcopy
import math
import os
import secrets
import threading
import time
from typing import Any

from fastapi import Body, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from . import twin
from .models import Asset, CompareRequest, CompareResult, Event, Incident, Intervention, Overview, SimulateRequest, SimulationResult
from .reports import build_report
from .store import Store


app = FastAPI(title="COIP API", version="0.1.0")

_PUBLIC_DEMO_REPLAY_PATHS = frozenset({"/api/ingest/reset", "/api/ingest/step"})
_PUBLIC_DEMO_REPLAY_COOLDOWN_SECONDS = 2.0
_public_replay_lock = threading.Lock()
_last_public_reset_at: float | None = None


def _operator_token_is_valid(request: Request) -> bool:
    token = os.getenv("COIP_OPERATOR_TOKEN", "")
    supplied = request.headers.get("authorization", "")
    return bool(token) and secrets.compare_digest(supplied.encode(), f"Bearer {token}".encode())


@app.middleware("http")
async def protect_ingestion(request: Request, call_next):
    global _last_public_reset_at
    if request.method == "POST" and request.url.path.startswith("/api/ingest/"):
        authorized = _operator_token_is_valid(request)
        public_demo_replay = (
            request.url.path in _PUBLIC_DEMO_REPLAY_PATHS
            and os.getenv("COIP_PUBLIC_DEMO_REPLAY", "").strip().lower() in {"1", "true", "yes", "on"}
        )
        if public_demo_replay and not authorized and request.url.path == "/api/ingest/reset":
            now = time.monotonic()
            with _public_replay_lock:
                if _last_public_reset_at is not None:
                    remaining = _PUBLIC_DEMO_REPLAY_COOLDOWN_SECONDS - (now - _last_public_reset_at)
                    if remaining > 0:
                        retry_after = max(1, math.ceil(remaining))
                        return JSONResponse(
                            status_code=429,
                            headers={"Retry-After": str(retry_after)},
                            content={"detail": "Replay demo sedang dibatasi. Coba lagi sebentar."},
                        )
                _last_public_reset_at = now
        elif not authorized and not public_demo_replay:
            return JSONResponse(status_code=403, content={"detail": "Token operator diperlukan untuk mengubah data."})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("COIP_ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

store = Store()


def _event_view(event: dict[str, Any], *, with_raw: bool = False) -> dict[str, Any]:
    return deepcopy(store.public_event(event, with_raw=with_raw))


@app.get("/api/overview", response_model=Overview, response_model_exclude_unset=True)
def get_overview() -> dict[str, Any]:
    with store.lock:
        events = store.events
        incidents = deepcopy(store.incidents)
        source_counts = {
            source: sum(event["source"] == source for event in events)
            for source in ("wazuh", "suricata")
        }
        return {
            "stats": {
                "events": len(events),
                "assets": len(store.ctx.assets),
                "open_incidents": sum(incident["status"] == "open" for incident in incidents),
                "sources": source_counts,
            },
            "incidents": incidents,
            "asset_status": store.asset_status(),
            "sites": deepcopy(list(store.ctx.sites.values())),
            "recent_events": [
                _event_view(event)
                for event in reversed(events[-10:])
            ],
            "replay": store.replay_status(),
        }


@app.get("/api/assets", response_model=list[Asset])
def list_assets() -> list[dict[str, Any]]:
    with store.lock:
        return deepcopy(list(store.ctx.assets.values()))


@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: str) -> dict[str, Any]:
    with store.lock:
        asset = store.ctx.assets.get(asset_id)
        if asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")

        related_events = [
            _event_view(event)
            for event in reversed(store.events)
            if any(link["asset_id"] == asset_id for link in event["assets"])
        ]
        related_flows = [
            flow
            for flow in store.topology["flows"]
            if flow["src"] == asset_id or flow["dst"] == asset_id
        ]
        related_services = [
            service
            for service in store.topology["services"]
            if service["host"] == asset_id or asset_id in service["consumers"]
        ]
        return {
            **deepcopy(asset),
            "events": related_events,
            "flows": deepcopy(related_flows),
            "services": deepcopy(related_services),
        }


@app.get("/api/topology")
def get_topology() -> dict[str, Any]:
    return deepcopy(store.topology)


@app.get(
    "/api/events",
    response_model=list[Event],
    response_model_exclude_unset=True,
)
def list_events(
    asset: str | None = Query(default=None),
    source: str | None = Query(default=None),
    severity: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    with store.lock:
        events = store.events
        if asset:
            events = [
                event
                for event in events
                if any(link["asset_id"] == asset for link in event["assets"])
            ]
        if source:
            events = [event for event in events if event["source"] == source]
        if severity:
            events = [event for event in events if event["severity"] == severity]
        return [_event_view(event) for event in reversed(events)]


@app.get(
    "/api/events/{event_id}",
    response_model=Event,
    response_model_exclude_unset=True,
)
def get_event(event_id: str) -> dict[str, Any]:
    with store.lock:
        event = store.get_event(event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")
        return _event_view(event, with_raw=True)


@app.get("/api/incidents", response_model=list[Incident])
def list_incidents() -> list[dict[str, Any]]:
    with store.lock:
        return deepcopy(store.incidents)


@app.get("/api/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str) -> dict[str, Any]:
    with store.lock:
        incident = store.get_incident(incident_id)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        return deepcopy(incident)


def _records(payload: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
    return payload if isinstance(payload, list) else [payload]


@app.post("/api/ingest/wazuh", status_code=201)
def ingest_wazuh(
    payload: dict[str, Any] | list[dict[str, Any]] = Body(...),
) -> dict[str, list[str]]:
    try:
        return {"event_ids": store.ingest("wazuh", _records(payload))}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/ingest/suricata", status_code=201)
def ingest_suricata(
    payload: dict[str, Any] | list[dict[str, Any]] = Body(...),
) -> dict[str, list[str]]:
    try:
        return {"event_ids": store.ingest("suricata", _records(payload))}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/ingest/reset")
def reset_replay() -> dict[str, Any]:
    store.reset_for_replay()
    return store.replay_status()


@app.post("/api/ingest/step")
def step_replay(n: int = Query(default=1, ge=1)) -> dict[str, Any]:
    store.step(n)
    return store.replay_status()


@app.get("/api/twin/presets", response_model=list[Intervention])
def get_twin_presets(incident_id: str = Query(...)) -> list[Intervention]:
    return twin.presets(get_incident(incident_id))


@app.post("/api/twin/simulate", response_model=SimulationResult)
def simulate_response(payload: SimulateRequest) -> SimulationResult:
    with store.lock:
        incident = get_incident(payload.incident_id)
        try:
            return twin.simulate(payload.intervention, incident, store.topology, store.ctx.assets)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error


def _comparison(payload: CompareRequest) -> tuple[dict, CompareResult]:
    if not payload.interventions:
        raise HTTPException(status_code=422, detail="Pilih setidaknya satu intervensi.")
    with store.lock:
        incident = get_incident(payload.incident_id)
        try:
            result = twin.compare(payload.interventions, incident, store.topology, store.ctx.assets)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
    return incident, result


@app.post("/api/twin/compare", response_model=CompareResult)
def compare_responses(payload: CompareRequest) -> CompareResult:
    return _comparison(payload)[1]


@app.post("/api/reports", response_model=dict[str, str])
def create_report(payload: CompareRequest) -> dict[str, str]:
    # Keep the comparison and evidence on the same snapshot during replay resets.
    with store.lock:
        incident, comparison = _comparison(payload)
        members = set(incident["event_ids"])
        events = [_event_view(event) for event in store.events if event["id"] in members]
    return build_report(incident, comparison, events)
