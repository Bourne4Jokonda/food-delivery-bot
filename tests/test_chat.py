import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["CRM_API_KEY"] = "test_secret_key"
os.environ["VK_BOT_TOKEN"] = "test_token"
os.environ["VK_GROUP_ID"] = "239522452"
os.environ["CALLBACK_CONFIRMATION"] = "test_confirm"

import pytest
import re
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import api as api_module
import database.db as db_module
from database.models import Base, Order, OrderStatus, User, UserRole


def clean_ai_response(response: str) -> str:
    clean = re.sub(r'```[\s\S]*?```', '', response).strip()
    clean = re.sub(r'\{[\s\S]*?"type"\s*:\s*"order"[\s\S]*?\}', '', clean).strip()
    clean = re.sub(r'\{[^{}]*"name"\s*:.*?\}', '', clean).strip()
    clean = re.sub(r'\[[\s\S]*?\{[^{}]*"name"\s*:.*?\}[\s\S]*?\]', '', clean).strip()
    clean = re.sub(r',\s*\]', ']', clean).strip()
    clean = re.sub(r'^\s*,', '', clean).strip()
    clean = re.sub(r'\n\s*\n', '\n', clean).strip()
    clean = re.sub(r'Пользователь:.*', '', clean).strip()
    clean = re.sub(r'Ассистент:.*', '', clean).strip()
    clean = re.sub(r'Клиент:.*', '', clean).strip()
    clean = re.sub(r'Бот:.*', '', clean).strip()
    return clean


def test_clean_json_full_block():
    response = 'Хорошо! ```json\n{"type": "order", "items": [{"name": "Пепперони", "quantity": 4}]}\n```'
    clean = clean_ai_response(response)
    assert '{"type"' not in clean
    assert 'Пепперони' not in clean or 'Хорошо' in clean


def test_clean_json_inline():
    response = 'Добавлено: [{"name": "Кола", "quantity": 2}]'
    clean = clean_ai_response(response)
    assert '"name"' not in clean
    assert '"quantity"' not in clean


def test_clean_conversation_history():
    response = """Отлично! Добавим пиццу.
Пользователь: по адресу, одна кола
Ассистент: Ваш заказ оформлен."""
    clean = clean_ai_response(response)
    assert "Пользователь:" not in clean
    assert "Ассистент:" not in clean


def test_clean_json_block():
    response = """Вот ваш заказ:
```json
{"type": "order", "items": [{"name": "Пепперони", "quantity": 1}]}
```
Оформить?"""
    clean = clean_ai_response(response)
    assert "```" not in clean
    assert '{"type"' not in clean


def test_clean_nested_json():
    response = 'Добавлено: [{"name": "Кола", "quantity": 2}], {"name": "Спрайт", "quantity": 3}]'
    clean = clean_ai_response(response)
    assert '"name"' not in clean


def test_clean_preserves_normal_text():
    response = "У нас есть пицца Маргарита за 450₽ и Пепперони за 520₽. Что хотите?"
    clean = clean_ai_response(response)
    assert clean == response


def test_clean_trailing_comma():
    response = 'Пицца, Кола, '
    clean = clean_ai_response(response)
    assert not clean.endswith(', ')


def test_clean_multiple_empty_lines():
    response = "Ответ\n\n\n\nЕщё текст"
    clean = clean_ai_response(response)
    assert "\n\n\n" not in clean


@pytest.mark.asyncio
async def test_delivery_zone_city():
    from bot.handlers import detect_delivery_zone
    zone = detect_delivery_zone("ул. Ленина, 10, Родники")
    assert zone["id"] == "city"
    assert zone["cost"] == 200
    assert zone["free_from"] == 1000


@pytest.mark.asyncio
async def test_delivery_zone_nearby():
    from bot.handlers import detect_delivery_zone
    zone = detect_delivery_zone("д. Курша, дом 5")
    assert zone["id"] == "nearby"
    assert zone["cost"] == 300
    assert zone["free_from"] is None


@pytest.mark.asyncio
async def test_delivery_zone_unknown():
    from bot.handlers import detect_delivery_zone
    zone = detect_delivery_zone("деревня Ромашкино")
    assert zone["id"] == "unknown"


@pytest.mark.asyncio
async def test_delivery_zone_address_partial_match():
    from bot.handlers import detect_delivery_zone
    zone = detect_delivery_zone("Писцово")
    assert zone["id"] == "nearby"


@pytest.mark.asyncio
async def test_delivery_zone_city_street():
    from bot.handlers import detect_delivery_zone
    zone = detect_delivery_zone("пер. Садовый, 3")
    assert zone["id"] == "city"


@pytest.mark.asyncio
async def test_order_has_delivery_cost():
    from database.db import async_session
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    old_session = db_module.async_session
    db_module.async_session = factory
    try:
        async with factory() as session:
            user = User(vk_id=99999, role=UserRole.CLIENT)
            session.add(user)
            await session.flush()
            order = Order(
                client_id=user.id,
                status=OrderStatus.NEW,
                total_price=1200,
                delivery_cost=200,
                delivery_type="delivery",
                payment_method="cash",
                address="ул. Ленина, 10"
            )
            session.add(order)
            await session.commit()

            result = await session.execute(
                __import__('sqlalchemy').select(Order).where(Order.client_id == user.id)
            )
            o = result.scalar_one()
            assert o.delivery_cost == 200
            assert o.total_price == 1200
    finally:
        db_module.async_session = old_session
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await eng.dispose()
