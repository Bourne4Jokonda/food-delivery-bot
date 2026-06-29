import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import database.db as db_module
from database.models import Base


@pytest_asyncio.fixture
async def test_db():
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    old_session = db_module.async_session
    db_module.async_session = factory

    yield eng

    db_module.async_session = old_session
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


async def test_add_and_get_conversation(test_db):
    await db_module.add_conversation_message(111, "user", "Привет")
    await db_module.add_conversation_message(111, "assistant", "Здравствуйте!")

    history = await db_module.get_conversation(111)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[0]["text"] == "Привет"
    assert history[1]["role"] == "assistant"
    assert history[1]["text"] == "Здравствуйте!"


async def test_conversation_isolation(test_db):
    await db_module.add_conversation_message(111, "user", "Один")
    await db_module.add_conversation_message(222, "user", "Два")

    h1 = await db_module.get_conversation(111)
    h2 = await db_module.get_conversation(222)
    assert len(h1) == 1
    assert len(h2) == 1
    assert h1[0]["text"] == "Один"
    assert h2[0]["text"] == "Два"


async def test_conversation_trimming(test_db):
    for i in range(25):
        await db_module.add_conversation_message(111, "user", f"msg_{i}")

    history = await db_module.get_conversation(111)
    assert len(history) == 20
    assert history[0]["text"] == "msg_5"
    assert history[-1]["text"] == "msg_24"


async def test_clear_conversation(test_db):
    await db_module.add_conversation_message(111, "user", "A")
    await db_module.add_conversation_message(111, "assistant", "B")
    await db_module.clear_conversation(111)

    history = await db_module.get_conversation(111)
    assert len(history) == 0


async def test_get_conversation_empty(test_db):
    history = await db_module.get_conversation(999)
    assert history == []


async def test_conversation_order_is_chronological(test_db):
    await db_module.add_conversation_message(111, "user", "first")
    await db_module.add_conversation_message(111, "assistant", "second")
    await db_module.add_conversation_message(111, "user", "third")

    history = await db_module.get_conversation(111)
    assert [m["text"] for m in history] == ["first", "second", "third"]
