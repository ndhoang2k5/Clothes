"""
Salework Open API client – Product Get List.
GET https://salework.net/api/open/stock/v1/product/list
Headers: client-id, token
Ưu tiên biến môi trường SALEWORK_CLIENT_ID, SALEWORK_TOKEN; nếu không có thì dùng giá trị mặc định bên dưới.
"""
import os
import time
import requests

SALEWORK_BASE_URL = os.environ.get("SALEWORK_BASE_URL", "https://salework.net/api/open/stock/v1")
SALEWORK_CLIENT_ID = os.environ.get("SALEWORK_CLIENT_ID", "")
SALEWORK_TOKEN = os.environ.get("SALEWORK_TOKEN", "")


def fetch_product_list():
    """
    GET product/list from Salework.
    Returns: (success: bool, data: dict | None, error: str | None)
    - data: { "products": { code: item }, "warehouses": [...] }
    - item: _id, code, name, image, retailPrice, cost, barcode, stocks: [{ wid, value }]
    """
    url = f"{SALEWORK_BASE_URL.rstrip('/')}/product/list"
    headers = {
        "client-id": str(SALEWORK_CLIENT_ID).strip(),
        "token": (SALEWORK_TOKEN or "").strip(),
        "Content-Type": "application/json",
    }
    if not headers["client-id"] or not headers["token"]:
        return False, None, "SALEWORK_CLIENT_ID and SALEWORK_TOKEN must be set"

    def _response_detail(resp: requests.Response) -> str:
        try:
            payload = resp.json()
            if isinstance(payload, dict):
                msg = payload.get("message") or payload.get("error") or payload.get("detail")
                if msg:
                    return str(msg)
            text = (resp.text or "").strip()
            if text:
                return text[:300]
        except Exception:
            text = (getattr(resp, "text", "") or "").strip()
            if text:
                return text[:300]
        return "No response detail"

    body = None
    for attempt in range(2):
        try:
            r = requests.get(url, headers=headers, timeout=60)
            # Retry once for transient rate-limit / upstream errors.
            if r.status_code in (429, 500, 502, 503, 504) and attempt == 0:
                time.sleep(1.2)
                continue
            if not r.ok:
                return False, None, f"Salework HTTP {r.status_code}: {_response_detail(r)}"
            r.encoding = "utf-8"
            body = r.json()
            break
        except requests.RequestException as e:
            if attempt == 0:
                time.sleep(1.2)
                continue
            return False, None, str(e)
        except ValueError as e:
            return False, None, f"Invalid JSON: {e}"

    if body is None:
        return False, None, "Salework response is empty"

    if body.get("status") != "success":
        return False, None, body.get("message", "API returned non-success status")

    data = body.get("data")
    if not data or not isinstance(data, dict):
        return False, None, "Missing or invalid data in response"

    products = data.get("products")
    if products is None:
        data["products"] = {}
    elif not isinstance(products, dict):
        return False, None, "data.products must be an object"

    return True, data, None


def get_stock_total(item: dict) -> int:
    """Sum stock from item['stocks'] (list of { wid, value })."""
    total = 0
    for s in (item.get("stocks") or []):
        if isinstance(s, dict) and "value" in s:
            try:
                total += int(s["value"])
            except (TypeError, ValueError):
                pass
    return total
