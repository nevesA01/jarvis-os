import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SkillContractTest(unittest.TestCase):
    def test_manifest_fields(self):
        text = (ROOT / 'Manifest.yaml').read_text(encoding='utf-8')
        fields = ['Id:', 'Name:', 'Version:', 'Description:', 'Category:', 'Risk_level:', 'Status:', 'Owner:', 'Allowed_agents:', 'Allowed_roles:', 'Required_tools:', 'Optional_tools:', 'External_integrations:', 'Network_access:', 'Filesystem_access:', 'Data_classification:', 'Requires_user_confirmation:', 'Requires_transitional_approval:', 'Requires_reauthentication:', 'Supports_dry_run:', 'Supports_rollback:', 'Max_runtime_seconds:', 'Max_input_size:', 'Max_output_size:', 'Rate_limit:', 'Quality_checks:', 'Security_checks:', 'Created_at:', 'Updated_at:', 'License:', 'Source:', 'Review_status:']
        for field in fields:
            self.assertIn(field, text)

    def test_schemas_are_closed_and_bounded(self):
        for name in ['Input.schema.json', 'Output.schema.json']:
            schema = json.loads((ROOT / name).read_text(encoding='utf-8'))
            self.assertFalse(schema.get('additionalProperties', True))
        input_schema = json.loads((ROOT / 'Input.schema.json').read_text(encoding='utf-8'))
        self.assertIn('request', input_schema.get('required', []))
        self.assertEqual(input_schema['properties']['request']['maxLength'], 12000)

    def test_examples_and_fixtures_exist(self):
        self.assertTrue((ROOT / 'Examples.md').read_text(encoding='utf-8').strip())
        fixtures = list((ROOT / 'Fixtures').glob('*.json'))
        self.assertGreaterEqual(len(fixtures), 6)
        for fixture in fixtures:
            json.loads(fixture.read_text(encoding='utf-8'))

    def test_invalid_ambiguous_and_oversized_inputs_are_covered(self):
        text = (ROOT / 'Examples.md').read_text(encoding='utf-8').lower()
        self.assertIn('ambig', text)
        self.assertIn('malicios', text)
        self.assertIn('prompt injection', text)
        oversized = json.loads((ROOT / 'Fixtures' / 'large.json').read_text(encoding='utf-8'))
        self.assertGreater(len(oversized['request']), 12000)

    def test_permission_risk_and_no_unauthorized_tools(self):
        manifest = (ROOT / 'Manifest.yaml').read_text(encoding='utf-8')
        policy = (ROOT / 'Policy.yaml').read_text(encoding='utf-8')
        self.assertIn('Risk_level:', manifest)
        self.assertIn('Allowed_roles:', manifest)
        self.assertIn('allowed_tools: []', policy)
        self.assertIn('can_write_state: false', policy)
        self.assertIn('network_access: false', policy)
        self.assertIn('execution: no_tool_calls', policy)
        self.assertNotIn('Command: string', policy)
        self.assertNotIn('Shell: string', policy)
        self.assertNotIn('Sql: string', policy)

    def test_prompt_injection_is_data(self):
        fixture = (ROOT / 'Fixtures' / 'prompt-injection.json').read_text(encoding='utf-8')
        self.assertIn('ignore', fixture.lower())
        self.assertIn('secrets', fixture.lower())

if __name__ == '__main__':
    unittest.main()
