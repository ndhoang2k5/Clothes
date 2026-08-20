"""
Compress / downscale product upload images so originals stay web-friendly.
Target: detail-page quality at ~2000px long edge, typically a few hundred KB.
"""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageOps

# Product detail zoom does not need camera-resolution masters.
DEFAULT_MAX_EDGE = 2000
DEFAULT_JPEG_QUALITY = 85
DEFAULT_WEBP_QUALITY = 82
# Skip rewrite if already small enough (bytes) and within max edge.
SKIP_UNDER_BYTES = 450_000


def _to_rgb(im: Image.Image, bg=(255, 255, 255)) -> Image.Image:
    if im.mode in ("RGBA", "LA"):
        background = Image.new("RGB", im.size, bg)
        alpha = im.split()[-1]
        background.paste(im.convert("RGBA"), mask=alpha)
        return background
    if im.mode == "P":
        if "transparency" in im.info:
            im = im.convert("RGBA")
            return _to_rgb(im, bg=bg)
        return im.convert("RGB")
    if im.mode != "RGB":
        return im.convert("RGB")
    return im


def _fit_max_edge(im: Image.Image, max_edge: int) -> Image.Image:
    w, h = im.size
    longest = max(w, h)
    if longest <= max_edge:
        return im
    scale = max_edge / float(longest)
    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
    return im.resize(new_size, Image.Resampling.LANCZOS)


def optimize_image_bytes(
    data: bytes,
    *,
    source_name: str = "upload.jpg",
    max_edge: int = DEFAULT_MAX_EDGE,
    jpeg_quality: int = DEFAULT_JPEG_QUALITY,
    prefer_webp: bool = False,
) -> tuple[bytes, str]:
    """
    Returns (optimized_bytes, extension_with_dot) e.g. (b'...', '.jpg').
    Animated GIF is returned unchanged with .gif.
    """
    ext = Path(source_name or "").suffix.lower()
    if ext == ".gif":
        # Keep animated GIFs as-is (Pillow would flatten).
        return data, ".gif"

    with Image.open(io.BytesIO(data)) as im:
        # Animated webp/gif
        n_frames = getattr(im, "n_frames", 1) or 1
        if n_frames > 1 and ext in {".gif", ".webp"}:
            return data, ext or ".gif"

        im = ImageOps.exif_transpose(im)
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = _fit_max_edge(im, max_edge)

        out = io.BytesIO()
        if prefer_webp:
            if has_alpha:
                im = im.convert("RGBA")
                im.save(out, format="WEBP", quality=DEFAULT_WEBP_QUALITY, method=4)
            else:
                im = _to_rgb(im)
                im.save(out, format="WEBP", quality=DEFAULT_WEBP_QUALITY, method=4)
            return out.getvalue(), ".webp"

        # Default: JPEG for photos (much smaller than PNG masters).
        im = _to_rgb(im)
        im.save(
            out,
            format="JPEG",
            quality=jpeg_quality,
            optimize=True,
            progressive=True,
        )
        return out.getvalue(), ".jpg"


def optimize_file_in_place(
    path: Path,
    *,
    max_edge: int = DEFAULT_MAX_EDGE,
    jpeg_quality: int = DEFAULT_JPEG_QUALITY,
    min_bytes: int = SKIP_UNDER_BYTES,
    force: bool = False,
) -> dict:
    """
    Recompress an existing upload in place (same path / extension).
    Returns stats dict: {path, before, after, saved, skipped, reason}.
    """
    path = Path(path)
    if not path.is_file():
        return {"path": str(path), "skipped": True, "reason": "missing"}

    before = path.stat().st_size
    ext = path.suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        return {"path": str(path), "before": before, "skipped": True, "reason": "unsupported"}

    # Quick skip: already small — still check dimensions below unless tiny.
    try:
        with Image.open(path) as im:
            n_frames = getattr(im, "n_frames", 1) or 1
            if n_frames > 1 and ext in {".gif", ".webp"}:
                return {"path": str(path), "before": before, "skipped": True, "reason": "animated"}
            im = ImageOps.exif_transpose(im)
            w, h = im.size
            needs_resize = max(w, h) > max_edge
            if not force and before <= min_bytes and not needs_resize:
                return {
                    "path": str(path),
                    "before": before,
                    "after": before,
                    "saved": 0,
                    "skipped": True,
                    "reason": "already_small",
                }

            has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
            im = _fit_max_edge(im, max_edge)

            tmp = path.with_suffix(path.suffix + ".opt.tmp")
            if ext in {".jpg", ".jpeg"}:
                _to_rgb(im).save(
                    tmp,
                    format="JPEG",
                    quality=jpeg_quality,
                    optimize=True,
                    progressive=True,
                )
            elif ext == ".webp":
                if has_alpha and not force:
                    im.convert("RGBA").save(tmp, format="WEBP", quality=DEFAULT_WEBP_QUALITY, method=4)
                else:
                    _to_rgb(im).save(tmp, format="WEBP", quality=DEFAULT_WEBP_QUALITY, method=4)
            else:  # png — flatten to JPEG when large / forced (product photos)
                if has_alpha and before < 1_500_000 and not force:
                    im.convert("RGBA").save(tmp, format="PNG", optimize=True)
                else:
                    jpg_path = path.with_suffix(".jpg")
                    jpg_tmp = jpg_path.with_suffix(".jpg.opt.tmp")
                    _to_rgb(im).save(
                        jpg_tmp,
                        format="JPEG",
                        quality=jpeg_quality,
                        optimize=True,
                        progressive=True,
                    )
                    after = jpg_tmp.stat().st_size
                    if after >= before and not needs_resize and not force:
                        jpg_tmp.unlink(missing_ok=True)
                        return {
                            "path": str(path),
                            "before": before,
                            "after": before,
                            "saved": 0,
                            "skipped": True,
                            "reason": "no_gain",
                        }
                    jpg_tmp.replace(jpg_path)
                    if jpg_path.resolve() != path.resolve():
                        path.unlink(missing_ok=True)
                    return {
                        "path": str(jpg_path),
                        "old_path": str(path),
                        "before": before,
                        "after": after,
                        "saved": before - after,
                        "skipped": False,
                        "reason": "png_to_jpg",
                        "size": f"{w}x{h}",
                    }

            after = tmp.stat().st_size
            # Never grow the file.
            if after >= before and not needs_resize:
                tmp.unlink(missing_ok=True)
                return {
                    "path": str(path),
                    "before": before,
                    "after": before,
                    "saved": 0,
                    "skipped": True,
                    "reason": "no_gain",
                }
            tmp.replace(path)
            return {
                "path": str(path),
                "before": before,
                "after": after,
                "saved": before - after,
                "skipped": False,
                "reason": "optimized",
                "size": f"{w}x{h}",
            }
    except Exception as e:
        return {"path": str(path), "before": before, "skipped": True, "reason": f"error:{e}"}
