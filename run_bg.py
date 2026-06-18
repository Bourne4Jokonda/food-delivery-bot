import sys
import subprocess
import os

log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot.log")
with open(log_file, "w", encoding="utf-8") as f:
    subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=f,
        stderr=subprocess.STDOUT,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
