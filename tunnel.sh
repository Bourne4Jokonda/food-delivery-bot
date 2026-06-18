#!/bin/bash

echo "========================================="
echo "  Cloudflare Tunnel"
echo "========================================="
echo ""
echo "Это создаст публичный URL для доступа к CRM."
echo "URL будет виден в этом терминале."
echo ""

# Проверяем установку cloudflared
if ! command -v cloudflared &>/dev/null; then
    echo "Установка cloudflared..."
    pkg install -y cloudflared 2>/dev/null || {
        echo "Ручная установка..."
        ARCH=$(uname -m)
        if [ "$ARCH" = "aarch64" ]; then
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
        elif [ "$ARCH" = "armv7l" ]; then
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
        else
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        fi
        curl -sL "$URL" -o cloudflared
        chmod +x cloudflared
        mv cloudflared $PREFIX/bin/
    }
fi

echo "Запуск туннеля..."
echo "Откройте URL ниже в браузере:"
echo ""
cloudflared tunnel --url http://localhost:8080
