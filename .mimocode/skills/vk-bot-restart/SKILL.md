---
name: vk-bot-restart
description: "Stop and restart VK food delivery bot with proper Python 3.14 path handling"
---

# VK Bot Restart Skill

This skill handles the complex multi-step process of restarting the VK food delivery bot, accounting for Python path issues and process management on Windows.

## When to Use

- After modifying bot code (handlers.py, keyboards.py, etc.)
- When bot stops responding in VK
- Before testing new features
- When switching between bot modes (Polling vs Callback API)

## Prerequisites

- Python 3.14 installed at: `C:\Users\Александр\AppData\Local\Python\pythoncore-3.14-64\python.exe`
- Project directory: `C:\Users\Александр\Downloads\Софт\food-delivery-bot`
- Bot entry point: `run_polling.py` (Polling mode) or `run.py` (Callback API mode)

## Steps

### 1. Validate Python Code (Optional but Recommended)

Before restarting, validate that the code compiles without syntax errors:

```powershell
py -3.14 -c "import py_compile; py_compile.compile(r'C:\Users\Александр\Downloads\Софт\food-delivery-bot\bot\handlers.py', doraise=True)"
```

### 2. Stop Existing Bot Process

Kill all Python processes (bot and API server):

```powershell
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
```

**Important**: Use `Stop-Process -Name python`, NOT `taskkill`. The process may show as `python` in task manager even when started with `py`.

### 3. Start Bot Process

**For Polling Mode** (recommended for this project):

```powershell
Start-Process -FilePath "py" -ArgumentList "-3.14", "run_polling.py" -WorkingDirectory "C:\Users\Александр\Downloads\Софт\food-delivery-bot" -WindowStyle Hidden
```

**For Callback API Mode** (if using ngrok):

```powershell
Start-Process -FilePath "py" -ArgumentList "-3.14", "run.py" -WorkingDirectory "C:\Users\Александр\Downloads\Софт\food-delivery-bot" -WindowStyle Hidden
```

**Alternative with full Python path** (if `py` command fails):

```powershell
$pyPath = "C:\Users\Александр\AppData\Local\Python\pythoncore-3.14-64\python.exe"
Start-Process -FilePath $pyPath -ArgumentList "run_polling.py" -WorkingDirectory "C:\Users\Александр\Downloads\Софт\food-delivery-bot" -WindowStyle Hidden
```

### 4. Verify Bot is Running

Wait for process to start, then check:

```powershell
Start-Sleep -Seconds 3
Get-Process python* 2>$null | Select-Object Id, ProcessName, StartTime
```

### 5. Test Bot Response (Optional)

Send a test message via VK API to verify bot is responding:

```powershell
py -3.14 -c "import httpx, os; from dotenv import load_dotenv; load_dotenv(r'C:\Users\Александр\Downloads\Софт\food-delivery-bot\.env'); token = os.getenv('VK_BOT_TOKEN'); r = httpx.get('https://api.vk.com/method/messages.getConversations', params={'access_token': token, 'v': '5.199'}); print(r.json())"
```

## Common Issues

### Issue: "No module named 'vkbottle'"
- **Cause**: Using wrong Python (hermes-agent venv or WindowsApps)
- **Fix**: Always use `py -3.14` explicitly, not just `python`

### Issue: Bot process starts but doesn't respond
- **Cause**: Wrong entry point or missing dependencies
- **Fix**: Check if using `run_polling.py` for polling mode, `run.py` for callback mode

### Issue: "Access denied" on `groups.getLongPollServer`
- **Cause**: Token from "Ключи доступа" doesn't have Long Poll API permission
- **Fix**: Switch to Callback API mode with ngrok

### Issue: Process not found after start
- **Cause**: Path issues or missing working directory
- **Fix**: Use `-WorkingDirectory` parameter or set `os.chdir()` in script

## Notes

- **Never use `Start-Process -FilePath "python"`** — it may resolve to wrong Python
- **Always use `-WindowStyle Hidden`** for bot processes to avoid console window
- **Check logs** in project directory: `test_err.log`, `test_out.log`
- **Bot PID** is not tracked — use `Get-Process python*` to find it
