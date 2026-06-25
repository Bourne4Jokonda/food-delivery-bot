import os
import logging
import httpx
from vkbottle import BaseStateGroup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.db import async_session
from database.models import User, Order, OrderItem, MenuItem, OrderStatus, UserRole
from bot.ai_agent import chat_with_ai, parse_order_from_ai_response

KEY_STATUSES = {OrderStatus.READY, OrderStatus.DELIVERING, OrderStatus.DELIVERED, OrderStatus.CANCELLED}
from bot.keyboards import (
    get_main_menu_keyboard,
    get_menu_keyboard,
    get_cart_keyboard,
    get_delivery_keyboard,
    get_payment_keyboard,
    get_notify_keyboard,
    get_admin_keyboard,
    get_order_action_keyboard,
    get_kitchen_keyboard,
    get_courier_keyboard
)

logger = logging.getLogger("bot")

user_carts = {}
user_conversations = {}
pending_orders = {}
pending_notify = {}
ADMIN_VK_ID = 552266758
VK_BOT_TOKEN = os.getenv("VK_BOT_TOKEN")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID", "0")) or None
KITCHEN_CHAT_ID = int(os.getenv("KITCHEN_CHAT_ID", "0")) or None
COURIER_CHAT_ID = int(os.getenv("COURIER_CHAT_ID", "0")) or None

CATEGORY_MAP = {
    "пицца": "Пицца",
    "рамены": "Рамен",
    "салаты": "Салаты",
    "бургеры": "Бургеры",
    "снэки": "Снэки",
    "напитки": "Напитки",
}

STATUS_LABELS_RU = {
    OrderStatus.NEW: "Новый",
    OrderStatus.CONFIRMED: "Подтвержден",
    OrderStatus.PREPARING: "Готовится",
    OrderStatus.READY: "Готов",
    OrderStatus.DELIVERING: "В доставке",
    OrderStatus.DELIVERED: "Доставлен",
    OrderStatus.CANCELLED: "Отменен",
}


async def send_vk_message(vk_id: int, message: str, chat_id: int = None, keyboard=None):
    try:
        params = {"access_token": VK_BOT_TOKEN, "message": message, "random_id": 0, "v": "5.199"}
        if chat_id:
            real_chat_id = chat_id - 2000000000 if chat_id > 2000000000 else chat_id
            params["chat_id"] = real_chat_id
        else:
            params["user_id"] = vk_id
        if keyboard:
            params["keyboard"] = keyboard.get_json()
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.vk.com/method/messages.send", params=params)
            data = resp.json()
            if "error" in data:
                logger.error(f"VK send error: {data['error']}")
    except Exception as e:
        logger.error(f"VK send exception: {e}")


async def notify_status_change(order_id: int, new_status: OrderStatus):
    async with async_session() as session:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            return
        if order.notify_level == "key_only" and new_status not in KEY_STATUSES:
            return
        user_result = await session.execute(select(User).where(User.id == order.client_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return
        status_text = STATUS_LABELS_RU.get(new_status, str(new_status))
        await send_vk_message(user.vk_id, f"📦 Заказ #{order_id}: {status_text}")


async def notify_staff_by_role(role: UserRole, message: str, order_id: int = None):
    try:
        async with async_session() as session:
            result = await session.execute(select(User).where(User.role == role))
            users = result.scalars().all()
            for user in users:
                keyboard = None
                if order_id:
                    if role == UserRole.ADMIN:
                        keyboard = get_order_action_keyboard(order_id)
                    elif role == UserRole.KITCHEN:
                        keyboard = get_kitchen_keyboard(order_id)
                    elif role == UserRole.COURIER:
                        keyboard = get_courier_keyboard(order_id)
                await send_vk_message(user.vk_id, message, keyboard=keyboard)
    except Exception as e:
        logger.error(f"notify_staff error: {e}")


async def notify_kitchen(order_id: int, order_details: str):
    await notify_staff_by_role(UserRole.KITCHEN, f"👨‍🍳 Новый заказ на кухне #{order_id}!\n\n{order_details}", order_id=order_id)


async def notify_courier(order_id: int, order_details: str):
    await notify_staff_by_role(UserRole.COURIER, f"🚗 Заказ #{order_id} готов к доставке!\n\n{order_details}", order_id=order_id)


async def get_order_items_text(order_id: int) -> str:
    async with async_session() as session:
        result = await session.execute(
            select(OrderItem, MenuItem).join(MenuItem, OrderItem.menu_item_id == MenuItem.id).where(OrderItem.order_id == order_id)
        )
        rows = result.all()
        text = ""
        for row in rows:
            text += f"  • {row[1].name} x{row[0].quantity} — {row[0].price * row[0].quantity}₽\n"
        return text


def strip_buttons(text: str) -> str:
    import re
    return re.sub(r'[\U0001F300-\U0001FAFF\u25A0-\u25FF\u2600-\u27BF\u2B50\u2705\u274C\u26D4\u2B55\u203C\u2049\u2139\uFE0F\u200D]+\s*', '', text).strip().lower()


class OrderState(BaseStateGroup):
    WAITING_ADDRESS = 0


async def get_or_create_user(vk_id: int, session: AsyncSession) -> User:
    result = await session.execute(select(User).where(User.vk_id == vk_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(vk_id=vk_id, role=UserRole.CLIENT)
        session.add(user)
    return user


async def handle_message(event):
    raw = event.text.strip()
    text = strip_buttons(raw)
    vk_id = event.from_id

    async with async_session() as session:
        user = await get_or_create_user(vk_id, session)

        greetings = ["начать", "старт", "/start", "привет", "здравствуйте", "здравствуй",
                       "добрый день", "добрый вечер", "доброе утро", "хай", "хей", "hello", "hi"]
        is_greeting = any(g in text for g in greetings)

        if is_greeting:
            await event.answer(
                "Добро пожаловать в 'Вкусная Доставка'!\n\nЯ ваш персональный помощник. Чем могу помочь?",
                keyboard=get_main_menu_keyboard()
            )

        elif "меню" in text:
            await event.answer("Выберите категорию:", keyboard=get_menu_keyboard())

        elif text in CATEGORY_MAP:
            await show_category(event, CATEGORY_MAP[text])

        elif text == "корзина":
            await show_cart(event, vk_id)

        elif any(w in text for w in ("мои заказы", "мои заказ", "где заказ", "заказ где", "мой заказ")):
            await show_user_orders(event, vk_id)

        elif text == "помощь":
            await event.answer(
                "Я могу помочь вам с:\n\n"
                "Просмотр меню\n"
                "Оформление заказа\n"
                "Отслеживание заказов\n\n"
                "Просто напишите, что вы хотите заказать, и я помогу!",
                keyboard=get_main_menu_keyboard()
            )

        elif "оформить заказ" in text:
            await start_order(event, vk_id)

        elif "доставка" in text and vk_id in user_carts and user_carts[vk_id]:
            await handle_delivery_choice(event, vk_id, text)

        elif "самовывоз" in text and vk_id in user_carts and user_carts[vk_id]:
            await handle_delivery_choice(event, vk_id, text)

        elif any(w in text for w in ("карта", "наличн", "онлайн")) and vk_id in pending_orders:
            await handle_delivery_choice(event, vk_id, text)

        elif "все статусы" in text and vk_id in pending_notify:
            order_id = pending_notify.pop(vk_id)
            async with async_session() as session:
                result = await session.execute(select(Order).where(Order.id == order_id))
                order = result.scalar_one_or_none()
                if order:
                    order.notify_level = "all"
                    await session.commit()
            await event.answer("Уведомления: все статусы ✓", keyboard=get_main_menu_keyboard())

        elif "ключевые" in text and vk_id in pending_notify:
            order_id = pending_notify.pop(vk_id)
            async with async_session() as session:
                result = await session.execute(select(Order).where(Order.id == order_id))
                order = result.scalar_one_or_none()
                if order:
                    order.notify_level = "key_only"
                    await session.commit()
            await event.answer("Уведомления: только ключевые (готов / доставляется) ✓", keyboard=get_main_menu_keyboard())

        elif vk_id in pending_orders and pending_orders[vk_id].get("delivery_type") == "delivery" and "address" not in pending_orders[vk_id]:
            pending_orders[vk_id]["address"] = raw.strip()
            await event.answer("Как будете оплачивать?", keyboard=get_payment_keyboard())

        elif "очистить" in text:
            user_carts[vk_id] = []
            await event.answer("Корзина очищена", keyboard=get_main_menu_keyboard())

        elif text.startswith("принять"):
            await confirm_order(event, text)

        elif text.startswith("начать"):
            await start_preparing(event, text)

        elif text.startswith("отклонить"):
            await cancel_order(event, text)

        elif text.startswith("готово"):
            await ready_order(event, text)

        elif text.startswith("взять"):
            await take_delivery(event, text)

        elif text.startswith("доставлен"):
            await complete_delivery(event, text)

        elif "заказы" in text and user.role == UserRole.ADMIN:
            await show_all_orders(event)

        elif "статистика" in text and user.role == UserRole.ADMIN:
            await show_statistics(event)

        elif text == "назад":
            await event.answer("Главное меню:", keyboard=get_main_menu_keyboard())

        else:
            await add_to_cart_by_name(event, vk_id, text)


async def show_category(event, category: str):
    async with async_session() as session:
        result = await session.execute(
            select(MenuItem).where(MenuItem.category == category, MenuItem.available == 1)
        )
        items = result.scalars().all()

        if not items:
            await event.answer("В этой категории пока нет блюд")
            return

        text = f"{category}:\n\n"
        for item in items:
            text += f"- {item.name} — {item.price}₽\n"
            if item.description:
                text += f"  {item.description}\n"

        text += "\nНапишите название блюда, чтобы добавить в корзину"
        await event.answer(text, keyboard=get_menu_keyboard())


async def add_to_cart_by_name(event, vk_id: int, text: str):
    import re as _re
    async with async_session() as session:
        result = await session.execute(
            select(MenuItem).where(MenuItem.available == 1)
        )
        all_items = result.scalars().all()

        found_items = []
        parts = _re.split(r'[,]+', text)
        for part in parts:
            part = part.strip()
            qty_match = _re.search(r'(\d+)\s*$', part)
            qty = int(qty_match.group(1)) if qty_match else 1
            phrase = part[:qty_match.start()].strip() if qty_match else part

            phrase = phrase.lower()
            best_item = None
            best_score = -1
            for item in all_items:
                name_lower = item.name.lower()
                if phrase in name_lower:
                    score = len(phrase) / len(name_lower)
                    if score > best_score:
                        best_item = item
                        best_score = score
                elif all(w in name_lower for w in phrase.split() if len(w) >= 3):
                    word_score = sum(len(w) for w in phrase.split() if len(w) >= 3 and w in name_lower) / len(name_lower)
                    if word_score > best_score:
                        best_item = item
                        best_score = word_score

            if best_item and best_score >= 0.3:
                if any(fi.id == best_item.id for fi in found_items):
                    for fi in found_items:
                        if fi.id == best_item.id:
                            fi._qty = getattr(fi, '_qty', 1) + qty
                            break
                else:
                    best_item._qty = qty
                    found_items.append(best_item)

        if not found_items:
            await handle_ai_chat(event, vk_id, text)
            return

        cart = user_carts.get(vk_id, [])
        added = []
        for menu_item in found_items:
            qty = getattr(menu_item, '_qty', 1)
            found = False
            for item in cart:
                if item["id"] == menu_item.id:
                    item["quantity"] += qty
                    found = True
                    break
            if not found:
                cart.append({"id": menu_item.id, "quantity": qty})
            added.append(f"{menu_item.name} x{qty}")
        user_carts[vk_id] = cart

        total = 0
        async with async_session() as session2:
            for ci in cart:
                result2 = await session2.execute(select(MenuItem).where(MenuItem.id == ci["id"]))
                mi = result2.scalar_one()
                total += mi.price * ci["quantity"]

        await event.answer(
            f"Добавлено: {', '.join(added)}\n"
            f"Итого в корзине: {total}₽",
            keyboard=get_cart_keyboard()
        )


async def show_cart(event, vk_id: int):
    cart = user_carts.get(vk_id, [])
    if not cart:
        await event.answer("Корзина пуста", keyboard=get_main_menu_keyboard())
        return

    text = "Ваша корзина:\n\n"
    total = 0
    async with async_session() as session:
        for item in cart:
            result = await session.execute(select(MenuItem).where(MenuItem.id == item["id"]))
            menu_item = result.scalar_one()
            subtotal = menu_item.price * item["quantity"]
            total += subtotal
            text += f"- {menu_item.name} x{item['quantity']} — {subtotal}₽\n"

    text += f"\nИтого: {total}₽"
    await event.answer(text, keyboard=get_cart_keyboard())


async def handle_ai_chat(event, vk_id: int, text: str):
    import re as _re

    if vk_id not in user_conversations:
        user_conversations[vk_id] = []

    user_conversations[vk_id].append({"role": "user", "text": text})

    response = await chat_with_ai(user_conversations[vk_id])

    clean_response = _re.sub(r'```[\s\S]*?```', '', response).strip()
    clean_response = _re.sub(r'\{[\s\S]*?"type"\s*:\s*"order"[\s\S]*?\}', '', clean_response).strip()

    order_data = parse_order_from_ai_response(response)

    if order_data and order_data.get("items"):
        async with async_session() as session:
            result = await session.execute(select(MenuItem).where(MenuItem.available == 1))
            all_items = result.scalars().all()

            new_cart = []
            for oi in order_data["items"]:
                name = oi.get("name", "").lower()
                qty = oi.get("quantity", 1)
                best = None
                best_score = -1
                for mi in all_items:
                    if name in mi.name.lower():
                        score = len(name) / len(mi.name.lower())
                        if score > best_score:
                            best = mi
                            best_score = score
                if best and best_score >= 0.3:
                    new_cart.append({"id": best.id, "quantity": qty})
            user_carts[vk_id] = new_cart

        if user_carts.get(vk_id):
            cart = user_carts[vk_id]
            cart_text = "Ваш заказ сформирован:\n\n"
            total = 0
            async with async_session() as session:
                for ci in cart:
                    result = await session.execute(select(MenuItem).where(MenuItem.id == ci["id"]))
                    mi = result.scalar_one()
                    sub = mi.price * ci["quantity"]
                    total += sub
                    cart_text += f"- {mi.name} x{ci['quantity']} — {sub}₽\n"
            cart_text += f"\nИтого: {total}₽\n\nОформить заказ?"
            if clean_response:
                cart_text = clean_response + "\n\n" + cart_text
            await event.answer(cart_text, keyboard=get_cart_keyboard())
        else:
            await event.answer(clean_response or response, keyboard=get_main_menu_keyboard())
    else:
        if clean_response:
            response = clean_response
        user_conversations[vk_id].append({"role": "assistant", "text": response})
        if len(user_conversations[vk_id]) > 20:
            user_conversations[vk_id] = user_conversations[vk_id][-10:]
        await event.answer(response, keyboard=get_main_menu_keyboard())


async def start_order(event, vk_id: int):
    cart = user_carts.get(vk_id, [])
    if not cart:
        await event.answer("Сначала добавьте что-нибудь в корзину!", keyboard=get_main_menu_keyboard())
        return

    await event.answer("Как хотите получить заказ?", keyboard=get_delivery_keyboard())


async def handle_delivery_choice(event, vk_id: int, text: str):
    cart = user_carts.get(vk_id, [])
    if not cart:
        await event.answer("Корзина пуста", keyboard=get_main_menu_keyboard())
        return

    if "доставка" in text:
        pending_orders[vk_id] = {"delivery_type": "delivery"}
        await event.answer("Укажите адрес доставки:")
    elif "самовывоз" in text:
        pending_orders[vk_id] = {"delivery_type": "pickup"}
        await event.answer("Как будете оплачивать?", keyboard=get_payment_keyboard())
    elif "карта" in text or "наличн" in text or "онлайн" in text:
        if vk_id not in pending_orders:
            await event.answer("Сначала выберите тип получения", keyboard=get_main_menu_keyboard())
            return

        payment_map = {"карта": "card", "наличн": "cash", "онлайн": "online"}
        payment_label = {"card": "💳 Карта", "cash": "💵 Наличные", "online": "📱 Онлайн"}

        payment = None
        for key, val in payment_map.items():
            if key in text:
                payment = val
                break

        pending_orders[vk_id]["payment"] = payment

        async with async_session() as session:
            user = await get_or_create_user(vk_id, session)
            total = 0
            for ci in cart:
                result = await session.execute(select(MenuItem).where(MenuItem.id == ci["id"]))
                mi = result.scalar_one()
                total += mi.price * ci["quantity"]

            delivery_type = pending_orders[vk_id]["delivery_type"]
            address = pending_orders[vk_id].get("address", "Самовывоз") if delivery_type == "pickup" else pending_orders[vk_id].get("address", "")
            order = Order(
                client_id=user.id,
                delivery_type=delivery_type,
                payment_method=payment,
                address=address,
                total_price=total,
                status=OrderStatus.NEW
            )
            session.add(order)
            await session.flush()

            for ci in cart:
                result = await session.execute(select(MenuItem).where(MenuItem.id == ci["id"]))
                mi = result.scalar_one()
                item = OrderItem(
                    order_id=order.id,
                    menu_item_id=mi.id,
                    quantity=ci["quantity"],
                    price=mi.price
                )
                session.add(item)

            await session.commit()
            user_carts[vk_id] = []
            del pending_orders[vk_id]

            delivery_text = "🚗 Доставка" if delivery_type == "delivery" else "🚶 Самовывоз"
            pay_text = payment_label.get(payment, payment)
            address_line = f"\nАдрес: {address}" if delivery_type == "delivery" and address else ""

            confirm_msg = (
                f"Заказ #{order.id} оформлен!\n"
                f"{delivery_text}"
                f"{address_line}\n"
                f"Оплата: {pay_text}\n"
                f"Итого: {total}₽\n\n"
            )
            if delivery_type == "pickup":
                confirm_msg += "Ждём вас в ресторане!"
            else:
                confirm_msg += "Ожидайте доставку в течение 30-60 минут!"

            pending_notify[vk_id] = order.id
            await event.answer(confirm_msg + "\n\nКак уведомлять о статусе заказа?", keyboard=get_notify_keyboard())

            try:
                items_text = ""
                for ci in cart:
                    result3 = await session.execute(select(MenuItem).where(MenuItem.id == ci["id"]))
                    mi3 = result3.scalar_one()
                    items_text += f"  • {mi3.name} x{ci['quantity']} — {mi3.price * ci['quantity']}₽\n"
                admin_msg = (
                    f"📦 Новый заказ #{order.id}!\n\n"
                    f"{delivery_text}\n"
                    f"{address_line}\n"
                    f"Оплата: {pay_text}\n\n"
                    f"{items_text}\n"
                    f"Итого: {total}₽"
                )
                if ADMIN_CHAT_ID:
                    await send_vk_message(0, admin_msg, chat_id=ADMIN_CHAT_ID, keyboard=get_order_action_keyboard(order.id))
                else:
                    await notify_staff_by_role(UserRole.ADMIN, admin_msg, order_id=order.id)
            except Exception:
                pass
    else:
        await event.answer("Выберите способ оплаты:", keyboard=get_payment_keyboard())


async def show_user_orders(event, vk_id: int):
    async with async_session() as session:
        user = await get_or_create_user(vk_id, session)
        result = await session.execute(
            select(Order).where(Order.client_id == user.id).order_by(Order.created_at.desc()).limit(5)
        )
        orders = result.scalars().all()

        if not orders:
            await event.answer("У вас пока нет заказов")
            return

        text = "Ваши последние заказы:\n\n"
        payment_label = {"card": "💳", "cash": "💵", "online": "📱"}
        for order in orders:
            status_text = {
                OrderStatus.NEW: "Новый",
                OrderStatus.CONFIRMED: "Подтвержден",
                OrderStatus.PREPARING: "Готовится",
                OrderStatus.READY: "Готов",
                OrderStatus.DELIVERING: "В доставке",
                OrderStatus.DELIVERED: "Доставлен",
                OrderStatus.CANCELLED: "Отменен"
            }.get(order.status, "Неизвестно")
            pay = payment_label.get(order.payment_method, "")
            delivery = "🚗" if order.delivery_type == "delivery" else "🚶"
            text += f"#{order.id} — {status_text} — {order.total_price}₽ {delivery}{pay}\n"

        await event.answer(text, keyboard=get_main_menu_keyboard())


async def confirm_order(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.CONFIRMED
                await session.commit()
                await event.answer(f"Заказ #{order_id} подтвержден!")
                await notify_status_change(order_id, OrderStatus.CONFIRMED)
                items_text = await get_order_items_text(order_id)
                await notify_kitchen(order_id, items_text)
    except Exception as e:
        logger.error(f"confirm_order error: {e}", exc_info=True)
        await event.answer("Ошибка при подтверждении заказа")


async def cancel_order(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.CANCELLED
                await session.commit()
                await event.answer(f"Заказ #{order_id} отменен")
                await notify_status_change(order_id, OrderStatus.CANCELLED)
    except Exception as e:
        logger.error(f"cancel_order error: {e}", exc_info=True)
        await event.answer("Ошибка при отмене заказа")


async def start_preparing(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.PREPARING
                await session.commit()
                await event.answer(f"Заказ #{order_id} взят в работу")
                await notify_status_change(order_id, OrderStatus.PREPARING)
    except Exception as e:
        logger.error(f"start_preparing error: {e}", exc_info=True)
        await event.answer("Ошибка при началеготовки")


async def ready_order(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.READY
                await session.commit()
                await event.answer(f"Заказ #{order_id} готов!")
                await notify_status_change(order_id, OrderStatus.READY)
                if order.delivery_type == "delivery":
                    items_text = await get_order_items_text(order_id)
                    address = order.address or "Не указан"
                    await notify_courier(order_id, f"Адрес: {address}\n{items_text}")
    except Exception as e:
        logger.error(f"ready_order error: {e}", exc_info=True)
        await event.answer("Ошибка при отметке готовности")


async def take_delivery(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.DELIVERING
                await session.commit()
                await event.answer(f"Заказ #{order_id} взят в доставку")
                await notify_status_change(order_id, OrderStatus.DELIVERING)
    except Exception as e:
        logger.error(f"take_delivery error: {e}", exc_info=True)
        await event.answer("Ошибка при взятии доставки")


async def complete_delivery(event, text: str):
    try:
        order_id = int(text.split()[-1])
        async with async_session() as session:
            result = await session.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.DELIVERED
                await session.commit()
                await event.answer(f"Заказ #{order_id} доставлен!")
                await notify_status_change(order_id, OrderStatus.DELIVERED)
    except Exception as e:
        logger.error(f"complete_delivery error: {e}", exc_info=True)
        await event.answer("Ошибка при завершении доставки")


async def show_all_orders(event):
    async with async_session() as session:
        result = await session.execute(
            select(Order).where(Order.status.notin_([OrderStatus.DELIVERED, OrderStatus.CANCELLED]))
            .order_by(Order.created_at.desc()).limit(20)
        )
        orders = result.scalars().all()

        if not orders:
            await event.answer("Нет активных заказов")
            return

        text = "Активные заказы:\n\n"
        for order in orders:
            status_text = {
                OrderStatus.NEW: "Новый",
                OrderStatus.CONFIRMED: "Подтвержден",
                OrderStatus.PREPARING: "Готовится",
                OrderStatus.READY: "Готов",
                OrderStatus.DELIVERING: "В доставке"
            }.get(order.status, "Неизвестно")
            text += f"#{order.id} — {status_text} — {order.total_price}₽\n"

        await event.answer(text, keyboard=get_admin_keyboard())


async def show_statistics(event):
    async with async_session() as session:
        from sqlalchemy import func
        from datetime import datetime, timedelta

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = datetime.utcnow() - timedelta(days=7)

        today_result = await session.execute(
            select(func.count(Order.id), func.coalesce(func.sum(Order.total_price), 0))
            .where(Order.created_at >= today, Order.status == OrderStatus.DELIVERED)
        )
        today_count, today_total = today_result.one()

        week_result = await session.execute(
            select(func.count(Order.id), func.coalesce(func.sum(Order.total_price), 0))
            .where(Order.created_at >= week_ago, Order.status == OrderStatus.DELIVERED)
        )
        week_count, week_total = week_result.one()

        await event.answer(
            f"📊 Статистика\n\n"
            f"Сегодня:\n"
            f"  Заказов: {today_count or 0}\n"
            f"  Выручка: {today_total or 0}₽\n\n"
            f"За неделю:\n"
            f"  Заказов: {week_count or 0}\n"
            f"  Выручка: {week_total or 0}₽",
            keyboard=get_admin_keyboard()
        )
