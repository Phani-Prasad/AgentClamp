# 🤖 AgenticAI

An intelligent AI agent powered by OpenAI with tool-using capabilities and persistent memory.

## Features

- 🧠 **OpenAI GPT-4** integration for intelligent reasoning
- 🛠️ **Tool System**: Extensible tools for email and file operations
- 💾 **SQLite Memory**: Persistent conversation history and tool execution logs
- 🎨 **Beautiful CLI**: Rich terminal interface with colors and formatting
- 🔄 **Function Calling**: Automatic tool selection and execution

## Architecture

```
User Input → Agent Orchestrator → OpenAI LLM → Tools → Memory (SQLite)
```

**Components:**
- **Agent Orchestrator**: Main control loop coordinating all components
- **LLM**: OpenAI GPT-4 for reasoning and decision-making
- **Tools**: Email sending and file writing capabilities
- **Memory**: SQLite database for conversation history

## Quick Start

### 1. Install Dependencies

```bash
cd AgenticAI
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env and add your OpenAI API key
```

**Required settings in `.env`:**
```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Optional settings for email:**
```env
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Run the Agent

```bash
python main.py
```

## Usage

### Interactive Mode

The agent runs in an interactive CLI where you can chat naturally:

```
You: Send an email to john@example.com about tomorrow's meeting

🤖 Assistant: I'll send that email for you...
✅ Email sent successfully to john@example.com
```

### Available Commands

- `/history` - View conversation history
- `/clear` - Clear conversation history
- `/help` - Show help message
- `/quit` or `/exit` - Exit the application

### Example Requests

**Send Email:**
```
Send an email to team@company.com with subject "Weekly Update" and tell them about our progress
```

**Write File:**
```
Create a file called report.txt with a summary of today's work
```

**Combined Actions:**
```
Write a meeting summary to notes.md and email it to sarah@company.com
```

## Tools

### 📧 Email Tool

Send emails via SMTP (Gmail, etc.)

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an "App Password" in Google Account settings
3. Use the app password in `.env`

### 📄 File Writing Tool

Create and edit text files

**Configuration:**
```env
FILES_OUTPUT_DIR=./output
```

Files are saved to the `output` directory by default.

## Project Structure

```
AgenticAI/
├── agent/
│   ├── orchestrator.py    # Main agent loop
│   ├── llm.py             # OpenAI integration
│   └── prompts.py         # System prompts
├── tools/
│   ├── base.py            # Base tool class
│   ├── email_tool.py      # Email sending
│   └── file_tool.py       # File writing
├── memory/
│   ├── database.py        # SQLite operations
│   └── schema.sql         # Database schema
├── cli/
│   └── interface.py       # CLI interface
├── main.py                # Entry point
├── requirements.txt
└── .env.example
```

## Memory System

The agent uses SQLite to store:
- **Conversation history**: All messages between user and assistant
- **Tool executions**: Logs of all tool calls and results
- **Sessions**: Conversation session metadata

**Database location:** `memory.db` (configurable in `.env`)

## Adding New Tools

Create a new tool by extending `BaseTool`:

```python
from tools.base import BaseTool

class MyTool(BaseTool):
    @property
    def name(self) -> str:
        return "my_tool"
    
    @property
    def description(self) -> str:
        return "Description of what the tool does"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "..."}
            },
            "required": ["param1"]
        }
    
    def execute(self, param1: str) -> str:
        # Tool implementation
        return "Result"
```

Register in `cli/interface.py`:
```python
tools = [EmailTool(), FileWritingTool(), MyTool()]
```

## Configuration

All settings in `.env`:

```env
# OpenAI
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o
TEMPERATURE=0.7

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Files
FILES_OUTPUT_DIR=./output

# Database
DATABASE_PATH=./memory.db

# Agent
MAX_ITERATIONS=10
SESSION_ID=default
```

## Troubleshooting

**"OPENAI_API_KEY not found"**
- Create `.env` file with your API key
- Make sure `.env` is in the same directory as `main.py`

**Email not sending**
- Check SMTP credentials in `.env`
- For Gmail, use an App Password (not your regular password)
- Ensure 2FA is enabled on your Google account

**"Module not found" errors**
- Run `pip install -r requirements.txt`
- Make sure you're in the AgenticAI directory

## Examples

### Example 1: Send Email
```
You: Send an email to boss@company.com saying I'll be late tomorrow

🤖 Assistant: I'll send that email for you.
[Calling send_email...]
✅ Email sent successfully to boss@company.com with subject 'Running Late Tomorrow'

I've sent the email letting them know you'll be late tomorrow.
```

### Example 2: Write File
```
You: Create a todo list file with: 1. Review code 2. Write tests 3. Deploy

🤖 Assistant: I'll create that file for you.
[Calling write_file...]
✅ Created file 'todo.txt' (52 bytes) at /path/to/output/todo.txt

I've created your todo list file with the three items.
```

### Example 3: Multi-step Task
```
You: Write a project summary to summary.md and email it to team@company.com

🤖 Assistant: I'll help you with that.
[Calling write_file...]
✅ Created file 'summary.md' (234 bytes)
[Calling send_email...]
✅ Email sent successfully to team@company.com

I've created the project summary file and emailed it to the team.
```

## License

MIT License - feel free to use and modify!

## Contributing

Contributions welcome! Feel free to:
- Add new tools
- Improve the agent logic
- Enhance the CLI interface
- Add tests

---

**Built with ❤️ using OpenAI, Python, and SQLite**
