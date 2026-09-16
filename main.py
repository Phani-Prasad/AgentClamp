"""
AgenticAI - AI Agent with Tools and Memory
Main entry point
"""

import os
from dotenv import load_dotenv
from cli import main

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not found in environment variables.")
        print("Please create a .env file with your OpenAI API key.")
        print("See .env.example for reference.")
        exit(1)
    
    # Run CLI
    main()
