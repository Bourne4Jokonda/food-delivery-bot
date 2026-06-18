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


@bot.on.message(text="/start")
async def start_handler(event):
    logger.info(f"/start from {event.from_id}")
    try:
        from bot.handlers import handle_message
        await handle_message(event)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)


@bot.on.message()
async def message_handler(event):
    logger.info(f"msg from {event.from_id}: {event.text}")
    try:
        from bot.handlers import handle_message
        await handle_message(event)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)


if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
    bot.run_forever()
