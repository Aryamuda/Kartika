"""Contract acceptance tests for the three Cyber Twin scenarios."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import Intervention
from app.store import Store
from app.twin import compare, presets, simulate


class TwinTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.incident = next(i for i in cls.store.incidents if i["id"] == "INC-0001")
        cls.topology = cls.store.topology
        cls.assets = cls.store.ctx.assets

    def test_contract_scenarios_and_dominance(self):
        original = copy.deepcopy(self.topology)
        result = compare(presets(self.incident), self.incident, self.topology, self.assets)
        a, b, c = result.results
        self.assertEqual([set(f["id"] for f in r.removed_flows) for r in (a, b, c)], [
            {"f01", "f02", "f03", "f08", "f09", "f10"}, {"f08", "f09"}, {"f03", "f08"}])
        self.assertEqual([r.security_impact["malicious_blocked"] for r in (a, b, c)], [2, 2, 1])
        self.assertEqual([next(s.after for s in r.service_availability if s.service_id == "svc-portal")
                          for r in (a, b, c)], ["down", "degraded", "down"])
        self.assertEqual(a.reachability["compromised_reach_after"], [])
        self.assertIn("SRV-DB", b.reachability["compromised_reach_after"])
        self.assertIn("EXT-C2", c.reachability["compromised_reach_after"])
        self.assertEqual(result.dominated[c.scenario_name], a.scenario_name)
        self.assertEqual(self.topology, original)
        self.assertEqual(result.model_dump(), compare(presets(self.incident), self.incident,
                                                     self.topology, self.assets).model_dump())

    def test_validation_and_direction(self):
        for intervention in (Intervention(type="block_flows", flow_ids=["missing"]),
                             Intervention(type="isolate_asset", asset_id="missing"),
                             Intervention(type="block_segment_access", source="SRV-APP", segment="missing")):
            with self.assertRaises(ValueError):
                simulate(intervention, self.incident, self.topology, self.assets)
        result = simulate(Intervention(type="block_flows", flow_ids=["f10"]), self.incident,
                          self.topology, self.assets)
        self.assertEqual(result.security_impact["malicious_total"], 2)
        self.assertEqual(result.security_impact["malicious_blocked"], 0)
        self.assertNotIn("WS-01", result.reachability["compromised_reach_before"])

    def test_response_types_match_frontend_contract(self):
        results = compare(presets(self.incident), self.incident, self.topology, self.assets).results
        for result in results:
            for field in ("pairs_before", "pairs_after"):
                with self.subTest(scenario=result.scenario_name, field=field):
                    self.assertIs(type(result.reachability[field]), int)
            with self.subTest(scenario=result.scenario_name, field="legit_flows_removed"):
                self.assertIs(type(result.collateral["legit_flows_removed"]), int)
            for phase in ("before", "after"):
                for row in result.reachability["matrix"][phase]:
                    self.assertTrue(all(type(value) is int and value in (0, 1) for value in row))
        self.assertEqual(results[0].isolation["remaining_flows"], 0)


if __name__ == "__main__":
    unittest.main()
