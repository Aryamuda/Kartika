"""Deterministic, advisory simulations over COIP's declared permitted flows."""
from __future__ import annotations

import networkx as nx

from .models import CompareResult, Intervention, SimulationResult

WEIGHTS = {"low": 1, "medium": 2, "high": 4, "critical": 8}
LIMITATIONS = (
    "Results model declared permitted flows and service dependencies only; "
    "they are not packet-level validation, attack predictions, or operational recommendations."
)


def presets(incident: dict) -> list[Intervention]:
    """The demo interventions, using the incident's actual observed malicious flows."""
    source = incident.get("primary_asset")
    if not source:
        return []
    malicious = sorted({f["flow_id"] for f in incident["observed_flows"]
                        if f["direction"] in ("outbound", "lateral")})
    return [
        Intervention(type="isolate_asset", asset_id=source, name=f"Isolate {source}"),
        Intervention(type="block_flows", flow_ids=malicious, name="Block observed malicious flows"),
        Intervention(type="block_segment_access", source=source, segment="seg-ops",
                     name="Block access to Operations segment"),
    ]


def _graph(topology: dict) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_nodes_from(n["id"] for n in topology["nodes"])
    graph.add_edges_from((f["src"], f["dst"]) for f in topology["flows"])
    return graph


def _reach(graph: nx.DiGraph, nodes: list[str]) -> tuple[int, list[list[int]]]:
    reachable = {n: nx.descendants(graph, n) for n in nodes}
    pairs = sum(dst in reachable[src] for src in nodes for dst in nodes)
    matrix = [[int(dst == src or dst in reachable[src]) for dst in nodes] for src in nodes]
    return pairs, matrix


def _services(topology: dict, removed: set[str], isolated: str | None) -> list[dict]:
    flows = topology["flows"]
    impacts = []
    for service in topology["services"]:
        reasons = []
        down = service["host"] == isolated
        degraded = False
        if down:
            reasons.append(f"Service host {isolated} is isolated")
        for dep in service["depends_on"]:
            if dep["via_flow"] in removed:
                reasons.append(f"{'Required' if dep['required'] else 'Optional'} dependency flow {dep['via_flow']} removed")
                if dep["required"]:
                    down = True
                else:
                    degraded = True
        consumers = [c for c in service["consumers"] if c != isolated]
        lost = [c for c in consumers if not any(
            f["src"] == c and f["dst"] == service["host"] and f["port"] == service["port"]
            and f["id"] not in removed for f in flows)]
        if lost:
            reasons.append(f"Consumer access lost for {', '.join(lost)}")
            if len(lost) == len(consumers):
                down = True
            else:
                degraded = True
        status = "down" if down else "degraded" if degraded else "available"
        impacts.append({"service_id": service["id"], "name": service["name"],
                        "before": "available", "after": status, "reasons": reasons,
                        "users_affected": lost if status != "down" else sorted(set(lost + consumers))})
    return impacts


def simulate(intervention: Intervention, incident: dict, topology: dict,
             assets: dict[str, dict]) -> SimulationResult:
    flows = {f["id"]: f for f in topology["flows"]}
    source = incident.get("primary_asset")
    if source not in assets:
        raise ValueError("Incident has no valid primary asset")
    isolated = None
    if intervention.type == "isolate_asset":
        isolated = intervention.asset_id
        if isolated not in assets:
            raise ValueError(f"Unknown asset: {isolated}")
        removed = {fid for fid, f in flows.items() if isolated in (f["src"], f["dst"])}
    elif intervention.type == "block_flows":
        removed = set(intervention.flow_ids or [])
        unknown = removed - flows.keys()
        if unknown:
            raise ValueError(f"Unknown flow IDs: {', '.join(sorted(unknown))}")
    else:
        if intervention.source not in assets:
            raise ValueError(f"Unknown source asset: {intervention.source}")
        segments = {s["id"] for s in topology["segments"]}
        if intervention.segment not in segments:
            raise ValueError(f"Unknown segment: {intervention.segment}")
        removed = {fid for fid, f in flows.items() if f["src"] == intervention.source
                   and assets.get(f["dst"], {}).get("segment") == intervention.segment}

    before = _graph(topology)
    after = _graph({**topology, "flows": [f for f in flows.values() if f["id"] not in removed]})
    nodes = sorted(before.nodes)
    pairs_before, matrix_before = _reach(before, nodes)
    pairs_after, matrix_after = _reach(after, nodes)
    reach_before = sorted(nx.descendants(before, source))
    reach_after = sorted(nx.descendants(after, source))
    internal_before = set(reach_before) & assets.keys()
    internal_after = set(reach_after) & assets.keys()
    weighted_before = sum(WEIGHTS[assets[a]["criticality"]] for a in internal_before)
    weighted_after = sum(WEIGHTS[assets[a]["criticality"]] for a in internal_after)
    malicious = {f["flow_id"] for f in incident["observed_flows"]
                 if f["direction"] in ("outbound", "lateral")}
    blocked = malicious & removed
    containment = 0.5 * (len(blocked) / len(malicious) if malicious else 0) + 0.5 * (
        (weighted_before - weighted_after) / weighted_before if weighted_before else 0)
    services = _services(topology, removed, isolated)
    service_weights = {s["id"]: WEIGHTS[s["criticality"]] for s in topology["services"]}
    total_weight = sum(service_weights.values())
    impact = sum(service_weights[s["service_id"]] * {"available": 0, "degraded": 0.5, "down": 1}[s["after"]]
                 for s in services)
    availability = 1 - impact / total_weight if total_weight else 1
    removed_records = [{**flows[fid], "malicious": fid in malicious} for fid in sorted(removed)]
    affected = sorted({n for fid in removed for n in (flows[fid]["src"], flows[fid]["dst"])})
    name = intervention.name or intervention.type.replace("_", " ").title()
    return SimulationResult(
        scenario_name=name, intervention=intervention, removed_flows=removed_records,
        change_set=[{"enforcement_point": "network policy", "action": "QUARANTINE" if isolated else "DENY",
                     "rule": f"Advisory: remove permitted flow {fid} ({flows[fid]['src']} -> {flows[fid]['dst']}:{flows[fid]['port']})"}
                    for fid in sorted(removed)],
        reachability={"pairs_before": pairs_before, "pairs_after": pairs_after,
                      "compromised_reach_before": reach_before, "compromised_reach_after": reach_after,
                      "matrix": {"assets": nodes, "before": matrix_before, "after": matrix_after}},
        isolation={"target": isolated, "isolated": True, "remaining_flows": 0} if isolated else None,
        service_availability=services,
        security_impact={"malicious_total": len(malicious), "malicious_blocked": len(blocked),
                         "remaining_flow_ids": sorted(malicious - blocked),
                         "threat_path_interrupted": bool(malicious) and malicious <= blocked,
                         "critical_reachable_before": sorted(a for a in internal_before if assets[a]["criticality"] == "critical"),
                         "critical_reachable_after": sorted(a for a in internal_after if assets[a]["criticality"] == "critical")},
        collateral={"legit_flows_removed": len(removed - malicious),
                    "services_impacted": [s["service_id"] for s in services if s["after"] != "available"],
                    "assets_affected": affected},
        scores={"containment": round(containment, 6), "availability": round(availability, 6),
                "method": "Containment = 0.5 × observed malicious flows blocked fraction + 0.5 × weighted internal reach reduction; availability = 1 - weighted service impact / total service weight. Weights: low 1, medium 2, high 4, critical 8; degraded impact 0.5, down 1. Empty malicious or baseline reach contributes 0; empty service set has availability 1."},
        observations=[f"Blocked {len(blocked)} of {len(malicious)} observed malicious flows.",
                      f"Weighted internal reach changed from {weighted_before} to {weighted_after}.",
                      f"Affected services: {', '.join(s['name'] + ' (' + s['after'] + ')' for s in services if s['after'] != 'available') or 'none'}."],
        limitations=LIMITATIONS,
    )


def compare(interventions: list[Intervention], incident: dict, topology: dict,
            assets: dict[str, dict]) -> CompareResult:
    results = [simulate(i, incident, topology, assets) for i in interventions]
    names = [result.scenario_name for result in results]
    if len(set(names)) != len(names):
        raise ValueError("Scenario names must be unique")
    dominated = {}
    for i, candidate in enumerate(results):
        for j, other in enumerate(results):
            if i == j:
                continue
            c, o = candidate.scores, other.scores
            if (o["containment"] >= c["containment"] - 1e-6
                and o["availability"] >= c["availability"] - 1e-6
                and (o["containment"] > c["containment"] + 1e-6
                     or o["availability"] > c["availability"] + 1e-6)):
                dominated[candidate.scenario_name] = other.scenario_name
                break
    return CompareResult(incident_id=incident["id"], results=results, dominated=dominated)
