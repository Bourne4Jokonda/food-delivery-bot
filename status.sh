#!/bin/bash

cd "$(dirname "$0")"

PID_FILE=".bot.pid"
START_TIME_FILE=".bot_start_time"

echo "========================================="
echo "  Статус бота"
echo "========================================="

if [ ! -f "$PID_FILE" ]; then
    echo "Статус: Остановлен"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo "Статус: Работает"
    echo "PID: $PID"
    if [ -f "$START_TIME_FILE" ]; then
        START=$(cat "$START_TIME_FILE")
        NOW=$(date +%s)
        DIFF=$((NOW - START))
        HOURS=$((DIFF / 3600))
        MINS=$(( (DIFF % 3600) / 60 ))
        SECS=$((DIFF % 60))
        echo "Время работы: ${HOURS}ч ${MINS}м ${SECS}с"
    fi
    if command -v ps &>/dev/null; then
        RSS=$(ps -o rss= -p "$PID" 2>/dev/null)
        if [ -n "$RSS" ]; then
            RAM_MB=$(echo "scale=1; $RSS / 1024" | bc 2>/dev/null || echo "?")
            echo "RAM: ${RAM_MB} MB"
        fi
    fi
else
    echo "Статус: Упал (PID: $PID)"
    echo "Перезапустите: bash start.sh"
    rm -f "$PID_FILE"
fi
