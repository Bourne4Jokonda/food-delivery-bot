from vkbottle import Keyboard, KeyboardButtonColor, Text


def get_main_menu_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("🍔 Меню"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("🛒 Корзина"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text("📦 Мои заказы"), color=KeyboardButtonColor.SECONDARY)
    keyboard.add(Text("❓ Помощь"), color=KeyboardButtonColor.SECONDARY)
    return keyboard


def get_menu_keyboard():
    keyboard = Keyboard(one_time=False, inline=True)
    keyboard.add(Text("🍕 Пицца"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("🍜 Рамены"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text("🥗 Салаты"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("🍔 Бургеры"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text("🍟 Снэки"), color=KeyboardButtonColor.SECONDARY)
    keyboard.add(Text("🥤 Напитки"), color=KeyboardButtonColor.SECONDARY)
    keyboard.row()
    keyboard.add(Text("◀️ Назад"), color=KeyboardButtonColor.NEGATIVE)
    return keyboard


def get_cart_item_keyboard(item_id: int, quantity: int):
    keyboard = Keyboard(one_time=True, inline=True)
    if quantity > 1:
        keyboard.add(Text(f"➖ {item_id}"), color=KeyboardButtonColor.SECONDARY)
    else:
        keyboard.add(Text(f"🗑 {item_id}"), color=KeyboardButtonColor.NEGATIVE)
    keyboard.add(Text(f"×{quantity}"), color=KeyboardButtonColor.SECONDARY)
    keyboard.add(Text(f"➕ {item_id}"), color=KeyboardButtonColor.POSITIVE)
    return keyboard


def get_cart_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("✅ Оформить заказ"), color=KeyboardButtonColor.POSITIVE)
    keyboard.row()
    keyboard.add(Text("🗑 Очистить корзину"), color=KeyboardButtonColor.NEGATIVE)
    keyboard.add(Text("◀️ Назад"), color=KeyboardButtonColor.SECONDARY)
    return keyboard


def get_delivery_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("🚗 Доставка"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("🚶 Самовывоз"), color=KeyboardButtonColor.PRIMARY)
    return keyboard


def get_payment_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("💳 Карта"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("💵 Наличные"), color=KeyboardButtonColor.PRIMARY)
    return keyboard


def get_notify_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("🔔 Все статусы"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text("⚡ Только ключевые"), color=KeyboardButtonColor.SECONDARY)
    return keyboard


def get_admin_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("📦 Заказы"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("📊 Статистика"), color=KeyboardButtonColor.PRIMARY)
    return keyboard


def get_order_action_keyboard(order_id: int):
    keyboard = Keyboard(one_time=True, inline=False)
    keyboard.add(Text(f"✅ Принять {order_id}"), color=KeyboardButtonColor.POSITIVE)
    keyboard.add(Text(f"❌ Отклонить {order_id}"), color=KeyboardButtonColor.NEGATIVE)
    return keyboard


def get_kitchen_keyboard(order_id: int):
    keyboard = Keyboard(one_time=True, inline=False)
    keyboard.add(Text(f"👨‍🍳 Начать {order_id}"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text(f"✅ Готово {order_id}"), color=KeyboardButtonColor.POSITIVE)
    return keyboard


def get_courier_keyboard(order_id: int):
    keyboard = Keyboard(one_time=True, inline=False)
    keyboard.add(Text(f"🚗 Взять {order_id}"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text(f"✅ Доставлен {order_id}"), color=KeyboardButtonColor.POSITIVE)
    return keyboard


def get_delivery_time_keyboard(order_id: int):
    keyboard = Keyboard(one_time=True, inline=False)
    keyboard.add(Text(f"⏱ 20 мин {order_id}"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text(f"⏱ 30 мин {order_id}"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text(f"⏱ 40 мин {order_id}"), color=KeyboardButtonColor.SECONDARY)
    keyboard.add(Text(f"⏱ 50 мин {order_id}"), color=KeyboardButtonColor.SECONDARY)
    return keyboard
