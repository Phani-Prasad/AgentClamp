-- Conversations table: stores all messages in the conversation
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata TEXT  -- JSON string for additional data
);

-- Indexes for conversations table
CREATE INDEX IF NOT EXISTS idx_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON conversations(timestamp);

-- Tool executions table: logs all tool calls and results
CREATE TABLE IF NOT EXISTS tool_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    tool_name TEXT NOT NULL,
    parameters TEXT NOT NULL,  -- JSON string
    result TEXT,
    status TEXT NOT NULL CHECK(status IN ('success', 'error', 'pending')),
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Indexes for tool_executions table
CREATE INDEX IF NOT EXISTS idx_tool_name ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_status ON tool_executions(status);

-- Sessions table: tracks conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON string
);

-- Index for sessions table
CREATE INDEX IF NOT EXISTS idx_created_at ON sessions(created_at);
