import psycopg2
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect("postgresql://postgres:Nhat180202%40%40@localhost:5432/travel_db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, slug, title, image, location FROM tours;")
    rows = cursor.fetchall()
    print("--- TOURS IN DATABASE ---")
    for row in rows:
        print(f"ID: {row[0]} | Slug: {row[1]} | Title: {row[2]} | Image: {row[3]} | Location: {row[4]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error querying database:", e)
