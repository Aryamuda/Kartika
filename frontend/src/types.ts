// Mirrors backend/app/models.py. Change both together.

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Criticality = "low" | "medium" | "high" | "critical";
export type AssetStatus = "healthy" | "alerting" | "targeted" | "compromised";
export type ServiceStatus = "available" | "degraded" | "down";

export interface Asset {
  id: string; hostname: string; ips: string[];
  type: "server" | "endpoint" | "firewall";
  segment: string; site: string; criticality: Criticality;
  os: string; role: string; owner: string; agent_id: string | null; tags: string[];
}
export interface Flow { id: string; src: string; dst: string; port: number; proto: string; label: string }
export interface ServiceDependency { service: string; required: boolean; via_flow: string; note: string }
export interface Service {
  id: string; name: string; host: string; port: number; criticality: Criticality;
  consumers: string[]; depends_on: ServiceDependency[];
}

export interface Mitre { id: string; tactic: string; technique: string }
export interface EventAsset { asset_id: string; role: "agent" | "source" | "destination" | "cited-source"; reason: string }
export interface Ioc { type: "ip"; value: string; reason: string }
export interface Provenance {
  origin: "fixture-replay" | "api"; parser: string; raw_sha256: string;
  received_at: string; source_location: string | null;
}
export interface CoipEvent {
  id: string; source: "wazuh" | "suricata"; ts: string;
  severity: Severity; severity_score: number; title: string; category: string; signature_id: string;
  src_ip: string | null; src_port: number | null; dst_ip: string | null; dst_port: number | null; proto: string | null;
  primary_asset: string | null; assets: EventAsset[]; iocs: Ioc[]; mitre: Mitre[];
  evidence: string[]; detail: string; incident_id: string | null; provenance: Provenance;
  raw?: Record<string, unknown> | null;
}

export interface AffectedAsset { asset_id: string; role: "suspected-compromised" | "targeted" | "involved"; criticality: Criticality; event_count: number }
export interface Tactic { tactic: string; technique: string | null; technique_id: string | null; first_event: string; ts: string }
export interface GraphNode {
  id: string; kind: "asset" | "ioc"; label: string; type: string; criticality: Criticality | null;
  ip: string; role: string; wazuh: number; suricata: number;
}
export interface GraphEdge {
  id: string; source: string; target: string; kind: "flow" | "cited"; label: string; port?: number | null;
  count: number; event_ids: string[]; reasons: string[]; signatures: string[];
}
export interface ObservedFlow { flow_id: string; direction: "inbound" | "outbound" | "lateral" | "other"; event_ids: string[]; first: string; last: string }
export interface Incident {
  id: string; title: string; status: "open"; severity: Severity; risk_score: number;
  score_factors: { label: string; points: number }[];
  first_seen: string; last_seen: string; primary_asset: string | null;
  affected_assets: AffectedAsset[]; iocs: { type: string; value: string; event_ids: string[]; reasons: string[] }[];
  event_ids: string[]; seed_event_ids: string[]; context_event_ids: string[];
  sources: { wazuh: number; suricata: number }; tactics: Tactic[]; summary: string;
  relationships: { nodes: GraphNode[]; edges: GraphEdge[] };
  observed_flows: ObservedFlow[];
}

// Topology (GET /api/topology)
export interface TopoNode { id: string; type: "server" | "endpoint" | "firewall" | "external"; segment: string | null; pos: { x: number; y: number }; label?: string; ips?: string[] }
export interface Segment { id: string; name: string; cidr: string; site: string }
export interface Topology { segments: Segment[]; nodes: TopoNode[]; flows: Flow[]; services: Service[] }

// Cyber Twin
export interface Intervention {
  type: "isolate_asset" | "block_flows" | "block_segment_access";
  name?: string | null; asset_id?: string | null; flow_ids?: string[] | null; source?: string | null; segment?: string | null;
}
export interface ServiceImpact { service_id: string; name: string; before: ServiceStatus; after: ServiceStatus; reasons: string[]; users_affected: string[] }
export interface ChangeItem { enforcement_point: string; action: "DENY" | "QUARANTINE"; rule: string }
export interface SimulationResult {
  scenario_name: string; intervention: Intervention;
  removed_flows: { id: string; src: string; dst: string; port: number; label: string; malicious: boolean }[];
  change_set: ChangeItem[];
  reachability: {
    pairs_before: number; pairs_after: number;
    compromised_reach_before: string[]; compromised_reach_after: string[];
    matrix: { assets: string[]; before: number[][]; after: number[][] };
  };
  isolation: { target: string; isolated: boolean; remaining_flows: number } | null;
  service_availability: ServiceImpact[];
  security_impact: {
    malicious_total: number; malicious_blocked: number; remaining_flow_ids: string[];
    threat_path_interrupted: boolean; critical_reachable_before: string[]; critical_reachable_after: string[];
  };
  collateral: { legit_flows_removed: number; services_impacted: string[]; assets_affected: string[] };
  scores: { containment: number; availability: number; method: string };
  observations: string[]; limitations: string;
}
export interface CompareResult { incident_id: string; results: SimulationResult[]; dominated: Record<string, string> }

export interface Overview {
  stats: { events: number; assets: number; open_incidents: number; sources: { wazuh: number; suricata: number } };
  incidents: Incident[];
  asset_status: Record<string, { status: AssetStatus; incident_ids: string[]; event_count: number }>;
  sites: { id: string; name: string; note: string; lat: number; lon: number }[];
  recent_events: CoipEvent[];
  replay: { mode: "loaded" | "replay"; ingested: number; remaining: number; total: number };
}
