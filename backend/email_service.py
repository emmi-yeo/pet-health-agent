import os
import resend
from typing import Optional

def get_resend_client():
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return None
    resend.api_key = api_key
    return resend

FROM_EMAIL = "PawLog <noreply@pawlog.app>"

def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend. Returns True on success, False if not configured."""
    client = get_resend_client()
    if not client:
        print(f"[EMAIL SKIPPED - no RESEND_API_KEY] To: {to} | Subject: {subject}")
        return False
    try:
        resend.Emails.send({"from": FROM_EMAIL, "to": to, "subject": subject, "html": html})
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
