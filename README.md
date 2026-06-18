# 🍕 Вкусная Доставка - Сервис доставки еды через VK

## Установка

1. Установите Python 3.11+: https://python.org
2. Клонируйте проект и перейдите в папку:
```bash
cd food-delivery-bot
```
3. Установите зависимости:
```bash
pip install -r requirements.txt
```
4. Скопируйте .env.example в .env и заполните:
```bash
cp .env.example .env
```

## Настройка

### VK Bot
1. Создайте сообщество в VK: https://vk.com/groups?w=groups_create
2. В настройках сообщества → Работа с API → создайте ключ доступа
3. Включите Long Polling в настройках Callback API
4. Добавьте в .env:
```
VK_BOT_TOKEN=ваш_токен
```

### Yandex GPT (бесплатно)
1. Зарегистрируйтесь в Yandex Cloud: https://cloud.yandex.ru
2. Создайте сервисный аккаунт и получите API ключ
3. Создайте папку (folder_id)
4. Добавьте в .env:
```
YANDEX_GPT_API_KEY=ваш_ключ
YANDEX_GPT_FOLDER_ID=ваш_folder_id
```

## Запуск

```bash
# Инициализация меню
python init_menu.py

# Запуск бота и API
python run.py
```

## Структура проекта

```
food-delivery-bot/
├── bot/
│   ├── main.py           # Точка входа бота
│   ├── handlers.py       # Обработка сообщений
│   ├── ai_agent.py       # Интеграция с YandexGPT
│   └── keyboards.py      # Кнопки ВК
├── crm/
│   └── index.html        # VK Mini App (CRM)
├── api.py                # REST API для CRM
├── database/
│   ├── models.py         # SQLAlchemy модели
│   └── db.py             # Подключение к БД
├── run.py                # Запуск бота и API
└── init_menu.py          # Инициализация меню
```

## Функционал

### Бот ВК
- Консультация с ИИ по меню
- Прием заказов через диалог
- Просмотр меню по категориям
- Отслеживание статуса заказов

### CRM (VK Mini Apps)
- Просмотр всех заказов
- Изменение статуса заказа
- Управление меню
- Статистика продаж

### Уведомления
- Новый заказ → уведомление в чат кухни
- Заказ готов → уведомление курьеру
- Статус обновлен → уведомление клиенту

## Деплой

### Бот (Render.com)
1. Загрузите код на GitHub
2. Создайте проект на Render.com
3. Настройте Environment Variables
4. Бот будет работать 24/7

### CRM (Vercel)
1. Загрузите папку crm на Vercel
2. Настройте API_URL в index.html

## API Endpoints

- `GET /api/orders` - список заказов
- `GET /api/orders/{id}` - детали заказа
- `PATCH /api/orders/{id}/status` - изменить статус
- `GET /api/menu` - список меню
- `POST /api/menu` - добавить блюдо
- `PATCH /api/menu/{id}` - изменить блюдо
- `DELETE /api/menu/{id}` - удалить блюдо
- `GET /api/stats` - статистика за день
