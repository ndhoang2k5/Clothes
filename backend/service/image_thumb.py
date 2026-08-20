"""
On-demand image thumbnails for list/card views.
Caches resized WebP under backend/static/cache/thumbs/{width}/uploads/...
Stable paths (no content-hash) so the frontend can hit /static/cache/... directly.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse, Response

_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
_UPLOADS_DIR = _STATIC_DIR / "uploads"
_CACHE_DIR = _STATIC_DIR / "cache" / "thumbs"

# Card grid ~ half phone / quarter desktop; 480 covers 2x DPR for ~240 CSS px
ALLOWED_WIDTHS = {240, 320, 480, 640, 800, 960}


def _safe_upload_rel(path: str) -> str:
    raw = str(path or "").strip().lstrip("/")
    if raw.startswith("static/"):
        raw = raw[len("static/") :]
    if not raw.startswith("uploads/"):
        raise HTTPException(status_code=400, detail="path must be under uploads/")
    parts = Path(raw).parts
    if ".." in parts:
        raise HTTPException(status_code=400, detail="invalid path")
    return "/".join(parts)


def _source_file(rel: str) -> Path:
    fp = (_STATIC_DIR / rel).resolve()
    uploads_root = _UPLOADS_DIR.resolve()
    if not str(fp).startswith(str(uploads_root) + os.sep) and fp != uploads_root:
        raise HTTPException(status_code=400, detail="invalid path")
    if not fp.is_file():
        raise HTTPException(status_code=404, detail="image not found")
    return fp


def _cache_file(rel: str, width: int) -> Path:
    """Stable path: uploads/a/b.jpg -> thumbs/{w}/uploads/a/b.webp"""
    rel_path = Path(rel)
    out_dir = _CACHE_DIR / str(width) / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / f"{rel_path.stem}.webp"


def static_thumb_rel(uploads_rel: str, width: int) -> str | None:
    """
    Relative URL under /static/ for a cached thumb, if present and fresh.
    e.g. cache/thumbs/320/uploads/abc.webp
    """
    try:
        rel = _safe_upload_rel(uploads_rel)
        width = int(width)
        if width not in ALLOWED_WIDTHS:
            return None
        src = _source_file(rel)
        dest = _cache_file(rel, width)
        if dest.is_file() and dest.stat().st_size > 0 and dest.stat().st_mtime_ns >= src.stat().st_mtime_ns:
            return dest.relative_to(_STATIC_DIR).as_posix()
    except Exception:
        return None
    return None


def ensure_thumb(rel_path: str, width: int = 480) -> Path:
    width = int(width)
    if width not in ALLOWED_WIDTHS:
        raise HTTPException(status_code=400, detail=f"width must be one of {sorted(ALLOWED_WIDTHS)}")
    rel = _safe_upload_rel(rel_path)
    src = _source_file(rel)
    dest = _cache_file(rel, width)
    if dest.is_file() and dest.stat().st_size > 0 and dest.stat().st_mtime_ns >= src.stat().st_mtime_ns:
        return dest

    try:
        from PIL import Image, ImageOps
    except ImportError as e:
        raise HTTPException(status_code=500, detail="Pillow is not installed") from e

    with Image.open(src) as im:
        # Cheap partial decode for huge JPEGs (common 10–16MB camera uploads).
        if getattr(im, "format", None) == "JPEG" and im.size[0] > width:
            target_h = max(1, int(round(im.size[1] * (width / float(im.size[0])))))
            try:
                im.draft("RGB", (width, target_h))
            except Exception:
                pass

        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "LA"):
            background = Image.new("RGB", im.size, (248, 243, 236))
            alpha = im.split()[-1]
            background.paste(im.convert("RGBA"), mask=alpha)
            im = background
        elif im.mode != "RGB":
            im = im.convert("RGB")

        w, h = im.size
        if w > width:
            new_h = max(1, int(round(h * (width / float(w)))))
            im = im.resize((width, new_h), Image.Resampling.LANCZOS)

        tmp = dest.with_suffix(dest.suffix + ".tmp")
        # quality 82 + LANCZOS: sắc trên Retina; method=4 cân bằng tốc độ/chất lượng.
        im.save(tmp, format="WEBP", quality=82, method=4)
        tmp.replace(dest)
    return dest


def thumb_response(rel_path: str, width: int = 480) -> Response:
    dest = ensure_thumb(rel_path, width)
    return FileResponse(
        path=str(dest),
        media_type="image/webp",
        headers={
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        },
    )


def warm_product_thumbs(image_urls: list[str], widths: tuple[int, ...] = (320, 480)) -> int:
    """Best-effort pre-generate thumbs. Returns number of thumbs ensured."""
    ok = 0
    for url in image_urls:
        raw = str(url or "").strip()
        if not raw:
            continue
        # Accept /static/uploads/..., uploads/..., or absolute URLs ending in /static/uploads/...
        idx = raw.find("/static/uploads/")
        if idx >= 0:
            rel = raw[idx + len("/static/") :]
        elif raw.startswith("uploads/"):
            rel = raw
        elif "/uploads/" in raw:
            rel = "uploads/" + raw.split("/uploads/", 1)[1].split("?", 1)[0]
        else:
            continue
        rel = rel.split("?", 1)[0]
        for w in widths:
            try:
                ensure_thumb(rel, w)
                ok += 1
            except Exception:
                continue
    return ok
