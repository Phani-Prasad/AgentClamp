"""
CLI Interface for AgenticAI
Beautiful terminal interface using Rich
"""

import os
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.table import Table
from rich import print as rprint
from agent import AgentOrchestrator, OpenAILLM
from tools import EmailTool, FileWritingTool
from memory import SQLiteMemory


class CLI:
    """Command-line interface for the agent"""
    
    def __init__(self):
        """Initialize CLI"""
        self.console = Console()
        self.agent = None
    
    def initialize_agent(self):
        """Initialize the agent with all components"""
        try:
            # Initialize components
            llm = OpenAILLM()
            tools = [EmailTool(), FileWritingTool()]
            memory = SQLiteMemory(os.getenv("DATABASE_PATH", "memory.db"))
            
            # Create agent
            self.agent = AgentOrchestrator(llm, tools, memory)
            
            return True
        except Exception as e:
            self.console.print(f"[red]Error initializing agent: {str(e)}[/red]")
            return False
    
    def show_welcome(self):
        """Show welcome message"""
        welcome_text = """
# 🤖 AgenticAI

Welcome to AgenticAI - Your AI Assistant with Tools!

**Available Tools:**
- 📧 **Email**: Send emails to recipients
- 📄 **File Writing**: Create and edit files

**Commands:**
- Type your request naturally
- `/history` - View conversation history
- `/clear` - Clear conversation history
- `/help` - Show this help message
- `/quit` or `/exit` - Exit the application

---
"""
        self.console.print(Panel(Markdown(welcome_text), title="Welcome", border_style="blue"))
    
    def show_help(self):
        """Show help message"""
        table = Table(title="Available Commands", show_header=True, header_style="bold magenta")
        table.add_column("Command", style="cyan")
        table.add_column("Description")
        
        table.add_row("/history", "View recent conversation history")
        table.add_row("/clear", "Clear conversation history")
        table.add_row("/help", "Show this help message")
        table.add_row("/quit or /exit", "Exit the application")
        
        self.console.print(table)
        
        self.console.print("\n[bold]Example Requests:[/bold]")
        self.console.print("  • Send an email to john@example.com about the meeting")
        self.console.print("  • Write a report to report.txt with today's summary")
        self.console.print("  • Create a file called notes.md with my ideas\n")
    
    def show_history(self):
        """Show conversation history"""
        history = self.agent.get_history(limit=20)
        
        if not history:
            self.console.print("[yellow]No conversation history yet.[/yellow]")
            return
        
        self.console.print("\n[bold]Recent Conversation History:[/bold]\n")
        
        for msg in history:
            role = msg['role']
            content = msg['content']
            timestamp = msg['timestamp']
            
            if role == "user":
                self.console.print(f"[cyan]👤 You[/cyan] ({timestamp}):")
                self.console.print(f"   {content}\n")
            elif role == "assistant":
                self.console.print(f"[green]🤖 Assistant[/green] ({timestamp}):")
                self.console.print(f"   {content}\n")
    
    def run(self):
        """Main CLI loop"""
        # Show welcome
        self.show_welcome()
        
        # Initialize agent
        with self.console.status("[bold green]Initializing agent..."):
            if not self.initialize_agent():
                return
        
        self.console.print("[green]✓[/green] Agent initialized successfully!\n")
        
        # Main loop
        while True:
            try:
                # Get user input
                user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input.lower() in ['/quit', '/exit']:
                    self.console.print("\n[yellow]Goodbye! 👋[/yellow]\n")
                    break
                
                elif user_input.lower() == '/help':
                    self.show_help()
                    continue
                
                elif user_input.lower() == '/history':
                    self.show_history()
                    continue
                
                elif user_input.lower() == '/clear':
                    self.agent.clear_history()
                    self.console.print("[green]✓[/green] Conversation history cleared.\n")
                    continue
                
                # Process user request with agent
                with self.console.status("[bold green]Thinking..."):
                    response = self.agent.run(user_input)
                
                # Display response
                self.console.print(f"\n[bold green]🤖 Assistant:[/bold green]")
                self.console.print(Panel(response, border_style="green"))
                
            except KeyboardInterrupt:
                self.console.print("\n\n[yellow]Interrupted. Type /quit to exit.[/yellow]")
                continue
            except Exception as e:
                self.console.print(f"\n[red]Error: {str(e)}[/red]\n")


def main():
    """Entry point for CLI"""
    cli = CLI()
    cli.run()


if __name__ == "__main__":
    main()
