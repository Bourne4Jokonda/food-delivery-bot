#!/bin/bash
set -e

echo "========================================="
echo "  Вкусная Доставка — Установка на Termux"
echo "========================================="
echo ""

echo "[1/5] Обновление пакетов..."
pkg update -y && pkg upgrade -y

echo "[2/5] Установка Python и зависимостей..."
pkg install -y python git curl

echo "[3/5] Установка Python пакетов..."
pip install -r requirements.txt

echo "[4/5] Настройка .env..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Файл .env создан из .env.example"
    echo "  ОТКРОЙТЕ .env И ЗАПОЛНИТЕ ТОКЕНЫ!"
    echo "  nano .env"
else
    echo "  Файл .env уже существует"
fi

echo "[5/5] Настройка прав..."
chmod +x start.sh stop.sh status.sh tunnel.sh

echo ""
echo "========================================="
echo "  Установка завершена!"
echo "========================================="
echo ""
echo "Следующие шаги:"
echo "  1. Отредактируйте .env: nano .env"
echo "  2. Запустите бота: bash start.sh"
echo "  3. Проверьте логи: cat bot_out.log"
echo ""
echo "Полезные команды:"
echo "  bash start.sh     — запустить бота"
echo "  bash stop.sh      — остановить бота"
echo "  bash status.sh    — проверить статус"
echo "  bash tunnel.sh    — запустить туннель"
echo ""
