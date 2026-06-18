import httpx, os, json
from dotenv import load_dotenv
load_dotenv()

VK_TOKEN = os.getenv("VK_BOT_TOKEN")

r = httpx.get('https://api.vk.com/method/groups.getLongPollServer', params={'access_token': VK_TOKEN, 'v': '5.199', 'group_id': 239522452})
data = r.json()['response']
server = data['server']
key = data['key']
ts = data['ts']
print(f'Server: {server}')
print(f'TS: {ts}')
print()
print('>>> Write to bot NOW! Waiting 15 seconds...')

r2 = httpx.get(server, params={'act': 'a_check', 'key': key, 'ts': ts, 'wait': 15})
result = r2.json()
updates = result.get('updates', [])
print(f'Updates count: {len(updates)}')
for u in updates:
    t = u.get("type", "?")
    print(f'  Type: {t}')
    if t == "message_new":
        msg = u.get("object", {}).get("message", {})
        print(f'  From: {msg.get("from_id")}')
        print(f'  Text: {msg.get("text")}')
if not updates:
    print('  (empty)')
