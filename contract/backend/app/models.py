"""COIP API contract. Single source of truth: frontend/src/types.ts mirrors these models."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Severity = Literal["info", "low", "medium", "high", "critical"]
Criticality = Literal["low", "medium", "high", "critical"]
AssetStatus = Literal["healthy", "alerting", "targeted", "compromised"]
ServiceStatus = Literal["available", "degraded", "down"]


# ---------------------------------------------------------------- infrastructure
class Asset(BaseModel):
    id: str
    hostname: str
    ips: list[str]
    type: Literal["server", "endpoint", "firewall"]
    segment: str
    site: str
    criticality: Criticality
    os: str
    role: str
    owner: str
    agent_id: str | None
    tags: list[str]


class Flow(BaseModel):
    """One permitted communication (a firewall/ACL allow). Edges of the Cyber Twin graph."""
    id: str
    src: str
    dst: str
    port: int
    proto: str
    label: str


class ServiceDependency(BaseModel):
    service: str
    required: bool
    via_flow: str
    note: str


class Service(BaseModel):
    id: str
    name: str
    host: str
    port: int
    criticality: Criticality
    consumers: list[str]
    depends_on: list[ServiceDependency]


# ---------------------------------------------------------------- events
class Mitre(BaseModel):
    id: str
    tactic: str
    technique: str


class EventAsset(BaseModel):
    asset_id: str
    role: Literal["agent", "source", "destination", "cited-source"]
    reason: str  # why this event was tied to this asset (explainability)


class Ioc(BaseModel):
    type: Literal["ip"]
    value: str
    reason: str


class Provenance(BaseModel):
    origin: Literal["fixture-replay", "api"]
    parser: str
    raw_sha256: str
    received_at: str
    source_location: str | None


class Event(BaseModel):
    id: str  # EVT-0001
    source: Literal["wazuh", "suricata"]
    ts: str  # ISO 8601 UTC
    severity: Severity
    severity_score: int  # 0-100
    title: str
    category: str
    signature_id: str
    src_ip: str | None
    src_port: int | None
    dst_ip: str | None
    dst_port: int | None
    proto: str | None
    primary_asset: str | None
    assets: list[EventAsset]
    iocs: list[Ioc]
    mitre: list[Mitre]
    evidence: list[str]
    detail: str
    incident_id: str | None
    provenance: Provenance
    raw: dict | None = None  # only on GET /api/events/{id}


# ---------------------------------------------------------------- incidents
class AffectedAsset(BaseModel):
    asset_id: str
    role: Literal["suspected-compromised", "targeted", "involved"]
    criticality: Criticality
    event_count: int


class ScoreFactor(BaseModel):
    label: str
    points: int


class Tactic(BaseModel):
    tactic: str
    technique: str | None
    technique_id: str | None
    first_event: str
    ts: str


class GraphNode(BaseModel):
    id: str
    kind: Literal["asset", "ioc"]
    label: str
    type: str
    criticality: Criticality | None
    ip: str
    role: str
    wazuh: int
    suricata: int


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    kind: Literal["flow", "cited"]
    label: str
    port: int | None = None
    count: int
    event_ids: list[str]  # evidence behind this relationship
    reasons: list[str]
    signatures: list[str]


class ObservedFlow(BaseModel):
    """A modeled Flow seen in Suricata alerts. outbound/lateral = malicious, used by the Cyber Twin."""
    flow_id: str
    direction: Literal["inbound", "outbound", "lateral", "other"]
    event_ids: list[str]
    first: str
    last: str


class Incident(BaseModel):
    id: str  # INC-0001
    title: str
    status: Literal["open"]
    severity: Severity
    risk_score: int
    score_factors: list[ScoreFactor]
    first_seen: str
    last_seen: str
    primary_asset: str | None
    affected_assets: list[AffectedAsset]
    iocs: list[dict]
    event_ids: list[str]  # chronological
    seed_event_ids: list[str]
    context_event_ids: list[str]
    sources: dict[str, int]
    tactics: list[Tactic]  # kill-chain order
    summary: str
    relationships: dict  # {"nodes": GraphNode[], "edges": GraphEdge[]}
    observed_flows: list[ObservedFlow]


# ---------------------------------------------------------------- cyber twin
class Intervention(BaseModel):
    type: Literal["isolate_asset", "block_flows", "block_segment_access"]
    name: str | None = None
    asset_id: str | None = None  # isolate_asset
    flow_ids: list[str] | None = None  # block_flows
    source: str | None = None  # block_segment_access
    segment: str | None = None  # block_segment_access


class SimulateRequest(BaseModel):
    incident_id: str
    intervention: Intervention


class CompareRequest(BaseModel):
    incident_id: str
    interventions: list[Intervention]


class ServiceImpact(BaseModel):
    service_id: str
    name: str
    before: ServiceStatus
    after: ServiceStatus
    reasons: list[str]
    users_affected: list[str]


class ChangeItem(BaseModel):
    """Advisory change set an analyst could apply. COIP never executes it."""
    enforcement_point: str
    action: Literal["DENY", "QUARANTINE"]
    rule: str


class SimulationResult(BaseModel):
    scenario_name: str
    intervention: Intervention
    removed_flows: list[dict]  # {id, src, dst, port, label, malicious}
    change_set: list[ChangeItem]
    reachability: dict  # pairs_before/after, compromised_reach_before/after (asset ids), matrix {assets, before, after}
    isolation: dict | None  # {target, isolated, remaining_flows}; null unless isolate_asset
    service_availability: list[ServiceImpact]
    security_impact: dict  # malicious_total, malicious_blocked, remaining_flow_ids, threat_path_interrupted, critical_reachable_before/after
    collateral: dict  # legit_flows_removed, services_impacted, assets_affected
    scores: dict  # containment 0-1, availability 0-1 (indicative, method in scores.method)
    observations: list[str]
    limitations: str


class CompareResult(BaseModel):
    incident_id: str
    results: list[SimulationResult]
    dominated: dict[str, str]  # scenario_name -> name of the scenario that dominates it


# ---------------------------------------------------------------- overview
class Overview(BaseModel):
    stats: dict  # events, assets, open_incidents, sources{wazuh,suricata}
    incidents: list[Incident]
    asset_status: dict[str, dict]  # id -> {status: AssetStatus, incident_ids, event_count}
    sites: list[dict]
    recent_events: list[Event]
    replay: dict  # {mode, ingested, remaining, total}
