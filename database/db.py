from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete
from .models import Base, ConversationMessage
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./food_delivery.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session() as session:
        yield session


async def get_conversation(vk_id: int, limit: int = 20) -> list[dict]:
    async with async_session() as session:
        result = await session.execute(
            select(ConversationMessage)
            .where(ConversationMessage.vk_id == vk_id)
            .order_by(ConversationMessage.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()
        return [{"role": m.role, "text": m.message} for m in reversed(messages)]


async def add_conversation_message(vk_id: int, role: str, message: str):
    async with async_session() as session:
        msg = ConversationMessage(vk_id=vk_id, role=role, message=message)
        session.add(msg)
        await session.commit()

        result = await session.execute(
            select(ConversationMessage)
            .where(ConversationMessage.vk_id == vk_id)
            .order_by(ConversationMessage.created_at.desc())
        )
        all_messages = result.scalars().all()
        if len(all_messages) > 20:
            to_delete = all_messages[20:]
            for m in to_delete:
                await session.delete(m)
            await session.commit()


async def clear_conversation(vk_id: int):
    async with async_session() as session:
        await session.execute(
            delete(ConversationMessage).where(ConversationMessage.vk_id == vk_id)
        )
        await session.commit()
