---
description: "Check if VK bot process is running"
---

# Check Bot Process Command

Check if the VK food delivery bot process is running and display its status.

## Usage

```
check-bot-process
```

## Implementation

```powershell
Get-Process python* 2>$null | Select-Object Id, ProcessName, StartTime, @{Name="RunningTime";Expression={(Get-Date) - $_.StartTime}}
```

## Output

Returns a table with:
- **Id**: Process ID
- **ProcessName**: Process name (usually "python" or "py")
- **StartTime**: When the process started
- **RunningTime**: How long the process has been running

## Notes

- If no output, bot is not running
- Multiple Python processes may appear (bot + API server)
- Use PID with `Stop-Process -Id <PID>` to kill specific process
