#!/bin/bash

cd "$(dirname "$0")"

PID_FILE=".bot.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Бот не запущен (нет PID файла)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo "Остановка бота (PID: $PID)..."
    kill "$PID"
    sleep 2
    if kill -0 "$PID" 2>/dev/null; then
        echo "Принудительная остановка..."
        kill -9 "$PID"
    fi
    echo "Бот остановлен"
else
    echo "Бот уже остановлен (PID: $PID не найден)"
fi

rm -f "$PID_FILE"
rm -f ".bot_start_time"
