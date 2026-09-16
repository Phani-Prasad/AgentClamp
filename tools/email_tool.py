"""
Email Sending Tool
Sends emails via SMTP
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from .base import BaseTool


class EmailTool(BaseTool):
    """Tool for sending emails via SMTP"""
    
    def __init__(self):
        """Initialize email tool with SMTP configuration"""
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_username)
    
    @property
    def name(self) -> str:
        return "send_email"
    
    @property
    def description(self) -> str:
        return "Send an email to a recipient with a subject and body. Use this when the user asks to send an email or notify someone."
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Email address of the recipient"
                },
                "subject": {
                    "type": "string",
                    "description": "Subject line of the email"
                },
                "body": {
                    "type": "string",
                    "description": "Body content of the email"
                }
            },
            "required": ["to", "subject", "body"]
        }
    
    def execute(self, to: str, subject: str, body: str) -> str:
        """
        Send an email
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body content
            
        Returns:
            Success or error message
        """
        try:
            # Validate configuration
            if not self.smtp_username or not self.smtp_password:
                return "Error: SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD in .env file."
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'plain'))
            
            # Connect to SMTP server and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()  # Enable TLS
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            return f"✅ Email sent successfully to {to} with subject '{subject}'"
            
        except smtplib.SMTPAuthenticationError:
            return "❌ Error: SMTP authentication failed. Please check your email credentials."
        except smtplib.SMTPException as e:
            return f"❌ Error sending email: {str(e)}"
        except Exception as e:
            return f"❌ Unexpected error: {str(e)}"
