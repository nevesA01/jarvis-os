import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SecurityReviewContractTest(unittest.TestCase):
    def test_manifest_is_approved_s0_without_tools(self):
        manifest = (ROOT / "Manifest.yaml").read_text(encoding="utf-8")
        self.assertIn("Risk_level: S0", manifest)
        self.assertIn("Status: enabled", manifest)
        self.assertIn("Review_status: approved", manifest)
        self.assertIn("Required_tools: []", manifest)

    def test_input_is_closed_and_requires_artifact(self):
        schema = json.loads((ROOT / "Input.schema.json").read_text(encoding="utf-8"))
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["required"], ["artifact"])
        self.assertIn("permissions", schema["properties"])
        self.assertIn("oauth_scopes", schema["properties"])

    def test_output_is_conservative_and_closed(self):
        schema = json.loads((ROOT / "Output.schema.json").read_text(encoding="utf-8"))
        self.assertFalse(schema["additionalProperties"])
        required = set(schema["required"])
        self.assertEqual(required, {
            "approved_for_installation",
            "risk_level",
            "required_controls",
            "permissions_requested",
            "data_accessed",
            "risks",
            "mitigations",
            "missing_information",
            "approval_required",
        })
        self.assertEqual(schema["properties"]["approved_for_installation"]["const"], False)
        self.assertEqual(schema["properties"]["approval_required"]["const"], True)

    def test_no_installation_or_execution_policy(self):
        policy = (ROOT / "Policy.yaml").read_text(encoding="utf-8")
        self.assertIn("allow_installation: false", policy)
        self.assertIn("allow_enablement: false", policy)
        self.assertIn("execution: no_tool_calls", policy)

    def test_injection_fixture_is_untrusted_data(self):
        fixture = (ROOT / "Fixtures" / "prompt-injection.json").read_text(encoding="utf-8")
        self.assertIn("ignore", fixture.lower())
        self.assertIn("secrets", fixture.lower())

if __name__ == "__main__":
    unittest.main()
