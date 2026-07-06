# Вкусная Доставка

Сервис доставки еды через VK с AI-консультантом и CRM-панелью управления.

## Возможности

### Для клиентов
- Бот в VK для заказа еды
- AI-помощник по выбору блюда
- Просмотр меню с описаниями и ценами
- Оформление заказа за 3 шага (корзина → адрес → оплата)
- Отслеживание статуса заказа в реальном времени
- Бесплатная доставка при заказе от определённой суммы

### Для администрации
- CRM-панель управления в браузере
- Управление заказами (подтвердить/отменить/статус)
- Управление меню (добавить/изменить/удалить блюда)
- Управление сотрудниками (назначение ролей)
- Настройка зон доставки и стоимости
- Статистика продаж (за день/неделю)

### Для персонала
- Кухня: получает заказы и отмечает готовность
- Курьер: берёт доставку и отмечает вручение
- Автоматические уведомления по ролям

## Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  VK Bot     │────▶│  FastAPI      │────▶│  SQLite     │
│  (vkbottle) │     │  (port 8080)  │     │  (БД)       │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  CRM UI      │
                    │  (React SPA) │
                    └──────────────┘
```

## Быстрый старт

### 1. Установка

```bash
git clone https://github.com/Bourne4Jokonda/food-delivery-bot.git
cd food-delivery-bot
pip install -r requirements.txt
```

### 2. Настройка

```bash
cp .env.example .env
# Заполните .env (см. раздел "Настройка переменных")
```

### 3. Запуск

```bash
python run.py
```

Бот запустится на порту 8080. Откройте `http://localhost:8080` для CRM.

## Настройка переменных

| Переменная | Описание | Обязательна |
|------------|----------|-------------|
| `VK_BOT_TOKEN` | Токен бота VK | Да |
| `VK_GROUP_ID` | ID сообщества VK | Да |
| `YANDEX_GPT_API_KEY` | API-ключ YandexGPT | Нет (AI не будет работать) |
| `YANDEX_GPT_FOLDER_ID` | Folder ID YandexCloud | Нет |
| `BOT_MODE` | `polling` или `webhook` | Нет (по умолчанию polling) |
| `ADMIN_CHAT_ID` | ID чата для уведомлений админа | Нет |
| `KITCHEN_CHAT_ID` | ID чата кухни | Нет |
| `COURIER_CHAT_ID` | ID чата курьеров | Нет |
| `CRM_API_KEY` | Ключ доступа к CRM API | Нет (рекомендуется) |
| `VK_SECRET_KEY` | Секретный ключ Callback API | Нет (рекомендуется) |
| `CRM_ALLOWED_ORIGINS` | Разрешённые домены для CRM | Нет |

## Получение токенов

### VK Bot Token
1. Создайте сообщество: https://vk.com/groups?w=groups_create
2. Настройки сообщества → Работа с API → Создать ключ доступа
3. Включите Long Polling в настройках Callback API

### YandexGPT (бесплатно)
1. Зарегистрируйтесь: https://cloud.yandex.ru
2. Создайте сервисный аккаунт → API-ключ
3. Создайте папку → скопируйте folder_id

## Деплой

### Вариант 1: Телефон (Termux)
```bash
# Установите Termux с F-Droid
pkg install git python
git clone https://github.com/Bourne4Jokonda/food-delivery-bot.git
cd food-delivery-bot
pip install -r requirements.txt
nano .env  # настройте переменные
bash start.sh
```

### Вариант 2: Облако (Render.com)
1. Загрузите код на GitHub
2. Создайте проект на Render.com
3. Настройте Environment Variables
4. Бот работает 24/7 бесплатно

### Вариант 3: VPS + Cloudflare
См. `DEPLOY_VPS.md` для подробной инструкции.

## Структура проекта

```
food-delivery-bot/
├── bot/
│   ├── handlers.py       # Обработка сообщений (1100+ строк)
│   ├── ai_agent.py       # AI-консультант YandexGPT
│   ├── keyboards.py      # Клавиатуры VK
│   └── main.py           # Инициализация бота
├── crm/
│   └── index.html        # CRM-панель (React SPA)
├── database/
│   ├── models.py         # SQLAlchemy модели
│   └── db.py             # Подключение к БД
├── tests/
│   ├── test_api.py       # Тесты API
│   ├── test_chat.py      # Тесты AI
│   └── test_db.py        # Тесты БД
├── api.py                # REST API
├── run.py                # Точка входа
├── init_menu.py          # Инициализация меню
├── .env.example          # Пример конфигурации
├── requirements.txt      # Зависимости
├── DEPLOY.md             # Деплой на Termux
└── DEPLOY_VPS.md         # Деплой на VPS
```

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/orders` | Список заказов |
| GET | `/api/orders/{id}` | Детали заказа |
| PATCH | `/api/orders/{id}/status` | Изменить статус |
| GET | `/api/menu` | Список меню |
| POST | `/api/menu` | Добавить блюдо |
| PATCH | `/api/menu/{id}` | Изменить блюдо |
| DELETE | `/api/menu/{id}` | Удалить блюдо |
| GET | `/api/staff` | Список сотрудников |
| POST | `/api/staff` | Добавить сотрудника |
| GET | `/api/stats` | Статистика за день |
| GET | `/api/stats/week` | Статистика за неделю |
| GET | `/api/delivery-zones` | Зоны доставки |
| GET | `/api/categories` | Категории меню |
| POST | `/api/auth/verify` | Проверка API-ключа |

## Тесты

```bash
# Запуск всех тестов
python -m pytest tests/ -v

# Запуск конкретного файла
python -m pytest tests/test_api.py -v
```

34 теста: API, AI-агент, база данных.

## Технологии

- Python 3.11+
- FastAPI — веб-фреймворк
- SQLAlchemy + aiosqlite — асинхронная БД
- vkbottle — VK Bot API
- YandexGPT Lite — AI-консультант
- React — CRM-интерфейс
