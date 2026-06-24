import asyncio
import os
import ssl
import logging
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from vkbottle import Bot, BaseMiddleware
from database.db import init_db, engine, Base
from init_menu import init_menu
from contextlib import asynccontextmanager

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bot")

VK_TOKEN = os.getenv("VK_BOT_TOKEN")
VK_GROUP_ID = int(os.getenv("VK_GROUP_ID", "0"))
CALLBACK_CONFIRMATION = os.getenv("CALLBACK_CONFIRMATION", "")
VK_SECRET_KEY = os.getenv("VK_SECRET_KEY", "")

try:
    import aiohttp
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    _orig = aiohttp.TCPConnector.__init__
    def _patched(self, *a, **kw):
        kw.setdefault("ssl", ssl_ctx)
        _orig(self, *a, **kw)
    aiohttp.TCPConnector.__init__ = _patched
except Exception:
    pass

bot = Bot(token=VK_TOKEN)

from bot.handlers import handle_message


@bot.on.message(text="/start")
async def start_handler(event):
    logger.info(f"/start from {event.from_id} peer={event.peer_id}")
    await handle_message(event)


@bot.on.message()
async def message_handler(event):
    logger.info(f"msg from {event.from_id} peer={event.peer_id}: {event.text}")
    await handle_message(event)


@bot.on.raw_event()
async def raw_event_handler(event):
    logger.info(f"RAW event: type={event.type} object={event.object}")


@asynccontextmanager
async def lifespan(app):
    await init_db()
    await init_menu()
    asyncio.create_task(run_bot_polling())
    logger.info("Bot (Long Polling) + CRM (port 8080) started")
    yield


async def run_bot_polling():
    try:
        logger.info("Starting bot Long Polling...")
        await bot.run_polling()
    except Exception as e:
        logger.error(f"Bot polling error: {e}", exc_info=True)


app = FastAPI(lifespan=lifespan)

from api import app as api_app
app.router.routes = api_app.router.routes + app.router.routes


@app.post("/callback")
async def vk_callback(request: Request):
    data = await request.json()

    if data.get("type") == "confirmation":
        logger.info("Confirmation requested")
        return PlainTextResponse(CALLBACK_CONFIRMATION)

    if data.get("type") == "message_new":
        logger.info(f"Got message event")
        try:
            await bot.process_event(
                {"type": "message_new", "object": data["object"], "group_id": VK_GROUP_ID}
            )
        except Exception as e:
            logger.error(f"Error processing event: {e}", exc_info=True)

    return PlainTextResponse("ok")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
