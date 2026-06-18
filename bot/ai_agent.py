import httpx
import json
import os

YANDEX_GPT_API_KEY = os.getenv("YANDEX_GPT_API_KEY")
YANDEX_GPT_FOLDER_ID = os.getenv("YANDEX_GPT_FOLDER_ID")

SYSTEM_PROMPT = """Ты - помощник ресторана "Вкусная Доставка". Твоя задача:
1. Консультировать клиентов по меню
2. Помогать с выбором блюд
3. Принимать заказы
4. Отвечать на вопросы о доставке и времени

Правила:
- Будь дружелюбным и помогай клиентам
- Если клиент хочет сделать заказ, спроси что именно он хочет
- Предлагай популярные блюда
- Уточняй адрес доставки если нужна доставка
- Способы оплаты: наличные при получении или онлайн
- Время доставки: 30-60 минут

Меню ресторана:
- Пицца Маргарита - 450₽
- Пицца Пепперони - 520₽
- Рамен - 380₽
- Боул с курицей - 350₽
- Салат Цезарь - 280₽
- Бургер Классик - 320₽
- Картофель фри - 150₽
- Кола 0.5л - 120₽

Формат заказа: после принятия заказа выведи JSON:
{"type": "order", "items": [{"name": "...", "quantity": N}], "delivery": "delivery/pickup", "address": "..."}

Для простых вопросов отвечай текстом."""


async def chat_with_ai(messages: list[dict]) -> str:
    if not YANDEX_GPT_API_KEY:
        return "ИИ-сервис временно недоступен. Напишите 'заказ' чтобы сделать заказ вручную."

    headers = {
        "Authorization": f"Api-Key {YANDEX_GPT_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "modelUri": f"gpt://{YANDEX_GPT_FOLDER_ID}/yandexgpt-lite",
        "completionOptions": {
            "stream": False,
            "temperature": 0.6,
            "maxTokens": 2000
        },
        "messages": [
            {"role": "system", "text": SYSTEM_PROMPT}
        ] + messages
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["result"]["alternatives"][0]["message"]["text"]
    except Exception as e:
        return f"Ошибка ИИ: {str(e)}. Попробуйте написать 'заказ'."


def parse_order_from_ai_response(text: str) -> dict | None:
    try:
        import re
        match = re.search(r'\{[^{}]*"type"\s*:\s*"order"[^{}]*"items"\s*:\s*\[[\s\S]*?\][^{}]*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        match = re.search(r'\{[\s\S]*?"type"\s*:\s*"order"[\s\S]*?\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None
