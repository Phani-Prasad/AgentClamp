"""
OpenAI LLM Integration
Handles communication with OpenAI API
"""

import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from .prompts import SYSTEM_PROMPT


class OpenAILLM:
    """OpenAI LLM client for agent"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize OpenAI client
        
        Args:
            api_key: OpenAI API key (defaults to env var)
            model: Model to use (defaults to env var or gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o")
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def chat(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Send chat completion request to OpenAI
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool definitions for function calling
            
        Returns:
            Response dict with message and optional tool calls
        """
        try:
            # Prepare request parameters
            params = {
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
            }
            
            # Add tools if provided
            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"
            
            # Make API call
            response = self.client.chat.completions.create(**params)
            
            # Extract response
            message = response.choices[0].message
            
            result = {
                "content": message.content,
                "role": message.role,
                "tool_calls": []
            }
            
            # Extract tool calls if present
            if hasattr(message, 'tool_calls') and message.tool_calls:
                result["tool_calls"] = [
                    {
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                    for tc in message.tool_calls
                ]
            
            return result
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def build_messages(self, user_input: str, history: List[Dict] = None) -> List[Dict[str, str]]:
        """
        Build message list for OpenAI API
        
        Args:
            user_input: Current user input
            history: Previous conversation history
            
        Returns:
            List of message dicts
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Add conversation history
        if history:
            for msg in history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Add current user input
        messages.append({"role": "user", "content": user_input})
        
        return messages
