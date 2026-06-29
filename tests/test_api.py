import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_get_menu_empty(client: AsyncClient):
    r = await client.get("/api/menu", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    assert r.json() == []


async def test_menu_crud(client: AsyncClient):
    h = {"X-API-Key": "test_secret_key", "Content-Type": "application/json"}

    r = await client.post("/api/menu", headers=h, json={
        "name": "Тест Пицца", "description": "Описание", "price": 500, "category": "Пицца"
    })
    assert r.status_code == 200
    item_id = r.json()["id"]

    r = await client.get("/api/menu", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["name"] == "Тест Пицца"
    assert items[0]["price"] == 500

    r = await client.patch(f"/api/menu/{item_id}", headers=h, json={
        "name": "Обновлённая", "description": "Новое", "price": 600, "category": "Пицца"
    })
    assert r.status_code == 200
    assert r.json()["status"] == "updated"

    r = await client.get("/api/menu", headers={"X-API-Key": "test_secret_key"})
    assert r.json()[0]["name"] == "Обновлённая"
    assert r.json()[0]["price"] == 600

    r = await client.delete(f"/api/menu/{item_id}", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"

    r = await client.get("/api/menu", headers={"X-API-Key": "test_secret_key"})
    assert len(r.json()) == 0


async def test_menu_not_found(client: AsyncClient):
    r = await client.patch("/api/menu/999999", headers={"X-API-Key": "test_secret_key", "Content-Type": "application/json"}, json={
        "name": "X", "description": "", "price": 1, "category": "X"
    })
    assert r.status_code == 404

    r = await client.delete("/api/menu/999999", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 404


async def test_orders_empty(client: AsyncClient):
    r = await client.get("/api/orders", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    assert r.json() == []


async def test_order_not_found(client: AsyncClient):
    r = await client.get("/api/orders/999999", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 404


async def test_stats(client: AsyncClient):
    h = {"X-API-Key": "test_secret_key"}
    r = await client.get("/api/stats", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert "orders" in data
    assert "revenue" in data

    r = await client.get("/api/stats/week", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert "orders" in data
    assert "revenue" in data


async def test_auth_required(client: AsyncClient):
    r = await client.get("/api/menu")
    assert r.status_code == 401

    r = await client.get("/api/orders")
    assert r.status_code == 401

    r = await client.get("/api/stats")
    assert r.status_code == 401


async def test_auth_verify(client: AsyncClient):
    r = await client.post("/api/auth/verify", json={"key": "test_secret_key"})
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    r = await client.post("/api/auth/verify", json={"key": "wrong_key"})
    assert r.status_code == 401


async def test_auth_no_key_configured(client: AsyncClient, monkeypatch):
    import api as api_module
    old_key = api_module.CRM_API_KEY
    api_module.CRM_API_KEY = ""
    r = await client.get("/api/menu")
    assert r.status_code == 200
    api_module.CRM_API_KEY = old_key


async def test_crm_index(client: AsyncClient):
    r = await client.get("/")
    assert r.status_code == 200
    assert "html" in r.headers.get("content-type", "").lower()


async def test_staff_crud(client: AsyncClient):
    h = {"X-API-Key": "test_secret_key", "Content-Type": "application/json"}

    r = await client.get("/api/staff", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    assert r.json() == []

    r = await client.post("/api/staff", headers=h, json={
        "vk_id": 12345, "role": "kitchen", "name": "Тестовый повар"
    })
    assert r.status_code == 200
    user_id = r.json()["vk_id"]

    r = await client.get("/api/staff", headers={"X-API-Key": "test_secret_key"})
    staff = r.json()
    assert len(staff) == 1
    assert staff[0]["vk_id"] == 12345
    assert staff[0]["role"] == "kitchen"

    r = await client.delete(f"/api/staff/{staff[0]['id']}", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200

    r = await client.get("/api/staff", headers={"X-API-Key": "test_secret_key"})
    assert len(r.json()) == 0


async def test_staff_invalid_role(client: AsyncClient):
    r = await client.post("/api/staff", headers={"X-API-Key": "test_secret_key", "Content-Type": "application/json"}, json={
        "vk_id": 99, "role": "invalid", "name": ""
    })
    assert r.status_code == 400


async def test_bot_status(client: AsyncClient):
    r = await client.get("/api/bot/status", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    data = r.json()
    assert "running" in data
    assert "pid" in data


async def test_bot_logs(client: AsyncClient):
    r = await client.get("/api/bot/logs", headers={"X-API-Key": "test_secret_key"})
    assert r.status_code == 200
    assert "lines" in r.json()
