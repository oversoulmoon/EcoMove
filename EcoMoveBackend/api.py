import io
import os
from typing import List, Dict, Any
import base64
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from PIL import Image, ImageOps
import torch
from ultralytics import YOLO

MODEL_PATH = os.getenv("YOLO_WEIGHTS", "./best.pt")
CONF_THRES = float(os.getenv("CONF_THRES", 0.25))
IOU_THRES  = float(os.getenv("IOU_THRES", 0.45))
IMG_SIZE   = int(os.getenv("IMG_SIZE", 640))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "posts.json")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp", "heic", "heif"}
app = Flask(__name__)
CORS(app)  

os.makedirs(UPLOAD_DIR, exist_ok=True)

def _init_db():
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump({"next_id": 1, "posts": []}, f, indent=2)
_init_db()
def _load_db() -> Dict[str, Any]:
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_db(db: Dict[str, Any]) -> None:
    tmp = DB_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    os.replace(tmp, DB_PATH)  


def save_image(file_storage) -> str | None:
    if not file_storage or not file_storage.filename:
        return None
    ext = file_storage.filename.rsplit(".", 1)[-1].lower() if "." in file_storage.filename else ""
    if ext not in ALLOWED_IMAGE_EXT:
        abort(400, description="Unsupported image type.")
    base = secure_filename(file_storage.filename.rsplit(".", 1)[0])
    filename = f"{base}-{uuid.uuid4().hex[:8]}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    file_storage.save(path)
    return f"/uploads/{filename}"

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

device = "cuda" if torch.cuda.is_available() else "cpu"
model = YOLO(MODEL_PATH)
model.to(device)
names = model.names if hasattr(model, "names") else {}

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

def pil_from_bytes(b: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(b))
    img = ImageOps.exif_transpose(img) 
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img

@app.route("/health", methods=["GET"])
def health() -> Any:
    return {"status": "ok", "device": device, "model": os.path.basename(MODEL_PATH)}

@app.route("/detect", methods=["POST"])
def detect() -> Any:
    if "file" not in request.files:
        return jsonify({"error": "missing file field"}), 400

    f = request.files["file"]
    raw = f.read()
    if not raw:
        return jsonify({"error": "empty file"}), 400

    try:
        pil_img = pil_from_bytes(raw)
    except Exception as e:
        return jsonify({"error": f"cannot open image: {e}"}), 400

    w, h = pil_img.size

    with torch.inference_mode():
        results = model.predict(
            pil_img,
            imgsz=IMG_SIZE,
            conf=CONF_THRES,
            iou=IOU_THRES,
            device=0 if device == "cuda" else None,
            verbose=False,
        )
    r = results[0]
    boxes_out: List[Dict[str, Any]] = []
    if r.boxes is not None and len(r.boxes) > 0:
        xyxy = r.boxes.xyxy.cpu().numpy()     
        conf = r.boxes.conf.cpu().numpy()     
        cls  = r.boxes.cls.cpu().numpy().astype(int)  
        for (x1, y1, x2, y2), c, k in zip(xyxy, conf, cls):
            boxes_out.append({
                "x1": float(x1 / w),
                "y1": float(y1 / h),
                "x2": float(x2 / w),
                "y2": float(y2 / h),
                "confidence": float(c),
                "label": str(names.get(k, str(k))),
                "class_id": int(k),
            })

    return jsonify({"width": w, "height": h, "boxes": boxes_out})
@app.route("/detect_image", methods=["POST"])
def detect_annotated() -> Any:
    if "file" not in request.files:
        return jsonify({"error": "missing file field"}), 400

    f = request.files["file"]
    raw = f.read()
    if not raw:
        return jsonify({"error": "empty file"}), 400

    try:
        pil_img = pil_from_bytes(raw)
    except Exception as e:
        return jsonify({"error": f"cannot open image: {e}"}), 400

    w, h = pil_img.size
    with torch.inference_mode():
        results = model.predict(
            pil_img,
            imgsz=IMG_SIZE,
            conf=CONF_THRES,
            iou=IOU_THRES,
            device=0 if device == "cuda" else None,
            verbose=False,
        )
    r = results[0]

    boxes_out: List[Dict[str, Any]] = []
    if r.boxes is not None and len(r.boxes) > 0:
        xyxy = r.boxes.xyxy.cpu().numpy()
        conf = r.boxes.conf.cpu().numpy()
        cls  = r.boxes.cls.cpu().numpy().astype(int)
        for (x1, y1, x2, y2), c, k in zip(xyxy, conf, cls):
            boxes_out.append({
                "x1": float(x1 / w),
                "y1": float(y1 / h),
                "x2": float(x2 / w),
                "y2": float(y2 / h),
                "confidence": float(c),
                "label": str(names.get(k, str(k))),
                "class_id": int(k),
            })

    plot_kwargs = {}
    lw = request.args.get("lw")
    if lw:
        try: plot_kwargs["line_width"] = int(lw)
        except: pass
    labels = request.args.get("labels", "1") != "0"
    conf_flag = request.args.get("conf", "1") != "0"
    plot_kwargs["labels"] = labels
    plot_kwargs["conf"] = conf_flag

    annotated_bgr = r.plot(**plot_kwargs)
    annotated_rgb = annotated_bgr[:, :, ::-1]
    out_img = Image.fromarray(annotated_rgb)

    fmt = request.args.get("format", "jpeg").lower()
    quality = max(1, min(100, int(request.args.get("quality", "90")))) if fmt in ("jpg","jpeg") else None

    buf = io.BytesIO()
    if fmt in ("jpg","jpeg"):
        out_img.save(buf, format="JPEG", quality=quality or 90)
        mime = "image/jpeg"
    else:
        out_img.save(buf, format="PNG")
        mime = "image/png"
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("ascii")
    data_uri = f"data:{mime};base64,{b64}"

    return jsonify({
        "width": w,
        "height": h,
        "boxes": boxes_out,
        "image": data_uri,
        "mime": mime,
    })

@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.get("/posts")
def list_posts():
    db = _load_db()
    posts = sorted(db["posts"], key=lambda p: p.get("created_at", ""), reverse=True)
    return jsonify(posts)

@app.get("/posts/<int:pid>")
def get_post(pid: int):
    db = _load_db()
    for p in db["posts"]:
        if p["id"] == pid:
            return jsonify(p)
    abort(404, description="Post not found")

@app.post("/posts")
def create_post():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        form = request.form
        title = (form.get("title") or "").strip()
        description = (form.get("description") or "").strip()
        location = (form.get("location") or "").strip()
        phone = (form.get("phone") or "").strip()
        photo_url = save_image(request.files.get("photo")) if "photo" in request.files else (form.get("photo_url") or "").strip() or None
    else:
        data = request.get_json(silent=True) or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        location = (data.get("location") or "").strip()
        phone = (data.get("phone") or "").strip()
        photo_url = (data.get("photo_url") or "").strip() or None

    missing = [k for k, v in {"title": title, "description": description, "location": location, "phone": phone}.items() if not v]
    if missing:
        abort(400, description=f"Missing fields: {', '.join(missing)}")

    db = _load_db()
    pid = db["next_id"]
    db["next_id"] += 1

    post = {
        "id": pid,
        "title": title,
        "description": description,
        "location": location,
        "phone": phone,
        "photo_url": photo_url,
        "created_at": now_iso(),
    }
    db["posts"].append(post)
    _save_db(db)

    if post["photo_url"] and post["photo_url"].startswith("/"):
        post = {**post, "photo_url": request.host_url.rstrip("/") + post["photo_url"]}

    return jsonify(post), 201
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
