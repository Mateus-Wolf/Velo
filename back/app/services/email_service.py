import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings


def send_email(to: str, subject: str, html_body: str) -> None:
    """Envia um email via SMTP do Gmail.

    Serviço genérico reutilizável para qualquer tipo de email
    (notificações, recuperação de senha, 2FA, etc.)
    """
    msg = MIMEMultipart("alternative")
    msg["From"] = f"MindFlow <{settings.MAIL_FROM}>"
    msg["To"] = to
    msg["Subject"] = subject

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.MAIL_FROM, settings.MAIL_PASSWORD)
        server.sendmail(settings.MAIL_FROM, to, msg.as_string())
