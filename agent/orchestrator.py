"""
Agent Orchestrator
Main control loop that coordinates LLM, tools, and memory
"""

import json
import os
from typing import List, Dict, Any
from .llm import OpenAILLM
from memory import SQLiteMemory
from tools import BaseTool


class AgentOrchestrator:
    """Main agent orchestrator that coordinates all components"""
    
    def __init__(self, llm: OpenAILLM, tools: List[BaseTool], memory: SQLiteMemory, session_id: str = None):
        """
        Initialize agent orchestrator
        
        Args:
            llm: OpenAI LLM instance
            tools: List of available tools
            memory: Memory system instance
            session_id: Session ID for conversation tracking
        """
        self.llm = llm
        self.tools = {tool.name: tool for tool in tools}
        self.memory = memory
        self.session_id = session_id or os.getenv("SESSION_ID", "default")
        self.max_iterations = int(os.getenv("MAX_ITERATIONS", "10"))
        
        # Create session in memory
        self.memory.create_session(self.session_id)
    
    def run(self, user_input: str) -> str:
        """
        Main agent loop
        
        Args:
            user_input: User's input message
            
        Returns:
            Agent's response
        """
        # Store user message in memory
        self.memory.add_message(self.session_id, "user", user_input)
        
        # Get conversation history
        history = self.memory.get_conversation_history(self.session_id, limit=10)
        
        # Build messages for LLM
        messages = self.llm.build_messages(user_input, history[:-1])  # Exclude the message we just added
        
        # Get tool definitions for function calling
        tool_definitions = [tool.to_openai_function() for tool in self.tools.values()]
        
        # Agent loop with tool execution
        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1
            
            # Get LLM response
            response = self.llm.chat(messages, tools=tool_definitions)
            
            # Check if there are tool calls
            if response["tool_calls"]:
                # Execute each tool call
                for tool_call in response["tool_calls"]:
                    tool_name = tool_call["name"]
                    tool_args = json.loads(tool_call["arguments"])
                    
                    # Execute tool
                    if tool_name in self.tools:
                        tool = self.tools[tool_name]
                        
                        try:
                            # Execute tool
                            result = tool.execute(**tool_args)
                            
                            # Log tool execution
                            conv_id = self.memory.add_message(
                                self.session_id, 
                                "assistant", 
                                f"Calling {tool_name} with {tool_args}"
                            )
                            self.memory.log_tool_execution(
                                conv_id, 
                                tool_name, 
                                tool_args, 
                                result, 
                                "success"
                            )
                            
                            # Add tool result to messages
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{
                                    "id": tool_call["id"],
                                    "type": "function",
                                    "function": {
                                        "name": tool_name,
                                        "arguments": tool_call["arguments"]
                                    }
                                }]
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": result
                            })
                            
                        except Exception as e:
                            error_msg = f"Error executing {tool_name}: {str(e)}"
                            conv_id = self.memory.add_message(self.session_id, "system", error_msg)
                            self.memory.log_tool_execution(
                                conv_id, 
                                tool_name, 
                                tool_args, 
                                None, 
                                "error", 
                                str(e)
                            )
                            
                            # Add error to messages
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": error_msg
                            })
                
                # Continue loop to get final response after tool execution
                continue
            
            # No more tool calls, we have the final response
            if response["content"]:
                # Store assistant response in memory
                self.memory.add_message(self.session_id, "assistant", response["content"])
                return response["content"]
            
            # Safety break if no content and no tool calls
            break
        
        # Max iterations reached
        return "I apologize, but I've reached the maximum number of iterations. Please try rephrasing your request."
    
    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.memory.get_conversation_history(self.session_id, limit)
    
    def clear_history(self):
        """Clear conversation history for current session"""
        self.memory.clear_session(self.session_id)
        self.memory.create_session(self.session_id)
