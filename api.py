from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
import os, httpx, time, hmac
from database.db import engine, async_session, init_db
from database.models import Base, Order, OrderItem, MenuItem, OrderStatus, User, UserRole, DeliveryZone, Category, StaffApiKey


CRM_API_KEY = os.getenv("CRM_API_KEY", "")
VK_BOT_TOKEN = os.getenv("VK_BOT_TOKEN")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID", "0")) or None
KITCHEN_CHAT_ID = int(os.getenv("KITCHEN_CHAT_ID", "0")) or None
COURIER_CHAT_ID = int(os.getenv("COURIER_CHAT_ID", "0")) or None
CRM_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CRM_ALLOWED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",") if o.strip()]

# Rate limiting for auth endpoint
auth_attempts = {}
AUTH_RATE_LIMIT_MAX = 10
AUTH_RATE_LIMIT_WINDOW = 60  # seconds


def check_auth_rate_limit(ip: str) -> bool:
    now = time.time()
    if ip not in auth_attempts:
        auth_attempts[ip] = []
    auth_attempts[ip] = [ts for ts in auth_attempts[ip] if now - ts < AUTH_RATE_LIMIT_WINDOW]
    if len(auth_attempts[ip]) >= AUTH_RATE_LIMIT_MAX:
        return False
    auth_attempts[ip].append(now)
    return True


async def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key", "")

    # If no CRM_API_KEY configured, allow access (backward compatibility)
    if not CRM_API_KEY:
        return

    # Check main CRM key first
    if key and hmac.compare_digest(key, CRM_API_KEY):
        return

    # Check staff API keys from database
    if key:
        import hashlib
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        async with async_session() as session:
            result = await session.execute(
                select(StaffApiKey).where(StaffApiKey.key_hash == key_hash, StaffApiKey.revoked == 0)
            )
            staff_key = result.scalar_one_or_none()
            if staff_key:
                return

    raise HTTPException(status_code=401, detail="Invalid or missing API key")


auth_dep = Depends(verify_api_key)


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CRM_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StatusUpdate(BaseModel):
    status: str


class MenuItemCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    category: str


class StaffUpdate(BaseModel):
    vk_id: int
    role: str
    name: str = ""


class DeliveryZoneCreate(BaseModel):
    name: str
    cost: float
    free_from: float | None = None
    enabled: bool = True
    sort_order: int = 0
    keywords: str = ""


class CategoryCreate(BaseModel):
    name: str
    icon: str = "fa-utensils"
    sort_order: int = 0


class AuthCheck(BaseModel):
    key: str


@app.post("/api/auth/verify")
async def verify_auth(request: Request, body: AuthCheck):
    if not CRM_API_KEY:
        return {"status": "no_key_configured"}
    client_ip = request.client.host if request.client else "unknown"
    if not check_auth_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    if hmac.compare_digest(body.key, CRM_API_KEY):
        return {"status": "ok"}
    raise HTTPException(status_code=401, detail="Invalid API key")


STATUS_LABELS = {
    "new": "📋 Новый", "confirmed": "✅ Подтвержден", "preparing": "👨‍🍳 Готовится",
    "ready": "🔔 Готов", "delivering": "🚗 В доставке", "delivered": "🎉 Доставлен", "cancelled": "❌ Отменён"
}
KEY_STATUSES = {"ready", "delivering", "delivered", "cancelled"}


async def notify_client(order_id: int, new_status: str):
    try:
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if not order:
                return
            if order.notify_level == "key_only" and new_status not in KEY_STATUSES:
                return
            user_result = await session.execute(select(User).where(User.id == order.client_id))
            user = user_result.scalar_one_or_none()
            if not user:
                return
            vk_id = user.vk_id
            msg = f"📦 Заказ #{order.id}: {STATUS_LABELS.get(new_status, new_status)}"
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get("https://api.vk.com/method/messages.send", params={
                    "access_token": VK_BOT_TOKEN, "user_id": vk_id, "message": msg, "random_id": 0, "v": "5.199"
                })
    except Exception:
        pass


async def send_to_chat(chat_id: int, message: str):
    if not chat_id or not VK_BOT_TOKEN:
        return
    try:
        real_chat_id = chat_id - 2000000000 if chat_id > 2000000000 else chat_id
        async with httpx.AsyncClient(timeout=10) as client:
            await client.get("https://api.vk.com/method/messages.send", params={
                "access_token": VK_BOT_TOKEN, "chat_id": real_chat_id, "message": message, "random_id": 0, "v": "5.199"
            })
    except Exception:
        pass


async def get_order_items_text(order_id: int) -> str:
    try:
        async with async_session() as session:
            result = await session.execute(
                select(OrderItem, MenuItem).join(MenuItem, OrderItem.menu_item_id == MenuItem.id).where(OrderItem.order_id == order_id)
            )
            rows = result.all()
            return "\n".join(f"  • {row[1].name} x{row[0].quantity} — {row[1].price * row[0].quantity}₽" for row in rows)
    except Exception:
        return ""


async def notify_staff_crm(order_id: int, new_status: str):
    try:
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if not order:
                return
            items_text = await get_order_items_text(order_id)
            if new_status == "confirmed":
                msg = f"👨‍🍳 Заказ #{order_id} подтвержден!\n\n{items_text}"
                await send_to_chat(KITCHEN_CHAT_ID, msg)
            elif new_status == "ready":
                if order.delivery_type == "delivery":
                    address = order.address or "Не указан"
                    msg = f"🚗 Заказ #{order_id} готов к доставке!\nАдрес: {address}\n\n{items_text}"
                    await send_to_chat(COURIER_CHAT_ID, msg)
            elif new_status == "preparing":
                msg = f"👨‍🍳 Заказ #{order_id} взят в работу"
                await send_to_chat(KITCHEN_CHAT_ID, msg)
    except Exception:
        pass


@app.get("/")
async def serve_crm():
    html_path = Path(__file__).parent / "crm" / "index.html"
    return FileResponse(str(html_path), media_type="text/html")


@app.get("/api/orders", dependencies=[auth_dep])
async def get_orders():
    async with async_session() as session:
        result = await session.execute(
            select(Order).order_by(Order.created_at.desc()).limit(50)
        )
        orders = result.scalars().all()
        return [
            {
                "id": o.id,
                "client_id": o.client_id,
                "status": o.status.value,
                "total_price": o.total_price,
                "delivery_cost": o.delivery_cost or 0,
                "delivery_estimated_minutes": o.delivery_estimated_minutes,
                "delivery_type": o.delivery_type,
                "payment_method": o.payment_method,
                "address": o.address,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in orders
        ]


@app.get("/api/orders/{order_id}", dependencies=[auth_dep])
async def get_order(order_id: int):
    async with async_session() as session:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        items_result = await session.execute(
            select(OrderItem, MenuItem).join(MenuItem, OrderItem.menu_item_id == MenuItem.id).where(OrderItem.order_id == order_id)
        )
        rows = items_result.all()
        
        return {
            "id": order.id,
            "status": order.status.value,
            "total_price": order.total_price,
            "delivery_cost": order.delivery_cost or 0,
            "delivery_estimated_minutes": order.delivery_estimated_minutes,
            "delivery_type": order.delivery_type,
            "payment_method": order.payment_method,
            "address": order.address,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": [
                {"name": row[1].name, "quantity": row[0].quantity, "price": row[0].price}
                for row in rows
            ]
        }


@app.patch("/api/orders/{order_id}/status", dependencies=[auth_dep])
async def update_order_status(order_id: int, update: StatusUpdate):
    async with async_session() as session:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        try:
            order.status = OrderStatus(update.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        await session.commit()
        await notify_client(order_id, update.status)
        await notify_staff_crm(order_id, update.status)
        return {"status": "ok"}


@app.get("/api/menu", dependencies=[auth_dep])
async def get_menu():
    async with async_session() as session:
        result = await session.execute(select(MenuItem).where(MenuItem.available == 1))
        items = result.scalars().all()
        return [
            {
                "id": i.id,
                "name": i.name,
                "description": i.description,
                "price": i.price,
                "category": i.category
            }
            for i in items
        ]


@app.post("/api/menu", dependencies=[auth_dep])
async def create_menu_item(item: MenuItemCreate):
    async with async_session() as session:
        new_item = MenuItem(
            name=item.name,
            description=item.description,
            price=item.price,
            category=item.category
        )
        session.add(new_item)
        await session.commit()
        return {"id": new_item.id, "status": "created"}


@app.patch("/api/menu/{item_id}", dependencies=[auth_dep])
async def update_menu_item(item_id: int, item: MenuItemCreate):
    async with async_session() as session:
        result = await session.execute(select(MenuItem).where(MenuItem.id == item_id))
        menu_item = result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        menu_item.name = item.name
        menu_item.description = item.description
        menu_item.price = item.price
        menu_item.category = item.category
        await session.commit()
        return {"status": "updated"}


@app.delete("/api/menu/{item_id}", dependencies=[auth_dep])
async def delete_menu_item(item_id: int):
    async with async_session() as session:
        result = await session.execute(select(MenuItem).where(MenuItem.id == item_id))
        menu_item = result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        menu_item.available = 0
        await session.commit()
        return {"status": "deleted"}


@app.get("/api/stats", dependencies=[auth_dep])
async def get_stats():
    async with async_session() as session:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        result = await session.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total_price), 0)
            ).where(
                Order.created_at >= today,
                Order.status == OrderStatus.DELIVERED
            )
        )
        count, total = result.one()
        
        return {
            "orders": count,
            "revenue": float(total)
        }


@app.get("/api/stats/week", dependencies=[auth_dep])
async def get_week_stats():
    async with async_session() as session:
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        result = await session.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total_price), 0)
            ).where(
                Order.created_at >= week_ago,
                Order.status == OrderStatus.DELIVERED
            )
        )
        count, total = result.one()
        
        return {
            "orders": count,
            "revenue": float(total)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


@app.get("/api/staff", dependencies=[auth_dep])
async def get_staff():
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.role.in_([UserRole.ADMIN, UserRole.KITCHEN, UserRole.COURIER]))
        )
        users = result.scalars().all()
        return [
            {
                "id": u.id,
                "vk_id": u.vk_id,
                "role": u.role.value,
                "name": u.name or "",
            }
            for u in users
        ]


@app.post("/api/staff", dependencies=[auth_dep])
async def add_staff(staff: StaffUpdate):
    async with async_session() as session:
        try:
            role = UserRole(staff.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role. Use: admin, kitchen, courier")
        result = await session.execute(select(User).where(User.vk_id == staff.vk_id))
        user = result.scalar_one_or_none()
        if user:
            user.role = role
            if staff.name:
                user.name = staff.name
        else:
            user = User(vk_id=staff.vk_id, role=role, name=staff.name)
            session.add(user)
        await session.commit()
        return {"status": "ok", "vk_id": staff.vk_id, "role": role.value}


@app.delete("/api/staff/{user_id}", dependencies=[auth_dep])
async def remove_staff(user_id: int):
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.role = UserRole.CLIENT
        await session.commit()
        return {"status": "ok"}


BOT_LOG_FILE = Path(__file__).parent / "bot_out.log"
BOT_START_TIME_FILE = Path(__file__).parent / ".bot_start_time"
BOT_MODE = os.getenv("BOT_MODE", "polling").lower()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/bot/status", dependencies=[auth_dep])
async def bot_status():
    uptime = None
    if BOT_START_TIME_FILE.exists():
        try:
            start = float(BOT_START_TIME_FILE.read_text().strip())
            secs = int(time.time() - start)
            h, m, s = secs // 3600, (secs % 3600) // 60, secs % 60
            uptime = f"{h}ч {m}м {s}с" if h > 0 else (f"{m}м {s}с" if m > 0 else f"{s}с")
        except Exception:
            pass
    return {"running": True, "pid": os.getpid(), "uptime": uptime, "mode": BOT_MODE}


@app.post("/api/bot/start", dependencies=[auth_dep])
async def bot_start():
    return {"status": "already_running", "pid": os.getpid(), "mode": BOT_MODE}


@app.post("/api/bot/stop", dependencies=[auth_dep])
async def bot_stop():
    return {"status": "managed_by_process", "message": "Bot runs in the same process. Use start.sh/stop.sh to manage."}


@app.post("/api/bot/restart", dependencies=[auth_dep])
async def bot_restart():
    return {"status": "managed_by_process", "message": "Restart via: bash stop.sh && bash start.sh"}


@app.get("/api/delivery-zones", dependencies=[auth_dep])
async def get_delivery_zones():
    async with async_session() as session:
        result = await session.execute(
            select(DeliveryZone).order_by(DeliveryZone.sort_order)
        )
        zones = result.scalars().all()
        return [
            {
                "id": z.id,
                "name": z.name,
                "cost": z.cost,
                "free_from": z.free_from,
                "enabled": bool(z.enabled),
                "sort_order": z.sort_order,
                "keywords": z.keywords,
            }
            for z in zones
        ]


@app.post("/api/delivery-zones", dependencies=[auth_dep])
async def create_delivery_zone(zone: DeliveryZoneCreate):
    async with async_session() as session:
        new_zone = DeliveryZone(
            name=zone.name,
            cost=zone.cost,
            free_from=zone.free_from,
            enabled=1 if zone.enabled else 0,
            sort_order=zone.sort_order,
            keywords=zone.keywords,
        )
        session.add(new_zone)
        await session.commit()
        return {"id": new_zone.id, "status": "created"}


@app.patch("/api/delivery-zones/{zone_id}", dependencies=[auth_dep])
async def update_delivery_zone(zone_id: int, zone: DeliveryZoneCreate):
    async with async_session() as session:
        result = await session.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
        db_zone = result.scalar_one_or_none()
        if not db_zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        db_zone.name = zone.name
        db_zone.cost = zone.cost
        db_zone.free_from = zone.free_from
        db_zone.enabled = 1 if zone.enabled else 0
        db_zone.sort_order = zone.sort_order
        db_zone.keywords = zone.keywords
        await session.commit()
        return {"status": "updated"}


@app.delete("/api/delivery-zones/{zone_id}", dependencies=[auth_dep])
async def delete_delivery_zone(zone_id: int):
    async with async_session() as session:
        result = await session.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
        db_zone = result.scalar_one_or_none()
        if not db_zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        await session.delete(db_zone)
        await session.commit()
        return {"status": "deleted"}


@app.get("/api/categories", dependencies=[auth_dep])
async def get_categories():
    async with async_session() as session:
        result = await session.execute(
            select(Category).order_by(Category.sort_order)
        )
        cats = result.scalars().all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "icon": c.icon,
                "sort_order": c.sort_order,
            }
            for c in cats
        ]


@app.post("/api/categories", dependencies=[auth_dep])
async def create_category(cat: CategoryCreate):
    async with async_session() as session:
        new_cat = Category(
            name=cat.name,
            icon=cat.icon,
            sort_order=cat.sort_order,
        )
        session.add(new_cat)
        await session.commit()
        return {"id": new_cat.id, "status": "created"}


@app.patch("/api/categories/{cat_id}", dependencies=[auth_dep])
async def update_category(cat_id: int, cat: CategoryCreate):
    async with async_session() as session:
        result = await session.execute(select(Category).where(Category.id == cat_id))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            raise HTTPException(status_code=404, detail="Category not found")
        db_cat.name = cat.name
        db_cat.icon = cat.icon
        db_cat.sort_order = cat.sort_order
        await session.commit()
        return {"status": "updated"}


@app.delete("/api/categories/{cat_id}", dependencies=[auth_dep])
async def delete_category(cat_id: int):
    async with async_session() as session:
        result = await session.execute(select(Category).where(Category.id == cat_id))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            raise HTTPException(status_code=404, detail="Category not found")
        await session.delete(db_cat)
        await session.commit()
        return {"status": "deleted"}


app.mount("/crm", StaticFiles(directory=str(Path(__file__).parent / "crm")), name="crm")


@app.get("/api/bot/logs", dependencies=[auth_dep])
async def bot_logs(lines: int = 50):
    if BOT_LOG_FILE.exists():
        content = BOT_LOG_FILE.read_text(encoding="utf-8", errors="replace")
        all_lines = content.strip().splitlines()
        return {"lines": all_lines[-lines:]}
    return {"lines": []}


class StaffApiKeyCreate(BaseModel):
    name: str
    role: str


@app.post("/api/staff-keys", dependencies=[auth_dep])
async def create_staff_key(body: StaffApiKeyCreate):
    import hashlib
    import secrets
    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    async with async_session() as session:
        staff_key = StaffApiKey(
            key_hash=key_hash,
            name=body.name,
            role=body.role
        )
        session.add(staff_key)
        await session.commit()
    return {"key": raw_key, "name": body.name, "role": body.role, "message": "Save this key - it won't be shown again"}


@app.get("/api/staff-keys", dependencies=[auth_dep])
async def list_staff_keys():
    async with async_session() as session:
        result = await session.execute(select(StaffApiKey))
        keys = result.scalars().all()
        return [{"id": k.id, "name": k.name, "role": k.role, "revoked": k.revoked, "created_at": k.created_at.isoformat()} for k in keys]


@app.delete("/api/staff-keys/{key_id}", dependencies=[auth_dep])
async def revoke_staff_key(key_id: int):
    async with async_session() as session:
        result = await session.execute(select(StaffApiKey).where(StaffApiKey.id == key_id))
        key = result.scalar_one_or_none()
        if not key:
            raise HTTPException(status_code=404, detail="Key not found")
        key.revoked = 1
        await session.commit()
        return {"status": "revoked"}
