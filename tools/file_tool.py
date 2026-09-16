"""
File Writing Tool
Writes content to files
"""

import os
from pathlib import Path
from typing import Dict, Any
from .base import BaseTool


class FileWritingTool(BaseTool):
    """Tool for writing content to files"""
    
    def __init__(self):
        """Initialize file writing tool"""
        self.output_dir = os.getenv("FILES_OUTPUT_DIR", "./output")
        # Create output directory if it doesn't exist
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
    
    @property
    def name(self) -> str:
        return "write_file"
    
    @property
    def description(self) -> str:
        return "Write content to a file. Use this when the user asks to save, create, or write a file."
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Name of the file to write (e.g., 'report.txt', 'data.json')"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                },
                "mode": {
                    "type": "string",
                    "description": "Write mode: 'write' (overwrite) or 'append' (add to end)",
                    "enum": ["write", "append"]
                }
            },
            "required": ["filename", "content"]
        }
    
    def execute(self, filename: str, content: str, mode: str = "write") -> str:
        """
        Write content to a file
        
        Args:
            filename: Name of the file
            content: Content to write
            mode: 'write' to overwrite, 'append' to add to end
            
        Returns:
            Success or error message
        """
        try:
            # Sanitize filename to prevent directory traversal
            safe_filename = Path(filename).name
            file_path = Path(self.output_dir) / safe_filename
            
            # Determine write mode
            write_mode = 'a' if mode == 'append' else 'w'
            
            # Write file
            with open(file_path, write_mode, encoding='utf-8') as f:
                f.write(content)
            
            # Get file size
            file_size = file_path.stat().st_size
            
            action = "Appended to" if mode == "append" else "Created"
            return f"✅ {action} file '{safe_filename}' ({file_size} bytes) at {file_path.absolute()}"
            
        except PermissionError:
            return f"❌ Error: Permission denied to write file '{filename}'"
        except Exception as e:
            return f"❌ Error writing file: {str(e)}"
