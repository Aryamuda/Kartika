"""HTTP API for the COIP demo application."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import Asset, Event, Incident, Overview
from .store import Store


app = FastAPI(title="COIP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    return {"event_ids": store.ingest("wazuh", _records(payload))}


@app.post("/api/ingest/suricata", status_code=201)
def ingest_suricata(
    payload: dict[str, Any] | list[dict[str, Any]] = Body(...),
) -> dict[str, list[str]]:
    return {"event_ids": store.ingest("suricata", _records(payload))}


@app.post("/api/ingest/reset")
def reset_replay() -> dict[str, Any]:
    store.reset_for_replay()
    return store.replay_status()


@app.post("/api/ingest/step")
def step_replay(n: int = Query(default=1, ge=1)) -> dict[str, Any]:
    store.step(n)
    return store.replay_status()
