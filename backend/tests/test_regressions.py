"""Regression coverage for adversarial ingestion, identities and policy modeling."""
import copy
import sys
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.store import Store
from app.models import Intervention, Event
from app.twin import simulate, compare, presets


class RegressionTests(unittest.TestCase):
    def setUp(self):
        self.logging = patch.object(Store, '_append_log')
        self.log = self.logging.start()
        self.addCleanup(self.logging.stop)
        self.store = Store()
        self.when = min(e['ts'] for e in self.store.events)

    def record(self, host='ws-01', ip='10.10.10.101', level=10, source=None):
        return {'timestamp': self.when.isoformat(), 'agent': {'name': host, 'ip': ip},
                'rule': {'level': level, 'description': 'Regression alert', 'groups': ['test']},
                'data': {'srcip': source} if source else {}}

    def test_invalid_batches_leave_no_events_incidents_or_logs(self):
        bad = self.record()
        bad['rule']['description'] = ['bad type']
        for records in ([bad], [self.record(), {}], [self.record(), {'rule': []}]):
            before = copy.deepcopy((self.store.events, self.store.incidents))
            self.log.reset_mock()
            with self.assertRaises(ValueError):
                self.store.ingest('wazuh', records)
            self.assertEqual(before, (self.store.events, self.store.incidents))
            self.log.assert_not_called()
            for event in self.store.events:
                Event.model_validate(self.store.public_event(event))

    def test_late_incident_does_not_reassign_existing_identity(self):
        before = copy.deepcopy(self.store.incidents[0])
        raw = self.record()
        raw['timestamp'] = (self.when - timedelta(days=1)).isoformat()
        self.store.ingest('wazuh', [raw])
        after = self.store.get_incident(before['id'])
        self.assertEqual(after['primary_asset'], before['primary_asset'])
        self.assertEqual(after['seed_event_ids'], before['seed_event_ids'])

    def test_reset_does_not_reuse_event_or_incident_identity(self):
        old_events = {e['id'] for e in self.store.events}
        old_incidents = {i['id'] for i in self.store.incidents}
        self.store.reset_for_replay()
        ids = self.store.ingest('wazuh', [self.record()])
        self.assertFalse(old_events & set(ids))
        self.assertFalse(old_incidents & {i['id'] for i in self.store.incidents})
        self.assertIsNone(self.store.get_event('EVT-0001'))

    def test_context_requires_shared_asset(self):
        self.store.reset_for_replay()
        ids = self.store.ingest('wazuh', [self.record(source='203.0.113.45'),
            self.record('ws-02', '10.10.10.102', 4, '203.0.113.45')])
        self.assertNotIn(ids[1], self.store.incidents[0]['event_ids'])

    def test_udp_does_not_match_tcp_flow(self):
        self.store.reset_for_replay()
        self.store.ingest('suricata', [{'timestamp': self.when.isoformat(), 'event_type': 'alert',
            'src_ip': '10.10.10.20', 'dest_ip': '10.20.20.11', 'dest_port': 502,
            'proto': 'UDP', 'alert': {'severity': 1, 'signature': 'UDP'}}])
        self.assertEqual(self.store.incidents[0]['observed_flows'], [])

    def test_parallel_flow_remains_reachable_and_isolation_does_not_crash(self):
        topology = copy.deepcopy(self.store.topology)
        topology['flows'].append({**next(f for f in topology['flows'] if f['id'] == 'f09'),
                                 'id': 'f11', 'port': 8443})
        incident = self.store.incidents[0]
        result = simulate(Intervention(type='block_flows', flow_ids=['f09']), incident, topology, self.store.ctx.assets)
        self.assertIn('EXT-C2', result.reachability['compromised_reach_after'])
        result = simulate(Intervention(type='isolate_asset', asset_id='SRV-APP'), incident, topology, self.store.ctx.assets)
        self.assertEqual(result.reachability['compromised_reach_after'], [])

    def test_duplicate_effective_names_are_rejected(self):
        incident = self.store.incidents[0]
        choices = presets(incident)
        choices[0].name = choices[2].name = 'duplicate'
        with self.assertRaisesRegex(ValueError, 'unique'):
            compare(choices, incident, self.store.topology, self.store.ctx.assets)
