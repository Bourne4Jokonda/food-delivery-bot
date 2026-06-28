# Деплой на VPS / Облако — Стабильный URL для VK Mini App

Для работы VK Mini App нужен **стабильный HTTPS URL**. Вот два варианта:

---

## Вариант 1: Render.com (бесплатный tier)

### Шаг 1: Подготовка проекта

Render.com требует `render.yaml` для автоматического деплоя. Создайте его в корне проекта:

```yaml
services:
  - type: web
    name: food-delivery-bot
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: python run.py
    envVars:
      - key: VK_BOT_TOKEN
        sync: false
      - key: VK_GROUP_ID
        sync: false
      - key: CALLBACK_CONFIRMATION
        sync: false
      - key: VK_SECRET_KEY
        sync: false
      - key: YANDEX_GPT_API_KEY
        sync: false
      - key: YANDEX_GPT_FOLDER_ID
        sync: false
      - key: DATABASE_URL
        value: sqlite+aiosqlite:///./food_delivery.db
      - key: ADMIN_CHAT_ID
        value: "2000000001"
      - key: KITCHEN_CHAT_ID
        value: "2000000002"
      - key: COURIER_CHAT_ID
        value: "2000000003"
```

### Шаг 2: Регистрация на Render.com

1. Зайдите на [render.com](https://render.com)
2. Зарегистрируйтесь через GitHub
3. Нажмите **New +** → **Web Service**
4. Подключите репозиторий `Bourne4Jokonda/food-delivery-bot`
5. Render автоматически найдёт `render.yaml`
6. Заполните环境переменные (env vars) в настройках сервиса:
   - `VK_BOT_TOKEN` — токен сообщества
   - `VK_GROUP_ID` — ID группы
   - `CALLBACK_CONFIRMATION` — код подтверждения
   - `VK_SECRET_KEY` — секретный ключ
   - `YANDEX_GPT_API_KEY` — ключ ЯндексGPT
   - `YANDEX_GPT_FOLDER_ID` — folder ID ЯндексGPT
7. Нажмите **Create Web Service**

### Шаг 3: Настройка VK Mini App

1. Получите URL Render (типа `https://food-delivery-bot.onrender.com`)
2. VK → Сообщество → **Управление** → **VK Mini Apps**
3. Создайте мини-приложение
4. В поле **URL** укажите: `https://food-delivery-bot.onrender.com`
5. Сохраните

### Шаг 4: Обновить config.js

```javascript
window.VK_MINI_APP_CONFIG = {
    API_URL: 'https://food-delivery-bot.onrender.com/api',
};
```

### Ограничения бесплатного tier:

- Сервис засыпает после 15 минут без активности
- Первый запрос после простоя занимает ~30 секунд (холодный старт)
- 750 часов/бесплатно в месяц

---

## Вариант 2: Named Cloudflare Tunnel (бесплатный, нужен домен)

### Шаг 1: Регистрация Cloudflare

1. Зайдите на [cloudflare.com](https://cloudflare.com)
2. Зарегистрируйтесь
3. Добавьте домен (можно купить дешёвый ~$10/год)

### Шаг 2: Установить cloudflared

```bash
# Linux/Mac
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Windows
# Скачайте с https://github.com/cloudflare/cloudflared/releases
```

### Шаг 3: Авторизация

```bash
cloudflared tunnel login
```

Откроется браузер → выберите домен → авторизуйтесь.

### Шаг 4: Создать туннель

```bash
cloudflared tunnel create food-delivery-bot
```

Запишите ID туннеля (типа `a1b2c3d4-...`).

### Шаг 5: Настроить DNS

```bash
cloudflared tunnel route dns food-delivery-bot bot.ваш-домен.com
```

### Шаг 6: Создать config.yml

Создайте файл `~/.cloudflared/config.yml`:

```yaml
tunnel: a1b2c3d4-ваш-id
credentials-file: ~/.cloudflared/a1b2c3d4-ваш-id.json

ingress:
  - hostname: bot.ваш-домен.com
    service: http://localhost:8080
  - service: http_status:404
```

### Шаг 7: Запустить туннель

```bash
cloudflared tunnel run food-delivery-bot
```

### Шаг 8: Настроить VK Mini App

1. VK → Сообщество → **Управление** → **VK Mini Apps**
2. URL: `https://bot.ваш-домен.com`
3. Сохраните

### Шаг 9: Обновить config.js

```javascript
window.VK_MINI_APP_CONFIG = {
    API_URL: 'https://bot.ваш-домен.com/api',
};
```

### Автозапуск туннеля

Добавьте в `start.sh`:

```bash
# Запуск Cloudflare Tunnel (если настроен)
if command -v cloudflared &>/dev/null && [ -f ~/.cloudflared/config.yml ]; then
    nohup cloudflared tunnel run food-delivery-bot > tunnel.log 2>&1 &
    echo "Cloudflare Tunnel запущен"
fi
```

---

## Сравнение вариантов

| Параметр | Render.com | Cloudflare Tunnel |
|----------|------------|-------------------|
| Стоимость | Бесплатно | Бесплатно (нужен домен ~$10/год) |
| Стабильность | Холодный старт ~30с | Мгновенный отклик |
| Скорость | Средняя | Высокая |
| Нужен VPS | Нет | Да (или телефон с Termux) |
| Блокировки РФ | Может блокироваться | Может блокироваться |
| Настройка | 5 минут | 15-20 минут |

---

## Рекомендация

Для **тестирования** — Render.com (быстро, бесплатно).
Для **продакшена** — Named Cloudflare Tunnel на VPS (стабильно, быстро).
