#!/bin/bash

cd "$(dirname "$0")"

PID_FILE=".bot.pid"
LOG_FILE="bot_out.log"

# Проверяем, запущен ли уже бот
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Бот уже запущен (PID: $OLD_PID)"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

echo "Запуск бота..."
nohup python run.py > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2

if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "Бот запущен (PID: $(cat $PID_FILE))"
    echo "Логи: tail -f $LOG_FILE"
    echo "Остановить: bash stop.sh"
else
    echo "Ошибка запуска! Проверьте логи: cat $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi
