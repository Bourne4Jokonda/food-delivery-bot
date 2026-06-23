# Деплой на Android (Termux) — Пошаговая инструкция

## Перед установкой (на ПК клиента)

### Получение токенов VK

1. Откройте VK → Сообщества → ваше сообщество → **Управление**
2. **Работа с API** → **Ключи доступа** → **Создать ключ**
3. Выберите права: `messages`, `groups`, `manage`
4. Скопируйте токен — это **токен сообщества** (начинается с `vk1.a.`)

> **ВАЖНО**: Это должен быть токен СООБЩЕСТВА, а не персональный токен пользователя!
> Путь: Сообщество → Управление → Работа с API → Ключи доступа

---

## Установка на телефон

### 1. Установка Termux

1. Скачайте **Termux** с F-Droid (НЕ из Google Play!)
2. Скачайте **Termux:Boot** с F-Droid
3. Откройте Termux:Boot хотя бы один раз

### 2. Установка проекта

В Termux выполните:

```bash
# Установить пакеты
pkg update -y && pkg upgrade -y
pkg install -y python git

# Клонировать проект
git clone <репозиторий> ~/food-delivery-bot
cd ~/food-delivery-bot

# Установить зависимости
pip install -r requirements.txt
```

Или если проект скопирован через файлы:
```bash
cd ~/food-delivery-bot
pip install -r requirements.txt
```

### 3. Настройка .env

```bash
nano .env
```

Заполните все поля:

```
VK_BOT_TOKEN=ваш_токен_сообщества
VK_GROUP_ID=номер_вашей_группы
CALLBACK_CONFIRMATION=код_из_настроек_API
VK_SECRET_KEY=секретный_ключ_из_настроек_API
YANDEX_GPT_API_KEY=ключ_ЯндексGPT
YANDEX_GPT_FOLDER_ID=ваш_folder_id
DATABASE_URL=sqlite+aiosqlite:///./food_delivery.db
ADMIN_CHAT_ID=2000000001
KITCHEN_CHAT_ID=2000000002
COURIER_CHAT_ID=2000000003
```

Сохранить: `Ctrl+O` → `Enter` → `Ctrl+X`

### 4. Запуск

```bash
bash start.sh
```

Проверьте логи:
```bash
cat bot_out.log
```

Если видите `Bot (Long Polling) + CRM (port 8080) started` — бот работает.
Если ошибки — читайте раздел "Решение проблем" ниже.

### 5. Проверка в VK

Напишите боту `/start` в сообществе VK. Бот должен ответить приветствием.

### 6. Настройка автозапуска

```bash
bash setup_termux_boot.sh
```

Важно:
- Установите **Termux:Boot** из F-Droid
- Откройте Termux:Boot хотя бы один раз
- Отключите оптимизацию батареи для Termux: Настройки телефона → Батарея → Termux → "Не оптимизировать"
- Разрешить работу в фоне: Настройки телефона → Приложения → Termux → "Работать в фоне"

---

## Управление ботом

```bash
bash start.sh     # Запустить
bash stop.sh      # Остановить
bash status.sh    # Статус
bash tunnel.sh    # Туннель для CRM
```

---

## VK Mini App (CRM-панель)

### Настройка Cloudflare Tunnel

```bash
bash tunnel.sh
```

Скопируйте URL туннеля (типа `https://random-name.trycloudflare.com`).

### Настройка в VK

1. Сообщество → Управление → **VK Mini Apps** → Создать приложение
2. Вставьте URL туннеля
3. Скопируйте App ID

### Обновление config.js

Откройте `crm/config.js`:

```javascript
window.VK_MINI_APP_CONFIG = {
    API_URL: 'https://ваш-url-туннеля/api',
};
```

### Публикация

1. VK Mini Apps → Настройки → Описание и скриншоты
2. Заполните описание, загрузите иконку
3. "Отправить на модерацию"

---

## Решение проблем

### "invalid access_token" — токен не работает

- Убедитесь, что это токен **сообщества**, а не пользователя
- Путь: Сообщество → Управление → Работа с API → Ключи доступа
- Убедитесь, что у токена есть права `messages` и `groups`
- Проверьте токен: `curl -s "https://api.vk.com/method/groups.getById?access_token=ТОКЕН&v=5.199"`

### "AssertionError: TypingOnly" — несовместимость SQLAlchemy

```bash
pip install "sqlalchemy>=2.0.36,<2.1"
bash stop.sh && bash start.sh
```

### "MessageMin is immutable" — конфликт pydantic/vkbottle

```bash
pip install --upgrade vkbottle
pip install "pydantic<2.0"
bash stop.sh && bash start.sh
```

### "Нет блюд в меню" — база пуста

```bash
python init_menu.py
bash stop.sh && bash start.sh
```

### Бот не запускается — проверьте логи

```bash
cat bot_out.log
```

### Запрет на обновление pip

В Termux НЕЛЬЗЯ выполнять `pip install --upgrade pip` — это ломает системный pip.
Уже удалено из install.sh.

---

## Порядок действий для клиента (краткий)

1. Установить **Termux** + **Termux:Boot** (из F-Droid)
2. Скопировать проект в `~/food-delivery-bot`
3. `pip install -r requirements.txt`
4. Заполнить `.env` (токены VK и YandexGPT)
5. `bash start.sh`
6. Проверить: написать `/start` боту в VK
7. Настроить автозапуск: `bash setup_termux_boot.sh`
