"""
Example script demonstrating AgenticAI usage
"""

import os
from dotenv import load_dotenv
from agent import AgentOrchestrator, OpenAILLM
from tools import EmailTool, FileWritingTool
from memory import SQLiteMemory

# Load environment variables
load_dotenv()

def main():
    """Example usage of AgenticAI"""
    
    print("🤖 AgenticAI Example\n")
    
    # Initialize components
    print("Initializing agent...")
    llm = OpenAILLM()
    tools = [EmailTool(), FileWritingTool()]
    memory = SQLiteMemory("example_memory.db")
    
    # Create agent
    agent = AgentOrchestrator(llm, tools, memory, session_id="example_session")
    
    print("✓ Agent initialized!\n")
    
    # Example 1: Write a file
    print("Example 1: Writing a file")
    print("-" * 50)
    response = agent.run("Create a file called hello.txt with the message 'Hello from AgenticAI!'")
    print(f"Response: {response}\n")
    
    # Example 2: Send an email (will fail if SMTP not configured)
    print("Example 2: Sending an email")
    print("-" * 50)
    response = agent.run("Send an email to test@example.com with subject 'Test' and body 'This is a test email'")
    print(f"Response: {response}\n")
    
    # Example 3: View history
    print("Example 3: Conversation history")
    print("-" * 50)
    history = agent.get_history(limit=5)
    for msg in history:
        print(f"{msg['role']}: {msg['content'][:100]}...")
    
    print("\n✓ Examples complete!")

if __name__ == "__main__":
    main()
