import sqlite3
import json

db_path = "c:/Users/Phani/OneDrive/MyGravity/AgenticAI/backend/agentclamp.db"

def check():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, guardrails_config FROM agents")
    rows = cursor.fetchall()
    
    print("--- Agents in Database ---")
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"Name: {row[1]}")
        print(f"Guardrails: {row[2]}")
        print("-" * 20)
    conn.close()

if __name__ == "__main__":
    check()
