import httpx, os, json
from dotenv import load_dotenv
load_dotenv()

VK_TOKEN = os.getenv("VK_BOT_TOKEN")
GROUP_ID = 239522452

print("=== Step 1: Get Long Poll Server ===")
r = httpx.get('https://api.vk.com/method/groups.getLongPollServer',
    params={'access_token': VK_TOKEN, 'v': '5.199', 'group_id': GROUP_ID})
data = r.json()
print(json.dumps(data, indent=2, ensure_ascii=False))

if 'response' not in data:
    print("ERROR: no response")
    exit(1)

server = data['response']
url = server['server']
key = server['key']
ts = server['ts']

print(f"\n=== Step 2: Poll with POST (wait=5s) ===")
print(f"URL: {url}")
print(f"Key: {key[:20]}...")
print(f"TS: {ts}")
print(">>> WRITE TO BOT NOW! <<<")

try:
    r2 = httpx.post(url, data={
        'act': 'a_check',
        'key': key,
        'ts': ts,
        'wait': 5
    }, timeout=10)
    print(f"\nStatus: {r2.status_code}")
    print(f"Body: {r2.text[:500]}")
except Exception as e:
    print(f"POST failed: {e}")
    
    print("\nTrying GET instead...")
    try:
        r3 = httpx.get(url, params={
            'act': 'a_check',
            'key': key,
            'ts': ts,
            'wait': 5
        }, timeout=10)
        print(f"GET Status: {r3.status_code}")
        print(f"GET Body: {r3.text[:500]}")
    except Exception as e2:
        print(f"GET also failed: {e2}")
