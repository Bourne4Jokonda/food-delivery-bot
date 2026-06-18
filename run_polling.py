import asyncio
import os
import sys
import ssl
import logging
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

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

from vkbottle import Bot
from database.db import init_db
from init_menu import init_menu

bot = Bot(token=VK_TOKEN)


@bot.on.message(text="/start")
async def start_handler(event):
    logger.info(f"/start from {event.from_id}")
    from bot.handlers import handle_message
    await handle_message(event)


@bot.on.message()
async def message_handler(event):
    logger.info(f"msg from {event.from_id}: {event.text}")
    from bot.handlers import handle_message
    await handle_message(event)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(init_db())
    asyncio.run(init_menu())
    logger.info("Starting bot in polling mode...")
    bot.run_forever()
