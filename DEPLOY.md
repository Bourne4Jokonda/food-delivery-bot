# Деплой — Инструкции

## Деплой на Android (Termux)

Основной способ — бот работает на телефоне 24/7.

[См. подробную инструкцию ниже](#установка-на-новый-телефон)

---

## Деплой на VPS / Облако (стабильный URL для VK Mini App)

Для работы VK Mini App нужен стабильный HTTPS URL.

**Два варианта:**
1. **Render.com** — бесплатно, 5 минут настройки, холодный старт ~30с
2. **Named Cloudflare Tunnel** — бесплатно (нужен домен ~$10/год), мгновенный отклик

[Подробная инструкция: DEPLOY_VPS.md](DEPLOY_VPS.md)

---

## Установка на новый телефон

### Шаг 1: Установить Termux и Termux:Boot

1. Скачайте **Termux** с F-Droid (НЕ из Google Play!)
2. Скачайте **Termux:Boot** с F-Droid
3. Откройте Termux:Boot хотя бы один раз

### Шаг 2: Установить пакеты

Откройте Termux и выполните:

```bash
pkg update -y && pkg upgrade -y
pkg install -y python git curl nodejs
```

### Шаг 3: Скачать проект

```bash
git clone https://github.com/Bourne4Jokonda/food-delivery-bot.git ~/food-delivery-bot
cd ~/food-delivery-bot
```

### Шаг 4: Установить Python-зависимости

```bash
pip install -r requirements.txt
```

### Шаг 5: Настроить .env

```bash
nano .env
```

Заполните все поля:

```
VK_BOT_TOKEN=токен_сообщества_VK
VK_GROUP_ID=номер_группы
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

### Шаг 6: Запустить бота

```bash
cd ~/food-delivery-bot && bash start.sh
```

### Шаг 7: Проверить работу

1. Напишите боту `/start` в VK
2. Проверьте логи: `cat bot_out.log`
3. Откройте CRM на телефоне: `http://localhost:8080`

### Шаг 8: Найти IP для доступа с ПК

```bash
python -c "import socket; s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()"
```

На ПК откройте: `http://<IP-телефона>:8080`

**Важно:** ПК и телефон должны быть в одной Wi-Fi сети.

---

## Управление ботом

```bash
bash start.sh      # Запустить
bash stop.sh       # Остановить
bash status.sh     # Статус
bash stop.sh && bash start.sh  # Перезапустить
```

---

## Обновление кода

Когда в GitHub появятся обновления:

```bash
cd ~/food-delivery-bot && git pull && bash stop.sh && bash start.sh
```

---

## Настройка сотрудников

1. Откройте CRM: `http://localhost:8080` на телефоне
2. Перейдите на вкладку **Сотрудники**
3. Нажмите **Добавить**
4. Введите VK ID сотрудника и выберите роль (кухня/курьер)
5. Попросите сотрудника написать боту `/start` в VK

---

## Получение токенов VK

### Токен сообщества (бота)

1. VK → Сообщество → **Управление**
2. **Работа с API** → **Ключи доступа** → **Создать ключ**
3. Выберите права: `messages`, `groups`, `manage`
4. Скопируйте токен

> **ВАЖНО:** Это должен быть токен СООБЩЕСТВА, а не пользователя!
> Путь: Сообщество → Управление → Работа с API → Ключи доступа

### Проверка токена

```bash
curl -s "https://api.vk.com/method/groups.getById?access_token=ВАШ_ТОКЕН&v=5.199"
```

Если вернул `{"response":{...}}` — токен рабочий.

---

## Решение проблем

### Бот не запускается — проверьте логи

```bash
cat bot_out.log | tail -20
```

### Ошибка "invalid access_token"

- Убедитесь, что это токен **сообщества**, а не пользователя
- Убедитесь, что у токена есть права `messages` и `groups`
- Проверьте токен через curl (см. выше)

### Ошибка "AssertionError: TypingOnly"

```bash
pip install "sqlalchemy>=2.0.36,<2.1"
bash stop.sh && bash start.sh
```

### Ошибка "MessageMin is immutable"

```bash
pip install --upgrade vkbottle
pip install "pydantic>=2.0,<3.0"
bash stop.sh && bash start.sh
```

### "Нет блюд в меню"

```bash
python init_menu.py
bash stop.sh && bash start.sh
```

### Порт 8080 уже занят

```bash
pkill -f "python run.py"
sleep 2
bash start.sh
```

### ИИ-сервис недоступен

Убедитесь, что ключи YandexGPT в `.env`:
```bash
grep YANDEX .env
```
Если пусто — добавьте через `nano .env` и перезапустите.

---

## CRM доступна с других устройств

CRM работает на телефоне и доступна с ПК/планшета в той же Wi-Fi сети.

1. Узнайте IP телефона:
```bash
python -c "import socket; s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()"
```

2. На другом устройстве откройте: `http://<IP-телефона>:8080`

**Важно:** IP меняется при переподключении к Wi-Fi. Узнавайте заново при необходимости.

---

## Порядок действий (краткий)

1. Termux + Termux:Boot (из F-Droid)
2. `pkg install python git curl nodejs`
3. `git clone https://github.com/Bourne4Jokonda/food-delivery-bot.git`
4. `cd ~/food-delivery-bot && pip install -r requirements.txt`
5. `nano .env` — заполнить токены
6. `bash start.sh`
7. Проверить: написать `/start` боту в VK
8. CRM: `http://localhost:8080` на телефоне
