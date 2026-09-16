"""
SQLite Memory System for Agent
Handles conversation history, tool execution logs, and session management
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path


class SQLiteMemory:
    """Memory system using SQLite for persistent storage"""
    
    def __init__(self, db_path: str = "memory.db"):
        """Initialize SQLite memory system"""
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize database with schema"""
        # Create database directory if it doesn't exist
        db_dir = Path(self.db_path).parent
        if db_dir and not db_dir.exists():
            db_dir.mkdir(parents=True, exist_ok=True)
        
        # Read and execute schema
        schema_path = Path(__file__).parent / "schema.sql"
        
        with sqlite3.connect(self.db_path) as conn:
            if schema_path.exists():
                with open(schema_path, 'r') as f:
                    conn.executescript(f.read())
            else:
                # Fallback inline schema
                conn.executescript("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        metadata TEXT
                    );
                    
                    CREATE TABLE IF NOT EXISTS tool_executions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversation_id INTEGER,
                        tool_name TEXT NOT NULL,
                        parameters TEXT NOT NULL,
                        result TEXT,
                        status TEXT NOT NULL,
                        error_message TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
                    );
                    
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    );
                """)
            conn.commit()
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> int:
        """Add a message to conversation history"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO conversations (session_id, role, content, metadata)
                VALUES (?, ?, ?, ?)
            """, (session_id, role, content, json.dumps(metadata) if metadata else None))
            conn.commit()
            return cursor.lastrowid
    
    def get_conversation_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent conversation history"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, role, content, timestamp, metadata
                FROM conversations
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (session_id, limit))
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    'id': row['id'],
                    'role': row['role'],
                    'content': row['content'],
                    'timestamp': row['timestamp'],
                    'metadata': json.loads(row['metadata']) if row['metadata'] else None
                })
            
            return list(reversed(messages))  # Return in chronological order
    
    def log_tool_execution(self, conversation_id: int, tool_name: str, 
                          parameters: Dict, result: str = None, 
                          status: str = "success", error_message: str = None) -> int:
        """Log a tool execution"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO tool_executions 
                (conversation_id, tool_name, parameters, result, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (conversation_id, tool_name, json.dumps(parameters), 
                  result, status, error_message))
            conn.commit()
            return cursor.lastrowid
    
    def get_tool_history(self, session_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent tool execution history for a session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT te.* FROM tool_executions te
                JOIN conversations c ON te.conversation_id = c.id
                WHERE c.session_id = ?
                ORDER BY te.timestamp DESC
                LIMIT ?
            """, (session_id, limit))
            
            tools = []
            for row in cursor.fetchall():
                tools.append({
                    'id': row['id'],
                    'tool_name': row['tool_name'],
                    'parameters': json.loads(row['parameters']),
                    'result': row['result'],
                    'status': row['status'],
                    'error_message': row['error_message'],
                    'timestamp': row['timestamp']
                })
            
            return tools
    
    def create_session(self, session_id: str, metadata: Optional[Dict] = None):
        """Create a new session"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO sessions (id, metadata)
                VALUES (?, ?)
            """, (session_id, json.dumps(metadata) if metadata else None))
            conn.commit()
    
    def update_session(self, session_id: str):
        """Update session timestamp"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (session_id,))
            conn.commit()
    
    def clear_session(self, session_id: str):
        """Clear all data for a session"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Delete tool executions first (foreign key constraint)
            cursor.execute("""
                DELETE FROM tool_executions 
                WHERE conversation_id IN (
                    SELECT id FROM conversations WHERE session_id = ?
                )
            """, (session_id,))
            # Delete conversations
            cursor.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
            # Delete session
            cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
