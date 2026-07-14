import os
import urllib.request
import json

# Read .env to get URL and KEY
env_path = r'\\192.168.1.18\Vicente\proyects\socialproofreel\.env'
url = ""
key = ""
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            url = line.split('=')[1].strip()
        elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
            key = line.split('=')[1].strip()

# Fetch latest by created_at (what the UI currently does)
req_created = urllib.request.Request(
    f"{url}/rest/v1/video_queue?status=eq.completed&order=created_at.desc&limit=1",
    headers={"apikey": key, "Authorization": f"Bearer {key}"}
)
with urllib.request.urlopen(req_created) as response:
    data_created = json.loads(response.read().decode())

print("==== LATEST BY CREATED_AT (CURRENT UI) ====")
print(json.dumps(data_created[0] if data_created else {}, indent=2))

# Fetch latest by updated_at (what should probably be used)
req_updated = urllib.request.Request(
    f"{url}/rest/v1/video_queue?status=eq.completed&order=updated_at.desc&limit=1",
    headers={"apikey": key, "Authorization": f"Bearer {key}"}
)
with urllib.request.urlopen(req_updated) as response:
    data_updated = json.loads(response.read().decode())

print("\n==== LATEST BY UPDATED_AT (PROPOSED) ====")
print(json.dumps(data_updated[0] if data_updated else {}, indent=2))

# Fetch last worker log to see actual last processed
req_logs = urllib.request.Request(
    f"{url}/rest/v1/worker_logs?order=created_at.desc&limit=3",
    headers={"apikey": key, "Authorization": f"Bearer {key}"}
)
with urllib.request.urlopen(req_logs) as response:
    data_logs = json.loads(response.read().decode())

print("\n==== LATEST WORKER LOGS ====")
for log in data_logs:
    print(f"[{log.get('created_at')}] {log.get('level')}: {log.get('message')}")
