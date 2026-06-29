import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["CRM_API_KEY"] = "test_secret_key"
os.environ["VK_BOT_TOKEN"] = "test_token"
os.environ["VK_GROUP_ID"] = "239522452"
os.environ["CALLBACK_CONFIRMATION"] = "test_confirm"

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import api as api_module
from database.models import Base


@pytest_asyncio.fixture
async def db_engine():
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    old_engine = api_module.engine
    old_session = api_module.async_session
    api_module.engine = eng
    api_module.async_session = async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    yield eng
    api_module.engine = old_engine
    api_module.async_session = old_session
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def client(db_engine):
    transport = ASGITransport(app=api_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def authed_client(db_engine):
    transport = ASGITransport(app=api_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def auth_headers():
    return {"X-API-Key": "test_secret_key"}
