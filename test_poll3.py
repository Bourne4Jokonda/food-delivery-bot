import httpx, os, json
from dotenv import load_dotenv
load_dotenv()

VK_TOKEN = os.getenv("VK_BOT_TOKEN")
GROUP_ID = 239522452

r = httpx.get('https://api.vk.com/method/groups.getLongPollServer',
    params={'access_token': VK_TOKEN, 'v': '5.199', 'group_id': GROUP_ID})
data = r.json()['response']
url = data['server']
key = data['key']
ts = data['ts']

print(f'TS: {ts}')
print('>>> WRITE TO BOT NOW! Waiting 25 seconds...')

r2 = httpx.post(url, data={'act': 'a_check', 'key': key, 'ts': ts, 'wait': 25}, timeout=35)
result = r2.json()
updates = result.get('updates', [])
new_ts = result.get('ts', '?')
print(f'New TS: {new_ts}')
print(f'Updates: {len(updates)}')
for u in updates:
    print(f'  {json.dumps(u, ensure_ascii=False)[:300]}')
if not updates:
    print('  (empty - no events received)')
