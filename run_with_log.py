import sys
import os
import logging
import subprocess

log_file = os.path.join(os.path.dirname(__file__), "bot.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("main")
logger.info("Starting bot with logging to file...")

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

subprocess.run([sys.executable, "run.py"])
