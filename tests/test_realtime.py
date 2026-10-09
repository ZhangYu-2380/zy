"""Local HTTP integration checks, no production database required."""
import copy
import http.client
import json
import threading
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import monitor_demo_v4 as app


class RealtimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, method="GET", body=None, cookie=None):
        conn = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        headers = {"Content-Type": "application/json"}
        if cookie:
            headers["Cookie"] = cookie
        conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        response = conn.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        conn.close()
        return result

    def test_http_login_and_snapshot(self):
        self.assertEqual(self.request("/api/snapshot")[0], 401)
        self.assertEqual(self.request("/api/login", "POST", {"password": "wrong"})[0], 401)
        status, headers, _ = self.request("/api/login", "POST", {"password": app.PASSWORD})
        self.assertEqual(status, 200)
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        status, _, body = self.request("/api/snapshot", cookie=headers["Set-Cookie"].split(";")[0])
        self.assertEqual(status, 200)
        snapshot = json.loads(body)
        self.assertEqual(snapshot["dashboard"]["total"], 1000)
        self.assertEqual(snapshot["dashboard"]["error"] + snapshot["dashboard"]["timeout"], snapshot["alerts"]["total"])

    def test_event_replacement_and_stable_time(self):
        original = copy.deepcopy(app.STATE)
        try:
            before = app.snapshot()
            self.assertEqual(before["alerts"], app.snapshot()["alerts"])
            app.simulate_tick()
            after = app.snapshot()
            self.assertEqual(before["alerts"]["total"], after["alerts"]["total"])
            old_ids = {a["id"] for a in before["alerts"]["items"]}
            new_ids = {a["id"] for a in after["alerts"]["items"]}
            self.assertTrue(new_ids - old_ids)
            old_alerts = {a["id"]: a for a in before["alerts"]["items"]}
            for alert in after["alerts"]["items"]:
                if alert["id"] in old_alerts:
                    self.assertEqual(alert, old_alerts[alert["id"]])
            new_flows = {a["flowId"] for a in after["alerts"]["items"]}
            problems = {f["id"] for g in after["dashboard"]["groups"] for f in g["problems"]}
            self.assertEqual(new_flows, problems)
        finally:
            app.STATE[:] = original

    def test_session_validation(self):
        self.assertFalse(app.valid_token(app.sign("authenticated:1")))
        self.assertFalse(app.valid_token("authenticated:9999999999.invalid"))
        self.assertFalse(app.valid_token("malformed"))


if __name__ == "__main__":
    unittest.main()
