import httpx
import json
import os
from sqlalchemy import select
from database.db import async_session
from database.models import MenuItem

YANDEX_GPT_API_KEY = os.getenv("YANDEX_GPT_API_KEY")
YANDEX_GPT_FOLDER_ID = os.getenv("YANDEX_GPT_FOLDER_ID")

SYSTEM_PROMPT_TEMPLATE = """Ты - помощник ресторана "Вкусная Доставка". Твоя задача:
1. Консультировать клиентов по меню
2. Помогать с выбором блюд
3. Отвечать на вопросы о ресторане

Правила:
- Будь дружелюбным и помогай клиентам
- Если клиент хочет сделать заказ — направь его: "Выберите блюда в меню и нажмите 'Оформить заказ'"
- НЕ предлагай оформить заказ через диалог
- НЕ спрашивай адрес доставки — бот сам это сделает
- НЕ спрашивай способ оплаты — бот сам это сделает
- НЕ спрашивай номер телефона — бот сам это сделает
- НЕ подтверждай заказ — бот сам это сделает
- НЕ выводи JSON и структуры данных — отвечай только текстом
- НЕ повторяй историю диалога — отвечай только на текущий вопрос
- Краткие ответы, 2-3 предложения
- Если клиент называет блюда — скажи "Добавьте их через меню"

Меню ресторана:
{menu_text}"""


async def get_menu_text() -> str:
    try:
        async with async_session() as session:
            result = await session.execute(
                select(MenuItem).where(MenuItem.available == 1).order_by(MenuItem.category)
            )
            items = result.scalars().all()
            if not items:
                return "- Меню пока пустое"
            lines = []
            current_cat = None
            for item in items:
                if item.category != current_cat:
                    current_cat = item.category
                    lines.append(f"\n{current_cat}:")
                lines.append(f"- {item.name} - {item.price}₽")
            return "\n".join(lines)
    except Exception:
        return "- Меню пока пустое"


async def chat_with_ai(messages: list[dict]) -> str:
    if not YANDEX_GPT_API_KEY:
        return "ИИ-сервис временно недоступен. Напишите 'заказ' чтобы сделать заказ вручную."

    menu_text = await get_menu_text()
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(menu_text=menu_text)

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
            {"role": "system", "text": system_prompt}
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
