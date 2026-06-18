import sqlite3
import os
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "food_delivery.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables:', c.fetchall())
try:
    c.execute("SELECT id, name, price, category, available FROM menu_items")
    rows = c.fetchall()
    print(f'Menu items: {len(rows)}')
    for r in rows:
        print(f'  {r}')
except Exception as e:
    print(f'menu_items error: {e}')
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    for t in c.fetchall():
        print(f'Table: {t[0]}')
        c.execute(f"PRAGMA table_info({t[0]})")
        cols = c.fetchall()
        for col in cols:
            print(f'  Column: {col}')
conn.close()
