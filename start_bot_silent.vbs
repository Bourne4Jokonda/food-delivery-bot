Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Александр\Downloads\Софт\food-delivery-bot"
WshShell.Run "py -3.14 run_polling.py", 0, False
