#!/bin/bash

cd "$(dirname "$0")"

echo "Настройка автозапуска при включении телефона..."

# Создаём директорию для boot скриптов
mkdir -p ~/.termux/boot

# Копируем boot скрипт
cat > ~/.termux/boot/start-bot.sh << 'BOOT_EOF'
#!/data/data/com.termux/files/usr/bin/bash

termux-wake-lock

cd ~/food-delivery-bot
if [ -f .bot.pid ]; then
    OLD_PID=$(cat .bot.pid)
    if kill -0 "$OLD_PID" 2>/dev/null; then
        exit 0
    fi
fi

nohup python run.py > bot_out.log 2>&1 &
echo $! > .bot.pid
BOOT_EOF

chmod +x ~/.termux/boot/start-bot.sh

echo "Автозапуск настроен!"
echo "Бот будет запускаться при включении телефона."
echo ""
echo "Важно:"
echo "  1. Установите приложение Termux:Boot из F-Droid"
echo "  2. Откройте Termux:Boot хотя бы один раз"
echo "  3. Отключите оптимизацию батареи для Termux"
echo "     (Настройки → Батарея → Termux → Без ограничений)"
