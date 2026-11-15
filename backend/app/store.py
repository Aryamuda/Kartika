"""Ingestion, normalization and correlation for COIP.

Collect -> Normalize -> Correlate. Raw records are kept untouched next to the
normalized event, with a SHA-256 of the canonical raw JSON and the parser used.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import re
import threading
from uuid import uuid4
from copy import deepcopy
from .models import Event, Incident
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DATA = Path(__file__).parent / "data"
STORE_DIR = Path(__file__).resolve().parents[1] / "store"
PARSER_VERSION = "coip-normalizer/0.1"

SEV_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
CRIT_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}
CORRELATION_WINDOW = timedelta(minutes=30)
CONTEXT_WINDOW = timedelta(minutes=15)


# --------------------------------------------------------------------------- helpers
def parse_ts(value: str) -> datetime:
    """Parse ISO timestamps from both tools (+0000, +0700, +07:00, Z) into UTC."""
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    m = re.search(r"([+-])(\d{2})(\d{2})$", v)
    if m and ":" not in v[-6:]:
        v = v[: m.start()] + f"{m.group(1)}{m.group(2)}:{m.group(3)}"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def sha256_json(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def wazuh_severity(level: int) -> tuple[str, int]:
    if level >= 13:
        label = "critical"
    elif level >= 10:
        label = "high"
    elif level >= 7:
        label = "medium"
    elif level >= 4:
        label = "low"
    else:
        label = "info"
    return label, round(level / 15 * 100)


def suricata_severity(sev: int) -> tuple[str, int]:
    return {1: ("high", 85), 2: ("medium", 60), 3: ("low", 30)}.get(sev, ("info", 10))


def zip_mitre(ids, tactics, techniques) -> list[dict]:
    out = []
    for i, tid in enumerate(ids or []):
        out.append(
            {
                "id": tid,
                "tactic": (tactics[i] if i < len(tactics or []) else (tactics or [""])[0] if tactics else ""),
                "technique": (techniques[i] if i < len(techniques or []) else ""),
            }
        )
    return out


# --------------------------------------------------------------------------- context
class Context:
    """Asset inventory + topology lookups used during normalization."""

    def __init__(self, assets_doc: dict, topology: dict):
        self.sites = {s["id"]: s for s in assets_doc["sites"]}
        self.assets = {a["id"]: a for a in assets_doc["assets"]}
        self.topology = topology
        self.by_ip: dict[str, dict] = {}
        for a in self.assets.values():
            for ip in a["ips"]:
                self.by_ip[ip] = a
        self.by_agent_name = {a["hostname"]: a for a in self.assets.values()}
        self.cidrs = [ipaddress.ip_network(s["cidr"]) for s in topology["segments"]]
        self.external_by_ip = {}
        for n in topology["nodes"]:
            if n["type"] == "external":
                for ip in n.get("ips", []):
                    self.external_by_ip[ip] = n

    def is_internal(self, ip: str) -> bool:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return False
        return any(addr in c for c in self.cidrs)

    def asset_for_ip(self, ip: str | None):
        return self.by_ip.get(ip) if ip else None


# --------------------------------------------------------------------------- normalizers
def normalize_wazuh(raw: dict, ctx: Context) -> dict:
    rule = raw.get("rule", {}) or {}
    agent = raw.get("agent", {}) or {}
    data = raw.get("data", {}) or {}
    level = int(rule.get("level", 0))
    sev, score = wazuh_severity(level)

    assets: list[dict] = []
    iocs: list[dict] = []
    primary = None

    a = ctx.by_agent_name.get(agent.get("name", "")) or ctx.asset_for_ip(agent.get("ip"))
    if a:
        primary = a["id"]
        assets.append(
            {
                "asset_id": a["id"],
                "role": "agent",
                "reason": f"Wazuh agent {agent.get('name')} ({agent.get('ip')}) is registered to {a['id']} in the asset inventory",
            }
        )
    src_ip = data.get("srcip")
    if src_ip:
        sa = ctx.asset_for_ip(src_ip)
        if sa and sa["id"] != primary:
            assets.append(
                {"asset_id": sa["id"], "role": "cited-source", "reason": f"The alert cites source IP {src_ip}, which belongs to {sa['id']}"}
            )
        elif not sa and not ctx.is_internal(src_ip):
            iocs.append({"type": "ip", "value": src_ip, "reason": f"External source IP cited by Wazuh rule {rule.get('id')}"})

    mitre = rule.get("mitre") or {}
    ts = parse_ts(raw["timestamp"])
    evidence = []
    if data.get("audit", {}).get("command"):
        evidence.append(f"command: {data['audit']['command']}")
    if data.get("path"):
        evidence.append(f"path: {data['path']}")
    if data.get("url"):
        evidence.append(f"url: {data['url']}")
    if data.get("dstuser"):
        evidence.append(f"user: {data['dstuser']}")

    return {
        "source": "wazuh",
        "ts": ts,
        "severity": sev,
        "severity_score": score,
        "title": rule.get("description", "Wazuh alert"),
        "category": (rule.get("groups") or ["host"])[0],
        "signature_id": str(rule.get("id", "")),
        "src_ip": src_ip,
        "src_port": None,
        "dst_ip": agent.get("ip"),
        "dst_port": int(data["dstport"]) if str(data.get("dstport", "")).isdigit() else None,
        "proto": None,
        "primary_asset": primary,
        "assets": assets,
        "iocs": iocs,
        "mitre": zip_mitre(mitre.get("id"), mitre.get("tactic"), mitre.get("technique")),
        "evidence": evidence,
        "detail": f"rule {rule.get('id')} level {level} on {agent.get('name')}",
        "source_location": raw.get("location"),
    }


def normalize_suricata(raw: dict, ctx: Context) -> dict | None:
    if raw.get("event_type") != "alert":
        return None
    alert = raw.get("alert", {}) or {}
    sev, score = suricata_severity(int(alert.get("severity", 3)))
    src, dst = raw.get("src_ip"), raw.get("dest_ip")
    sa, da = ctx.asset_for_ip(src), ctx.asset_for_ip(dst)

    assets: list[dict] = []
    iocs: list[dict] = []
    if sa:
        assets.append({"asset_id": sa["id"], "role": "source", "reason": f"Suricata source IP {src} matches {sa['id']} in the asset inventory"})
    if da:
        assets.append({"asset_id": da["id"], "role": "destination", "reason": f"Suricata destination IP {dst} matches {da['id']} in the asset inventory"})
    for ip, role in ((src, "source"), (dst, "destination")):
        if ip and not ctx.asset_for_ip(ip) and not ctx.is_internal(ip):
            iocs.append({"type": "ip", "value": ip, "reason": f"External {role} IP in Suricata signature {alert.get('signature_id')}"})

    # the asset the alert is "about": the internal source if there is one, otherwise the destination
    primary = sa["id"] if sa else (da["id"] if da else None)
    meta = alert.get("metadata") or {}
    mitre = zip_mitre(meta.get("mitre_technique_id"), meta.get("mitre_tactic_name"), meta.get("mitre_technique_name"))
    return {
        "source": "suricata",
        "ts": parse_ts(raw["timestamp"]),
        "severity": sev,
        "severity_score": score,
        "title": alert.get("signature", "Suricata alert"),
        "category": alert.get("category", "network"),
        "signature_id": str(alert.get("signature_id", "")),
        "src_ip": src,
        "src_port": raw.get("src_port"),
        "dst_ip": dst,
        "dst_port": raw.get("dest_port"),
        "proto": (raw.get("proto") or "").lower() or None,
        "primary_asset": primary,
        "assets": assets,
        "iocs": iocs,
        "mitre": mitre,
        "evidence": [f"{src}:{raw.get('src_port')} -> {dst}:{raw.get('dest_port')} ({raw.get('app_proto', 'n/a')})"],
        "detail": f"sid {alert.get('signature_id')} severity {alert.get('severity')}",
        "source_location": raw.get("in_iface"),
    }


# --------------------------------------------------------------------------- store
class Store:
    def __init__(self):
        self.lock = threading.RLock()
        assets_doc = json.loads((DATA / "assets.json").read_text())
        self.topology = json.loads((DATA / "topology.json").read_text())
        self.ctx = Context(assets_doc, self.topology)
        self.events: list[dict] = []
        self.incidents: list[dict] = []
        self.queue: list[tuple[str, dict]] = []
        self.total_queued = 0
        self.mode = "loaded"
        self.next_event = 1
        self.next_incident = 1
        self.initial_load = True
        self.load_all()
        self.initial_load = False

    # ---- fixtures / replay
    def _fixture_records(self) -> list[tuple[str, dict]]:
        recs: list[tuple[str, dict]] = []
        for raw in json.loads((DATA / "wazuh_alerts.json").read_text()):
            recs.append(("wazuh", raw))
        for raw in json.loads((DATA / "suricata_eve.json").read_text()):
            recs.append(("suricata", raw))
        recs.sort(key=lambda r: parse_ts(r[1]["timestamp"]))
        return recs

    def load_all(self):
        """Start with the whole fixture timeline already ingested."""
        with self.lock:
            self.events, self.incidents = [], []
            recs = self._fixture_records()
            for kind, raw in recs:
                self._ingest_one(kind, raw, origin="fixture-replay", recompute=False)
            self.queue, self.total_queued = [], len(recs)
            self.mode = "loaded"
            self.recompute()
            for event in self.events:
                self._append_log(event)

    def reset_for_replay(self):
        with self.lock:
            self.events, self.incidents = [], []
            self.queue = self._fixture_records()
            self.total_queued = len(self.queue)
            self.mode = "replay"

    def step(self, n: int = 1) -> int:
        done = 0
        with self.lock:
            for _ in range(n):
                if not self.queue:
                    break
                kind, raw = self.queue.pop(0)
                self._ingest_one(kind, raw, origin="fixture-replay", recompute=False)
                done += 1
            if done:
                self.recompute()
                for event in self.events[-done:]:
                    self._append_log(event)
            if not self.queue:
                self.mode = "loaded"
        return done

    def replay_status(self) -> dict:
        with self.lock:
            return {
                "mode": self.mode,
                "ingested": len(self.events),
                "remaining": len(self.queue),
                "total": self.total_queued,
            }

    # ---- ingestion
    def _ingest_one(self, kind: str, raw: dict, origin: str, recompute: bool = True) -> dict | None:
        norm = normalize_wazuh(raw, self.ctx) if kind == "wazuh" else normalize_suricata(raw, self.ctx)
        if norm is None:
            return None
        norm["id"] = f"EVT-{self.next_event:04d}" if self.initial_load else f"EVT-{uuid4().hex}"
        norm["incident_id"] = None
        norm["raw"] = raw
        norm["provenance"] = {
            "origin": origin,
            "parser": PARSER_VERSION,
            "raw_sha256": sha256_json(raw),
            "received_at": iso(datetime.now(timezone.utc)),
            "source_location": norm.pop("source_location", None),
        }
        Event.model_validate(self.public_event(norm, with_raw=True))
        self.next_event += 1
        self.events.append(norm)
        if recompute:
            self.recompute()
            self._append_log(norm)
        return norm

    def ingest(self, kind: str, records: list[dict], origin: str = "api") -> list[str]:
        with self.lock:
            previous = self.events, self.incidents, self.next_event, self.next_incident
            self.events = deepcopy(self.events)
            ids = []
            try:
                for raw in records:
                    ev = self._ingest_one(kind, deepcopy(raw), origin=origin, recompute=False)
                    if ev:
                        ids.append(ev["id"])
                self.recompute()
            except (ValueError, TypeError, KeyError, AttributeError, IndexError, OverflowError) as error:
                self.events, self.incidents, self.next_event, self.next_incident = previous
                raise ValueError("Invalid ingestion batch; no records were stored") from error
            for event in self.events[len(previous[0]):]:
                self._append_log(event)
            return ids

    def _append_log(self, ev: dict):
        try:
            STORE_DIR.mkdir(exist_ok=True)
            with (STORE_DIR / "events.jsonl").open("a") as fh:
                fh.write(json.dumps({"id": ev["id"], "source": ev["source"], "sha256": ev["provenance"]["raw_sha256"], "raw": ev["raw"]}) + "\n")
        except OSError:
            pass

    # ---- views
    def public_event(self, ev: dict, with_raw: bool = False) -> dict:
        out = {k: v for k, v in ev.items() if k != "raw"}
        out["ts"] = iso(ev["ts"])
        if with_raw:
            out["raw"] = ev["raw"]
        return out

    def get_event(self, eid: str) -> dict | None:
        for e in self.events:
            if e["id"] == eid:
                return e
        return None

    # ---- correlation
    def recompute(self):
        incidents = correlate(self.events, self.ctx)
        claimed = set()
        for incident in incidents:
            old = next((item for item in self.incidents
                        if item["id"] not in claimed and set(item["seed_event_ids"]) & set(incident["seed_event_ids"])), None)
            if old:
                incident["id"] = old["id"]
            else:
                incident["id"] = f"INC-{self.next_incident:04d}" if self.initial_load else f"INC-{uuid4().hex}"
                self.next_incident += 1
            claimed.add(incident["id"])
            Incident.model_validate(incident)
        self.incidents = incidents
        self.apply_incident_ids()

    def apply_incident_ids(self):
        inc_by_event: dict[str, str] = {}
        for inc in self.incidents:
            for eid in inc["event_ids"]:
                inc_by_event[eid] = inc["id"]
        for e in self.events:
            e["incident_id"] = inc_by_event.get(e["id"])

    def get_incident(self, iid: str) -> dict | None:
        for i in self.incidents:
            if i["id"] == iid:
                return i
        return None

    def asset_status(self) -> dict[str, dict]:
        """Operational status per asset, derived from open incidents."""
        status = {aid: {"status": "healthy", "incident_ids": [], "event_count": 0} for aid in self.ctx.assets}
        for e in self.events:
            for a in e["assets"]:
                if a["asset_id"] in status:
                    status[a["asset_id"]]["event_count"] += 1
        for inc in self.incidents:
            for a in inc["affected_assets"]:
                st = status.get(a["asset_id"])
                if not st:
                    continue
                st["incident_ids"].append(inc["id"])
                severe = SEV_RANK[inc["severity"]] >= SEV_RANK["high"]
                if a["role"] == "suspected-compromised":
                    new = "compromised" if severe else "alerting"
                elif a["role"] == "targeted":
                    new = "targeted"
                else:
                    new = "alerting"
                order = ["healthy", "alerting", "targeted", "compromised"]
                if order.index(new) > order.index(st["status"]):
                    st["status"] = new
        return status


# --------------------------------------------------------------------------- correlation
def _entity_keys(ev: dict) -> set[str]:
    keys = {f"asset:{a['asset_id']}" for a in ev["assets"]}
    keys |= {f"ioc:{i['value']}" for i in ev["iocs"]}
    return keys


def correlate(events: list[dict], ctx: Context) -> list[dict]:
    evs = sorted(events, key=lambda e: e["ts"])
    seeds = [e for e in evs if SEV_RANK[e["severity"]] >= SEV_RANK["medium"]]

    parent = {e["id"]: e["id"] for e in seeds}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    keys = {e["id"]: _entity_keys(e) for e in seeds}
    for i, a in enumerate(seeds):
        for b in seeds[i + 1 :]:
            if b["ts"] - a["ts"] > CORRELATION_WINDOW:
                continue
            if keys[a["id"]] & keys[b["id"]]:
                union(a["id"], b["id"])

    groups: dict[str, list[dict]] = {}
    for e in seeds:
        groups.setdefault(find(e["id"]), []).append(e)

    incidents = []
    for members in groups.values():
        members.sort(key=lambda e: e["ts"])
        inc_assets = {a["asset_id"] for e in members for a in e["assets"]}
        start = members[0]["ts"] - CONTEXT_WINDOW
        end = members[-1]["ts"] + CONTEXT_WINDOW
        member_ids = {e["id"] for e in members}
        context = [
            e
            for e in evs
            if e["id"] not in member_ids and SEV_RANK[e["severity"]] < SEV_RANK["medium"] and start <= e["ts"] <= end and ({a["asset_id"] for a in e["assets"]} & inc_assets)
        ]
        incidents.append(_build_incident(members, context, ctx))

    incidents.sort(key=lambda i: i["first_seen"])
    for n, inc in enumerate(incidents, 1):
        inc["id"] = f"INC-{n:04d}"
    return incidents


def _tactic_sequence(events: list[dict]) -> list[dict]:
    seen, seq = set(), []
    for e in events:
        for m in e["mitre"]:
            t = m.get("tactic")
            if t and t not in seen:
                seen.add(t)
                seq.append({"tactic": t, "first_event": e["id"], "technique": m.get("technique"), "technique_id": m.get("id"), "ts": iso(e["ts"])})
    return seq


def _build_incident(members: list[dict], context: list[dict], ctx: Context) -> dict:
    all_events = sorted(members + context, key=lambda e: e["ts"])

    # primary asset: highest weighted involvement
    weight: dict[str, float] = {}
    for e in members:
        if e["primary_asset"]:
            weight[e["primary_asset"]] = weight.get(e["primary_asset"], 0) + e["severity_score"]
    primary = max(weight, key=weight.get) if weight else None

    asset_ids: list[str] = []
    for e in all_events:
        for a in e["assets"]:
            if a["asset_id"] not in asset_ids:
                asset_ids.append(a["asset_id"])

    targeted = set()
    for e in members:
        if e["source"] == "suricata" and e["primary_asset"] == primary:
            for a in e["assets"]:
                if a["role"] == "destination" and a["asset_id"] != primary:
                    targeted.add(a["asset_id"])
    affected = []
    for aid in asset_ids:
        role = "suspected-compromised" if aid == primary else ("targeted" if aid in targeted else "involved")
        affected.append(
            {
                "asset_id": aid,
                "role": role,
                "criticality": ctx.assets[aid]["criticality"],
                "event_count": sum(1 for e in all_events if any(a["asset_id"] == aid for a in e["assets"])),
            }
        )
    affected.sort(key=lambda a: ["suspected-compromised", "targeted", "involved"].index(a["role"]))

    iocs: dict[str, dict] = {}
    for e in all_events:
        for i in e["iocs"]:
            d = iocs.setdefault(i["value"], {"type": i["type"], "value": i["value"], "event_ids": [], "reasons": []})
            d["event_ids"].append(e["id"])
            if i["reason"] not in d["reasons"]:
                d["reasons"].append(i["reason"])

    tactics = _tactic_sequence(members)
    sources = {"wazuh": sum(1 for e in members if e["source"] == "wazuh"), "suricata": sum(1 for e in members if e["source"] == "suricata")}

    # explainable risk score
    factors = []
    base = max(e["severity_score"] for e in members)
    top = max(members, key=lambda e: e["severity_score"])
    factors.append({"label": f"Highest event score ({top['severity']}, {top['source']})", "points": base})
    score = base
    if sources["wazuh"] and sources["suricata"]:
        score += 8
        factors.append({"label": "Corroborated by both Wazuh (host) and Suricata (network)", "points": 8})
    crit = [a for a in affected if a["criticality"] == "critical"]
    if crit:
        score += 10
        factors.append({"label": f"Critical asset involved ({crit[0]['asset_id']})", "points": 10})
    extra = min(15, 5 * max(0, len(tactics) - 1))
    if extra:
        score += extra
        factors.append({"label": f"{len(tactics)} distinct ATT&CK tactics observed", "points": extra})
    score = min(100, score)
    severity = "critical" if score >= 90 else "high" if score >= 72 else "medium" if score >= 45 else "low"

    # title + narrative
    lateral = [a["asset_id"] for a in affected if a["role"] == "targeted"]
    if len(tactics) >= 3:
        title = f"Suspected compromise of {primary}"
        if lateral:
            title += f" with lateral activity toward {', '.join(lateral)}"
    else:
        title = f"Suspicious activity on {primary}: {top['title']}"
    first, last = members[0], members[-1]
    chain = " -> ".join(t["tactic"] for t in tactics)
    summary = (
        f"{len(members)} correlated alerts ({sources['wazuh']} Wazuh, {sources['suricata']} Suricata) between "
        f"{iso(first['ts'])} and {iso(last['ts'])} point to {primary}."
    )
    if chain:
        summary += f" Observed tactic sequence: {chain}."
    if lateral:
        summary += f" Network alerts show {primary} contacting {', '.join(lateral)}, which is outside its expected behavior."

    inc = {
        "id": "",
        "title": title,
        "status": "open",
        "severity": severity,
        "risk_score": score,
        "score_factors": factors,
        "first_seen": iso(first["ts"]),
        "last_seen": iso(last["ts"]),
        "primary_asset": primary,
        "affected_assets": affected,
        "iocs": list(iocs.values()),
        "event_ids": [e["id"] for e in all_events],
        "seed_event_ids": [e["id"] for e in members],
        "context_event_ids": [e["id"] for e in context],
        "sources": sources,
        "tactics": tactics,
        "summary": summary,
    }
    inc["relationships"] = _relationships(all_events, inc, ctx)
    inc["observed_flows"] = _observed_flows(all_events, primary, ctx)
    return inc


def _node_for_ip(ip: str | None, ctx: Context) -> str | None:
    if not ip:
        return None
    a = ctx.asset_for_ip(ip)
    if a:
        return a["id"]
    ext = ctx.external_by_ip.get(ip)
    if ext:
        return ext["id"]
    return f"ip:{ip}" if not ctx.is_internal(ip) else None


def _relationships(events: list[dict], inc: dict, ctx: Context) -> dict:
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}

    def node(nid: str):
        if nid in nodes:
            return
        if nid in ctx.assets:
            a = ctx.assets[nid]
            role = next((x["role"] for x in inc["affected_assets"] if x["asset_id"] == nid), "involved")
            nodes[nid] = {"id": nid, "kind": "asset", "label": nid, "type": a["type"], "criticality": a["criticality"], "ip": a["ips"][0], "role": role, "wazuh": 0, "suricata": 0}
        else:
            ip = nid.replace("ip:", "")
            ext = ctx.external_by_ip.get(ip)
            nodes[nid] = {"id": nid, "kind": "ioc", "label": ip, "type": "external", "criticality": None, "ip": ip, "role": "indicator", "wazuh": 0, "suricata": 0}

    for e in events:
        if e["source"] == "wazuh":
            if e["primary_asset"]:
                node(e["primary_asset"])
                nodes[e["primary_asset"]]["wazuh"] += 1
            for a in e["assets"]:
                if a["role"] == "cited-source" and e["primary_asset"]:
                    node(a["asset_id"])
                    key = f"cite:{a['asset_id']}>{e['primary_asset']}"
                    ed = edges.setdefault(key, {"id": key, "source": a["asset_id"], "target": e["primary_asset"], "kind": "cited", "label": "cited by Wazuh", "event_ids": [], "reasons": [], "signatures": []})
                    ed["event_ids"].append(e["id"])
                    if a["reason"] not in ed["reasons"]:
                        ed["reasons"].append(a["reason"])
                    if e["title"] not in ed["signatures"]:
                        ed["signatures"].append(e["title"])
            for i in e["iocs"]:
                nid = _node_for_ip(i["value"], ctx)
                if nid and e["primary_asset"]:
                    node(nid)
                    node(e["primary_asset"])
                    key = f"cite:{nid}>{e['primary_asset']}"
                    ed = edges.setdefault(key, {"id": key, "source": nid, "target": e["primary_asset"], "kind": "cited", "label": "cited by Wazuh", "event_ids": [], "reasons": [], "signatures": []})
                    ed["event_ids"].append(e["id"])
                    if i["reason"] not in ed["reasons"]:
                        ed["reasons"].append(i["reason"])
                    if e["title"] not in ed["signatures"]:
                        ed["signatures"].append(e["title"])
        else:
            s, d = _node_for_ip(e["src_ip"], ctx), _node_for_ip(e["dst_ip"], ctx)
            if not s or not d:
                continue
            node(s)
            node(d)
            nodes[s]["suricata"] += 1
            key = f"flow:{s}>{d}:{e['dst_port']}"
            ed = edges.setdefault(
                key,
                {
                    "id": key, "source": s, "target": d, "kind": "flow", "label": f":{e['dst_port']}", "port": e["dst_port"],
                    "event_ids": [], "reasons": [], "signatures": [],
                },
            )
            ed["event_ids"].append(e["id"])
            reason = f"Suricata flow {e['src_ip']} -> {e['dst_ip']}:{e['dst_port']} maps to {s} -> {d}"
            if reason not in ed["reasons"]:
                ed["reasons"].append(reason)
            if e["title"] not in ed["signatures"]:
                ed["signatures"].append(e["title"])

    for ed in edges.values():
        ed["count"] = len(ed["event_ids"])
    return {"nodes": list(nodes.values()), "edges": list(edges.values())}


def _observed_flows(events: list[dict], primary: str | None, ctx: Context) -> list[dict]:
    """Map Suricata alerts to modeled flows. outbound/lateral = originates at the suspected-compromised asset."""
    flows = ctx.topology["flows"]
    out: dict[str, dict] = {}
    for e in events:
        if e["source"] != "suricata":
            continue
        s, d = _node_for_ip(e["src_ip"], ctx), _node_for_ip(e["dst_ip"], ctx)
        for f in flows:
            if f["src"] == s and f["dst"] == d and f["port"] == e["dst_port"] and f["proto"].lower() == e["proto"]:
                direction = "inbound" if d == primary else ("outbound" if s == primary else "other")
                if direction == "outbound":
                    dnode = ctx.assets.get(d)
                    direction = "lateral" if dnode else "outbound"
                rec = out.setdefault(f["id"], {"flow_id": f["id"], "direction": direction, "event_ids": [], "first": iso(e["ts"]), "last": iso(e["ts"])})
                rec["event_ids"].append(e["id"])
                rec["last"] = iso(e["ts"])
    return list(out.values())
