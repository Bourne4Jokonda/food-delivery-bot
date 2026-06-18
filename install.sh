#!/bin/bash
set -e

echo "========================================="
echo "  Вкусная Доставка — Установка на Termux"
echo "========================================="
echo ""

# Обновление пакетов
echo "[1/6] Обновление пакетов..."
pkg update -y && pkg upgrade -y

# Установка зависимостей
echo "[2/6] Установка Python и зависимостей..."
pkg install -y python git curl

# Установка Python пакетов
echo "[3/6] Установка Python пакетов..."
pip install --upgrade pip
pip install -r requirements.txt

# Настройка .env
echo "[4/6] Настройка переменных окружения..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Файл .env создан из .env.example"
    echo "  ОТКРОЙТЕ .env И ЗАПОЛНИТЕ ТОКЕНЫ!"
    echo "  nano .env"
else
    echo "  Файл .env уже существует"
fi

# Настройка автозапуска
echo "[5/6] Настройка автозапуска..."
bash setup_termux_boot.sh

# Создание скриптов
echo "[6/6] Создание скриптов..."
chmod +x start.sh stop.sh status.sh tunnel.sh

echo ""
echo "========================================="
echo "  Установка завершена!"
echo "========================================="
echo ""
echo "Следующие шаги:"
echo "  1. Отредактируйте .env: nano .env"
echo "  2. Запустите бота: bash start.sh"
echo "  3. Или через CRM: откройте http://localhost:8080"
echo ""
echo "Полезные команды:"
echo "  bash start.sh     — запустить бота"
echo "  bash stop.sh      — остановить бота"
echo "  bash status.sh    — проверить статус"
echo "  bash tunnel.sh    — запустить туннель"
echo ""
