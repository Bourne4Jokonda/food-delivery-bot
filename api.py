from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
import os, httpx, time
from database.db import engine, async_session, init_db
from database.models import Base, Order, OrderItem, MenuItem, OrderStatus, User, UserRole


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


STATUS_LABELS = {
    "new": "📋 Новый", "confirmed": "✅ Подтвержден", "preparing": "👨‍🍳 Готовится",
    "ready": "🔔 Готов", "delivering": "🚗 В доставке", "delivered": "🎉 Доставлен", "cancelled": "❌ Отменён"
}
KEY_STATUSES = {"ready", "delivering", "delivered", "cancelled"}
VK_BOT_TOKEN = os.getenv("VK_BOT_TOKEN")


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


@app.get("/")
async def serve_crm():
    html_path = Path(__file__).parent / "crm" / "index.html"
    return FileResponse(str(html_path), media_type="text/html")


@app.get("/api/orders")
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
                "delivery_type": o.delivery_type,
                "payment_method": o.payment_method,
                "address": o.address,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in orders
        ]


@app.get("/api/orders/{order_id}")
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
            "delivery_type": order.delivery_type,
            "payment_method": order.payment_method,
            "address": order.address,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": [
                {"name": row[1].name, "quantity": row[0].quantity, "price": row[0].price}
                for row in rows
            ]
        }


@app.patch("/api/orders/{order_id}/status")
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
        return {"status": "ok"}


@app.get("/api/menu")
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


@app.post("/api/menu")
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


@app.patch("/api/menu/{item_id}")
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


@app.delete("/api/menu/{item_id}")
async def delete_menu_item(item_id: int):
    async with async_session() as session:
        result = await session.execute(select(MenuItem).where(MenuItem.id == item_id))
        menu_item = result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        menu_item.available = 0
        await session.commit()
        return {"status": "deleted"}


@app.get("/api/stats")
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


@app.get("/api/stats/week")
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


@app.get("/api/staff")
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


@app.post("/api/staff")
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


@app.delete("/api/staff/{user_id}")
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


@app.get("/api/bot/status")
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
    return {"running": True, "pid": os.getpid(), "uptime": uptime, "mode": "long_polling"}


@app.post("/api/bot/start")
async def bot_start():
    return {"status": "already_running", "pid": os.getpid(), "mode": "long_polling"}


@app.post("/api/bot/stop")
async def bot_stop():
    return {"status": "managed_by_process", "message": "Bot runs in the same process. Use start.sh/stop.sh to manage."}


@app.post("/api/bot/restart")
async def bot_restart():
    return {"status": "managed_by_process", "message": "Restart via: bash stop.sh && bash start.sh"}


@app.get("/api/bot/logs")
async def bot_logs(lines: int = 50):
    if BOT_LOG_FILE.exists():
        content = BOT_LOG_FILE.read_text(encoding="utf-8", errors="replace")
        all_lines = content.strip().splitlines()
        return {"lines": all_lines[-lines:]}
    return {"lines": []}
