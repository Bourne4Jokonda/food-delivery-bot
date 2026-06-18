import os
import ssl
import logging
from dotenv import load_dotenv
from vkbottle import Bot
from database.db import init_db

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bot")

VK_TOKEN = os.getenv("VK_BOT_TOKEN")

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
    logger.info(f"/start from {event.from_id}")
    await handle_message(event)


@bot.on.message()
async def message_handler(event):
    logger.info(f"msg from {event.from_id}: {event.text}")
    await handle_message(event)


import asyncio

async def _main():
    await init_db()
    logger.info("Bot started (Long Polling mode)")
    await bot.run_polling()

asyncio.run(_main())
