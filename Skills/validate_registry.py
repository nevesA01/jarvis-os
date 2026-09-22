import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
FIELDS = ['Id','Name','Version','Description','Category','Risk_level','Status','Owner','Allowed_agents','Allowed_roles','Required_tools','Optional_tools','External_integrations','Network_access','Filesystem_access','Data_classification','Requires_user_confirmation','Requires_transitional_approval','Requires_reauthentication','Supports_dry_run','Supports_rollback','Max_runtime_seconds','Max_input_size','Max_output_size','Rate_limit','Quality_checks','Security_checks','Created_at','Updated_at','License','Source','Review_status']

def validate(path):
    errors = []
    manifest = (path / 'Manifest.yaml').read_text(encoding='utf-8')
    for field in FIELDS:
        if field + ':' not in manifest: errors.append(str(path) + ': missing ' + field)
    status = re.search(r'^Status:\s*(\w+)', manifest, re.MULTILINE)
    review = re.search(r'^Review_status:\s*(\w+)', manifest, re.MULTILINE)
    if status and status.group(1) == 'enabled' and (not review or review.group(1) != 'approved'): errors.append(str(path) + ': enabled without approved review')
    for name in ['Input.schema.json','Output.schema.json']:
        schema = json.loads((path / name).read_text(encoding='utf-8'))
        if schema.get('additionalProperties', True): errors.append(str(path) + ': open schema ' + name)
    policy = (path / 'Policy.yaml').read_text(encoding='utf-8')
    if 'execution: no_tool_calls' not in policy: errors.append(str(path) + ': execution policy missing')
    for forbidden in ['Command: string','Shell: string','Sql: string']:
        if forbidden in policy: errors.append(str(path) + ': open tool schema')
    return errors

def main():
    errors = []
    for manifest in ROOT.glob('*/**/Manifest.yaml'): errors.extend(validate(manifest.parent))
    if errors: raise SystemExit('\n'.join(errors))
    print('Skill registry válido')

if __name__ == '__main__': main()
