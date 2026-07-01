import asyncio
from sqlalchemy import select
from database.db import engine, async_session
from database.models import MenuItem, DeliveryZone, Category, Base


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

    async with async_session() as session:
        result = await session.execute(select(Category))
        if result.scalars().first():
            print("Категории уже загружены")
        else:
            categories = [
                Category(name="Пицца", icon="fa-pizza-slice", sort_order=0),
                Category(name="Рамен", icon="fa-bowl-food", sort_order=1),
                Category(name="Салаты", icon="fa-leaf", sort_order=2),
                Category(name="Бургеры", icon="fa-burger", sort_order=3),
                Category(name="Снэки", icon="fa-french-fries", sort_order=4),
                Category(name="Напитки", icon="fa-wine-glass", sort_order=5),
            ]
            session.add_all(categories)
            await session.commit()
            print(f"Загружено {len(categories)} категорий")

    async with async_session() as session:
        result = await session.execute(select(DeliveryZone))
        if result.scalars().first():
            print("Зоны доставки уже загружены")
            return

        zones = [
            DeliveryZone(
                name="Город Родники",
                cost=200,
                free_from=1000,
                enabled=1,
                sort_order=0,
                keywords="родники,ул.,улица,пер.,переулок,пр.,проспект,бульвар,наб.,набережная",
            ),
            DeliveryZone(
                name="Ближняя зона (до 10 км)",
                cost=300,
                free_from=1500,
                enabled=1,
                sort_order=1,
                keywords="пригородное,борис-глеб,болтино,ахидовка,деревеньки,корцово,борщево,козлово,кутилово,становое,малышево,полощиново,савково,горяковка,цепочкино,скрылово,постнинский,воронцово,федьково,аферьково,иваниха,горкино,каменки,шелково,коево",
            ),
            DeliveryZone(
                name="Дальняя зона (до 40 км)",
                cost=400,
                free_from=2000,
                enabled=0,
                sort_order=2,
                keywords="южа,приволжск,шуя,комса",
            ),
        ]

        session.add_all(zones)
        await session.commit()
        print(f"Загружено {len(zones)} зон доставки")


if __name__ == "__main__":
    asyncio.run(init_menu())
