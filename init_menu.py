import asyncio
from sqlalchemy import select
from database.db import engine, async_session
from database.models import MenuItem, Base


async def init_menu():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        result = await session.execute(select(MenuItem))
        if result.scalars().first():
            print("Меню уже загружено")
            return

        menu_items = [
            MenuItem(name="Пицца Маргарита", description="Классическая пицца с моцареллой", price=450, category="Пицца"),
            MenuItem(name="Пицца Пепперони", description="Пицца с пепперони и сыром", price=520, category="Пицца"),
            MenuItem(name="Пицца 4 сыра", description="Микс из 4 видов сыра", price=480, category="Пицца"),
            MenuItem(name="Рамен классический", description="Традиционный японский рамен", price=380, category="Рамен"),
            MenuItem(name="Рамен с курицей", description="Рамен с нежной курицей", price=400, category="Рамен"),
            MenuItem(name="Боул с курицей", description="Полезный боул с авокадо", price=350, category="Салаты"),
            MenuItem(name="Салат Цезарь", description="Классический Цезарь с курицей", price=280, category="Салаты"),
            MenuItem(name="Греческий салат", description="Свежий салат с овощами", price=260, category="Салаты"),
            MenuItem(name="Бургер Классик", description="Сочная говяжья котлета", price=320, category="Бургеры"),
            MenuItem(name="Бургер Чизбургер", description="Бургер с двойным сыром", price=360, category="Бургеры"),
            MenuItem(name="Картофель фри", description="Хрустящий картофель", price=150, category="Снэки"),
            MenuItem(name="Куриные крылья", description="6 штук в соусе", price=280, category="Снэки"),
            MenuItem(name="Кола 0.5л", description="Кока-кола", price=120, category="Напитки"),
            MenuItem(name="Спрайт 0.5л", description="Спрайт", price=120, category="Напитки"),
            MenuItem(name="Вода 0.5л", description="Минеральная вода", price=80, category="Напитки"),
        ]

        session.add_all(menu_items)
        await session.commit()
        print(f"Загружено {len(menu_items)} блюд в меню")


if __name__ == "__main__":
    asyncio.run(init_menu())
