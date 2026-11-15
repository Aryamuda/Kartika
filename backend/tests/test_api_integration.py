"""HTTP acceptance checks against an isolated real API process, without mock responses."""
from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class ApiIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        cls.base = f"http://127.0.0.1:{port}"
        cls.process = subprocess.Popen(
            [sys.executable, "-B", "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=Path(__file__).resolve().parents[2], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        cls.addClassCleanup(cls.stop_server)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            try:
                with urlopen(cls.base + "/api/overview", timeout=1) as response:
                    if response.status == 200:
                        return
            except (URLError, TimeoutError):
                if cls.process.poll() is not None:
                    raise RuntimeError("API pengujian berhenti sebelum siap")
                time.sleep(0.1)
        raise RuntimeError("API pengujian belum siap setelah 10 detik")

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        try:
            cls.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.process.kill()
            cls.process.wait(timeout=5)

    def request(self, path, payload=None):
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        request = Request(self.base + path, data=body, headers={"Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            with error:
                return error.code, json.loads(error.read())

    def comparison_payload(self):
        status, presets = self.request("/api/twin/presets?incident_id=INC-0001")
        self.assertEqual(status, 200)
        self.assertEqual(len(presets), 3)
        return {"incident_id": "INC-0001", "interventions": presets}

    def test_actual_comparison_preserves_three_tradeoffs(self):
        status, comparison = self.request("/api/twin/compare", self.comparison_payload())
        self.assertEqual(status, 200)
        a, b, c = comparison["results"]
        self.assertEqual([result["security_impact"]["malicious_blocked"] for result in (a, b, c)], [2, 2, 1])
        self.assertEqual([result["reachability"]["compromised_reach_after"] for result in (a, b, c)], [[], ["SRV-DB"], ["EXT-C2"]])
        self.assertEqual([next(service["after"] for service in result["service_availability"] if service["service_id"] == "svc-portal") for result in (a, b, c)], ["down", "degraded", "down"])
        self.assertEqual(comparison["dominated"][c["scenario_name"]], a["scenario_name"])
        for result in (a, b, c):
            self.assertIs(type(result["reachability"]["pairs_before"]), int)
            self.assertIs(type(result["collateral"]["legit_flows_removed"]), int)

    def test_single_results_match_comparison(self):
        payload = self.comparison_payload()
        _, comparison = self.request("/api/twin/compare", payload)
        for intervention, expected in zip(payload["interventions"], comparison["results"]):
            status, actual = self.request("/api/twin/simulate", {"incident_id": "INC-0001", "intervention": intervention})
            self.assertEqual(status, 200)
            self.assertEqual(actual, expected)

    def test_unknown_incident_and_invalid_interventions(self):
        self.assertEqual(self.request("/api/twin/presets?incident_id=MISSING")[0], 404)
        self.assertEqual(self.request("/api/twin/simulate", {"incident_id": "MISSING", "intervention": {"type": "block_flows", "flow_ids": ["f08"]}})[0], 404)
        for intervention in [
            {"type": "isolate_asset", "asset_id": "MISSING"},
            {"type": "block_flows", "flow_ids": ["MISSING"]},
            {"type": "block_segment_access", "source": "SRV-APP", "segment": "MISSING"},
        ]:
            status, error = self.request("/api/twin/simulate", {"incident_id": "INC-0001", "intervention": intervention})
            self.assertEqual(status, 422)
            self.assertIn("detail", error)
        for path in ("/api/twin/compare", "/api/reports"):
            self.assertEqual(self.request(path, {"incident_id": "INC-0001", "interventions": []})[0], 422)

    def test_minimal_report_contains_real_evidence_and_comparison(self):
        status, report = self.request("/api/reports", self.comparison_payload())
        self.assertEqual(status, 200)
        self.assertEqual(report["filename"], "INC-0001.md")
        for section in ("Ringkasan insiden", "Linimasa bukti", "Perbandingan skenario", "Batasan model"):
            self.assertIn(section, report["markdown"])
            self.assertIn(section, report["html"])
        self.assertIn("EVT-0005", report["markdown"])
        _, event = self.request("/api/events/EVT-0005")
        self.assertIn(event["provenance"]["raw_sha256"], report["markdown"])
        self.assertIn(event["provenance"]["raw_sha256"], report["html"])
        self.assertIn("Didominasi", report["markdown"])
        self.assertIn("tingkat paket", report["markdown"])
        self.assertIn('<html lang="id">', report["html"])
        self.assertIn("Content-Security-Policy", report["html"])

    def test_ingestion_and_replay_restore_fixture_state(self):
        data = Path(__file__).resolve().parents[1] / "app" / "data"
        records = [
            ("wazuh", json.loads((data / "wazuh_alerts.json").read_text())[0]),
            ("suricata", json.loads((data / "suricata_eve.json").read_text())[0]),
        ]
        try:
            for source, record in records:
                payload = record if source == "wazuh" else [record]
                status, result = self.request(f"/api/ingest/{source}", payload)
                self.assertEqual(status, 201)
                self.assertEqual(len(result["event_ids"]), 1)
                detail_status, event = self.request(f"/api/events/{result['event_ids'][0]}")
                self.assertEqual(detail_status, 200)
                self.assertEqual(event["source"], source)
                self.assertEqual(event["provenance"]["origin"], "api")
                self.assertEqual(event["raw"], record)
            status, reset = self.request("/api/ingest/reset", {})
            self.assertEqual(status, 200)
            self.assertEqual(reset["ingested"], 0)
            status, step = self.request("/api/ingest/step?n=1", {})
            self.assertEqual(status, 200)
            self.assertEqual(step["ingested"], 1)
            self.assertEqual(step["remaining"], step["total"] - 1)
        finally:
            _, reset = self.request("/api/ingest/reset", {})
            _, restored = self.request(f"/api/ingest/step?n={reset['total']}", {})
            self.assertEqual(restored["remaining"], 0)
            self.assertEqual(restored["ingested"], restored["total"])

    def test_html_report_escapes_untrusted_scenario_names(self):
        payload = self.comparison_payload()
        payload["interventions"][0]["name"] = '<script>alert("x")</script> ![remote](https://example.invalid/pixel)'
        status, report = self.request("/api/reports", payload)
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", report["html"])
        self.assertIn("&lt;script&gt;", report["html"])
        self.assertNotIn("![remote](", report["markdown"])


if __name__ == "__main__":
    unittest.main()
