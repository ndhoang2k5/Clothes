import datetime
import os
import re
import smtplib
from email.message import EmailMessage

from sqlalchemy import text
from sqlalchemy.orm import Session

from ..entities import models


class NewsletterService:
    EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

    @staticmethod
    def ensure_table(db: Session):
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    is_notified BOOLEAN NOT NULL DEFAULT FALSE,
                    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    notified_at TIMESTAMPTZ
                )
                """
            )
        )
        db.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_pending "
                "ON newsletter_subscribers (is_notified, subscribed_at)"
            )
        )
        db.commit()

    @staticmethod
    def _manager_emails() -> list[str]:
        raw = os.getenv("MANAGER_NOTIFICATION_EMAILS", "").strip()
        recipients = [x.strip() for x in raw.split(",") if x.strip()]
        if recipients:
            return recipients
        fallback = os.getenv("SMTP_FROM_EMAIL", "").strip()
        return [fallback] if fallback else []

    @staticmethod
    def _send_batch_email_to_admin(emails: list[str]) -> bool:
        recipients = NewsletterService._manager_emails()
        if not recipients:
            return False

        host = os.getenv("SMTP_HOST", "").strip()
        if not host:
            return False

        port = int(os.getenv("SMTP_PORT", "587"))
        username = os.getenv("SMTP_USERNAME", "").strip()
        password = os.getenv("SMTP_PASSWORD", "").strip()
        use_ssl = str(os.getenv("SMTP_USE_SSL", "false")).strip().lower() in ("1", "true", "yes", "on")
        use_tls = str(os.getenv("SMTP_USE_TLS", "true")).strip().lower() in ("1", "true", "yes", "on")
        from_email = os.getenv("SMTP_FROM_EMAIL", username or "no-reply@unbee.local").strip()
        from_name = os.getenv("SMTP_FROM_NAME", "Unbee").strip()

        now_txt = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        msg = EmailMessage()
        msg["Subject"] = "[UNBEE] Danh sach 5 email dang ky nhan tin moi"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = ", ".join(recipients)
        msg.set_content(
            "Danh sách email đăng ký nhận tin mới:\n\n"
            + "\n".join([f"{idx + 1}. {email}" for idx, email in enumerate(emails)])
            + f"\n\nThời điểm tổng hợp: {now_txt}"
        )

        try:
            if use_ssl:
                with smtplib.SMTP_SSL(host=host, port=port, timeout=10) as smtp:
                    if username:
                        smtp.login(username, password)
                    smtp.send_message(msg)
            else:
                with smtplib.SMTP(host=host, port=port, timeout=10) as smtp:
                    smtp.ehlo()
                    if use_tls:
                        smtp.starttls()
                        smtp.ehlo()
                    if username:
                        smtp.login(username, password)
                    smtp.send_message(msg)
            return True
        except Exception as exc:
            print(f"[NewsletterService] send email failed: {exc}")
            return False

    @staticmethod
    def _pending_count(db: Session) -> int:
        return (
            db.query(models.NewsletterSubscriber)
            .filter(models.NewsletterSubscriber.is_notified == False)  # noqa: E712
            .count()
        )

    @staticmethod
    def subscribe_email(db: Session, raw_email: str) -> dict:
        NewsletterService.ensure_table(db)
        email = (raw_email or "").strip().lower()
        if not email or not NewsletterService.EMAIL_RE.match(email):
            return {"ok": False, "message": "Email không hợp lệ"}

        existing = (
            db.query(models.NewsletterSubscriber)
            .filter(models.NewsletterSubscriber.email == email)
            .first()
        )
        if existing:
            return {"ok": True, "already_exists": True, "message": "Email đã được đăng ký trước đó"}

        subscriber = models.NewsletterSubscriber(
            email=email,
            is_notified=False,
        )
        db.add(subscriber)
        db.commit()
        db.refresh(subscriber)

        # Nếu đủ 5 email chờ thì gửi batch cho admin và đánh dấu đã gửi.
        pending_rows = (
            db.query(models.NewsletterSubscriber)
            .filter(models.NewsletterSubscriber.is_notified == False)  # noqa: E712
            .order_by(models.NewsletterSubscriber.subscribed_at.asc(), models.NewsletterSubscriber.id.asc())
            .limit(5)
            .all()
        )
        sent_now = False
        if len(pending_rows) >= 5:
            emails = [r.email for r in pending_rows]
            if NewsletterService._send_batch_email_to_admin(emails):
                now = datetime.datetime.utcnow()
                for r in pending_rows:
                    r.is_notified = True
                    r.notified_at = now
                db.commit()
                sent_now = True

        return {
            "ok": True,
            "already_exists": False,
            "sent_batch_now": sent_now,
            "pending_count": NewsletterService._pending_count(db),
            "message": "Đăng ký nhận tin thành công",
        }
