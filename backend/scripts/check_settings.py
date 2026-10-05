import psycopg2
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect("postgresql://postgres:Nhat180202%40%40@localhost:5432/travel_db")
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM system_settings;")
    rows = cursor.fetchall()
    print("--- SYSTEM SETTINGS IN DATABASE ---")
    for row in rows:
        val_str = json.dumps(row[1], ensure_ascii=False)
        print(f"Key: {row[0]} | Value: {val_str}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error querying database:", e)
