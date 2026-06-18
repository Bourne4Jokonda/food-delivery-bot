import subprocess
import json
import sys
import os

BASE = "http://localhost:8080"
p = f = 0


def curl_get(path):
    r = subprocess.run(["curl.exe", "-s", f"{BASE}{path}"], capture_output=True, timeout=10)
    return r.stdout.decode("utf-8", errors="replace")


def curl_post_json(path, data):
    payload = json.dumps(data, ensure_ascii=False)
    r = subprocess.run(
        ["curl.exe", "-s", "-X", "POST", "-H", "Content-Type: application/json", "-d", payload, f"{BASE}{path}"],
        capture_output=True, timeout=10, encoding="utf-8"
    )
    return r.stdout


def curl_patch_json(path, data):
    payload = json.dumps(data, ensure_ascii=False)
    r = subprocess.run(
        ["curl.exe", "-s", "-X", "PATCH", "-H", "Content-Type: application/json", "-d", payload, f"{BASE}{path}"],
        capture_output=True, timeout=10, encoding="utf-8"
    )
    return r.stdout


def curl_delete(path):
    r = subprocess.run(["curl.exe", "-s", "-X", "DELETE", f"{BASE}{path}"], capture_output=True, timeout=10, encoding="utf-8")
    return r.stdout


def t(name, ok):
    global p, f
    if ok:
        p += 1
        print(f"  PASS  {name}")
    else:
        f += 1
        print(f"  FAIL  {name}")


print("=" * 50)
print("  FOOD DELIVERY BOT - TEST SUITE")
print("=" * 50)

print("\n--- API Tests ---")

try:
    data = json.loads(curl_get("/api/menu"))
    t("GET /api/menu", isinstance(data, list) and len(data) >= 10)
except Exception as e:
    t(f"GET /api/menu: {e}", False)

try:
    data = json.loads(curl_get("/api/orders"))
    t("GET /api/orders", isinstance(data, list))
except Exception as e:
    t(f"GET /api/orders: {e}", False)

try:
    data = json.loads(curl_get("/api/stats"))
    t("GET /api/stats", "orders" in data and "revenue" in data)
except Exception as e:
    t(f"GET /api/stats: {e}", False)

try:
    data = json.loads(curl_get("/api/stats/week"))
    t("GET /api/stats/week", "orders" in data and "revenue" in data)
except Exception as e:
    t(f"GET /api/stats/week: {e}", False)

try:
    out = curl_get("/")
    t("GET / (CRM HTML)", "<html" in out.lower() or "<!doctype" in out.lower())
except Exception as e:
    t(f"GET /: {e}", False)

try:
    data = json.loads(curl_get("/api/orders/999999"))
    t("GET /api/orders/999999 -> 404", "detail" in data)
except Exception as e:
    t(f"GET /api/orders/999999: {e}", False)

try:
    out = curl_post_json("/api/menu", {"name": "__TEST_ITEM__", "price": 42, "category": "Test"})
    parsed = json.loads(out)
    if isinstance(parsed, list):
        parsed = parsed[0]
    new_id = parsed["id"]
    out2 = curl_patch_json(f"/api/menu/{new_id}", {"name": "__TEST2__", "price": 43, "category": "Test"})
    parsed2 = json.loads(out2)
    if isinstance(parsed2, list):
        parsed2 = parsed2[0]
    out3 = curl_delete(f"/api/menu/{new_id}")
    t("Menu CRUD (create + patch + delete)", "id" in parsed and "updated" in parsed2.get("status", ""))
except Exception as e:
    t(f"Menu CRUD: {e}", False)

try:
    orders = json.loads(curl_get("/api/orders"))
    if orders:
        oid = orders[0]["id"]
        out = curl_patch_json(f"/api/orders/{oid}/status", {"status": "confirmed"})
        result = json.loads(out)
        t(f"PATCH /api/orders/{oid}/status -> confirmed", result.get("status") == "ok")
    else:
        t("PATCH order status (no orders)", True)
except Exception as e:
    t(f"PATCH order status: {e}", False)


print("\n--- Callback Tests ---")

try:
    from dotenv import load_dotenv
    load_dotenv()
    expected = os.getenv("CALLBACK_CONFIRMATION", "")
    out = curl_post_json("/callback", {"type": "confirmation"})
    t("Callback: confirmation code", out.strip() == expected)
except Exception as e:
    t(f"Callback confirmation: {e}", False)

try:
    out = curl_post_json("/callback", {"type": "other"})
    t("Callback: unknown type -> 'ok'", out.strip() == "ok")
except Exception as e:
    t(f"Callback unknown type: {e}", False)


print("\n" + "=" * 50)
print(f"  RESULTS: {p} passed, {f} failed")
print("=" * 50)
sys.exit(0 if f == 0 else 1)
