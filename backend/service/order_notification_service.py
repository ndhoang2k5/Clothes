import os
import smtplib
from email.message import EmailMessage
from typing import Any


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class OrderNotificationService:
    @staticmethod
    def is_enabled() -> bool:
        return _parse_bool(os.getenv("ORDER_NOTIFY_ENABLED"), default=False)

    @staticmethod
    def _manager_emails() -> list[str]:
        raw = os.getenv("MANAGER_NOTIFICATION_EMAILS", "")
        emails = [x.strip() for x in raw.split(",") if x.strip()]
        return emails

    @staticmethod
    def _format_vnd(value: Any) -> str:
        try:
            num = float(value or 0)
            return f"{num:,.0f} VND"
        except Exception:
            return f"{value}"

    @staticmethod
    def _build_subject(order_data: dict) -> str:
        code = order_data.get("order_code") or order_data.get("orderCode") or "N/A"
        return f"[UNBEE] Don hang moi {code}"

    @staticmethod
    def _build_text(order_data: dict) -> str:
        code = order_data.get("order_code") or order_data.get("orderCode") or "N/A"
        customer_name = order_data.get("customer_name") or order_data.get("customerName") or ""
        phone = order_data.get("phone") or ""
        email = order_data.get("email") or ""
        address = order_data.get("address") or ""
        note = order_data.get("note") or ""
        status = order_data.get("status") or ""
        subtotal = OrderNotificationService._format_vnd(order_data.get("subtotal"))
        discount = OrderNotificationService._format_vnd(order_data.get("discount_total"))
        shipping = OrderNotificationService._format_vnd(order_data.get("shipping_fee"))
        total = OrderNotificationService._format_vnd(order_data.get("total_amount") or order_data.get("totalAmount"))
        created_at = order_data.get("created_at") or order_data.get("createdAt") or ""
        items = order_data.get("items") or []

        item_lines: list[str] = []
        for idx, it in enumerate(items, start=1):
            product_name = it.get("product_name") or it.get("productName") or ""
            variant = it.get("variant_label") or it.get("variantLabel") or ""
            qty = it.get("quantity") or 0
            line_total = OrderNotificationService._format_vnd(it.get("line_total") or it.get("lineTotal"))
            variant_txt = f" ({variant})" if variant else ""
            item_lines.append(f"{idx}. {product_name}{variant_txt} x{qty} - {line_total}")
        if not item_lines:
            item_lines.append("- Khong co chi tiet san pham")

        return (
            "Thong bao don hang moi\n\n"
            f"Ma don: {code}\n"
            f"Trang thai: {status}\n"
            f"Thoi gian tao: {created_at}\n\n"
            f"Khach hang: {customer_name}\n"
            f"SDT: {phone}\n"
            f"Email: {email}\n"
            f"Dia chi: {address}\n"
            f"Ghi chu: {note}\n\n"
            "San pham:\n"
            + "\n".join(item_lines)
            + "\n\n"
            f"Tam tinh: {subtotal}\n"
            f"Giam gia: {discount}\n"
            f"Phi ship: {shipping}\n"
            f"Thanh toan: {total}\n"
        )

    @staticmethod
    def send_new_order_email(order_data: dict) -> bool:
        if not OrderNotificationService.is_enabled():
            return False

        recipients = OrderNotificationService._manager_emails()
        if not recipients:
            return False

        host = os.getenv("SMTP_HOST", "").strip()
        if not host:
            return False

        port = int(os.getenv("SMTP_PORT", "587"))
        username = os.getenv("SMTP_USERNAME", "").strip()
        password = os.getenv("SMTP_PASSWORD", "").strip()
        use_ssl = _parse_bool(os.getenv("SMTP_USE_SSL"), default=False)
        use_tls = _parse_bool(os.getenv("SMTP_USE_TLS"), default=(not use_ssl))
        from_email = os.getenv("SMTP_FROM_EMAIL", username or "no-reply@unbee.local").strip()
        from_name = os.getenv("SMTP_FROM_NAME", "Unbee").strip()

        msg = EmailMessage()
        msg["Subject"] = OrderNotificationService._build_subject(order_data)
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = ", ".join(recipients)
        msg.set_content(OrderNotificationService._build_text(order_data))

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
            print(f"[OrderNotificationService] send email failed: {exc}")
            return False
