# Деплой на Android (Termux) + VK Mini App

## Быстрая установка

### 1. Установка на телефон

Откройте **Termux** и выполните:

```bash
# Скачать проект (или скопировать файлы в ~/food-delivery-bot)
pkg install git
git clone <ваш-репозиторий> ~/food-delivery-bot
cd ~/food-delivery-bot

# Установить всё автоматически
bash install.sh
```

### 2. Настройка .env

```bash
nano .env
```

Заполните:

```
VK_BOT_TOKEN=ваш_токен_бота
VK_GROUP_ID=номер_группы
CALLBACK_CONFIRMATION=код_подтверждения
VK_SECRET_KEY=секретный_ключ
YANDEX_GPT_API_KEY=ключ_yandex_gpt
YANDEX_GPT_FOLDER_ID=ваш_folder_id
DATABASE_URL=sqlite+aiosqlite:///./food_delivery.db
```

### 3. Запуск

```bash
# Запустить бота + CRM
bash start.sh

# Запустить туннель (для доступа к CRM из интернета)
bash tunnel.sh
```

### 4. Автозапуск

```bash
# Настроить автозапуск при включении телефона
bash setup_termux_boot.sh
```

Важно:
- Установите **Termux:Boot** из F-Droid
- Откройте Termux:Boot хотя бы один раз
- Отключите оптимизацию батареи для Termux
- Разрешить работу в фоне

---

## VK Mini App

### Настройка в VK

1. Откройте настройки вашей VK-группы
2. Работа с API → VK Mini Apps → Создать приложение
3. Введите URL приложения: `https://<ваш-url-туннеля>`
4. Скопируйте App ID

### Обновление config.js

Откройте `crm/config.js` и вставьте URL туннеля:

```javascript
window.VK_MINI_APP_CONFIG = {
    API_URL: 'https://random-name.trycloudflare.com/api',
};
```

### Публикация

1. VK Mini Apps → Настройки → Описание и скриншоты
2. Заполните описание, загрузите иконку
3. Нажмите "Отправить на модерацию"

---

## Управление

```bash
bash start.sh     # Запустить
bash stop.sh      # Остановить
bash status.sh    # Статус
bash tunnel.sh    # Туннель для CRM
```

---

## Порядок действий для клиента

1. Установить Termux + Termux:Boot (F-Droid)
2. Скопировать проект в ~/food-delivery-bot
3. Заполнить .env (токены VK и YandexGPT)
4. Запустить: `bash start.sh`
5. Запустить туннель: `bash tunnel.sh`
6. Открыть URL туннеля в браузере → CRM работает
7. Настроить автозапуск: `bash setup_termux_boot.sh`
