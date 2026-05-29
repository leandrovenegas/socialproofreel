"""
render_remotion.py — SocialProofREEL Worker
===========================================
REMOTION RENDERER: Reads metadata.json from /app/videos_locales/{id}/,
fetches the latest visual config from Supabase 'settings' table,
generates a temporary props.json, runs 'npx remotion render' to compile the video,
and overlays the background audio using FFmpeg.

TEST (standalone):
  docker run --rm -v "$(pwd):/app" --env-file .env socialproof-worker \
    python render_remotion.py /app/videos_locales/{business_id}
"""

import os
import sys
import json
import time
import subprocess
import hashlib
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_TEMP_DIR = os.path.join(BASE_DIR, "videos_locales")
# Use /opt/remotion_engine inside Docker to avoid Samba symlink issues with node_modules
REMOTION_DIR = "/opt/remotion_engine" if os.path.exists("/opt/remotion_engine") else os.path.join(BASE_DIR, "remotion_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

def get_image_base64(path: str) -> str | None:
    """Reads an image file and converts it to a base64 Data URL."""
    if not path or not os.path.exists(path):
        return None
    import base64
    try:
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
            mime_type = "image/jpeg"
            if path.lower().endswith(".png"):
                mime_type = "image/png"
            elif path.lower().endswith(".webp"):
                mime_type = "image/webp"
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"[REMOTION-RENDER] Error encoding image to base64: {e}")
        return None

def normalize_supabase_config(raw: dict, default: dict) -> dict:
    """
    Translates the Supabase settings schema into the VideoTemplateConfig schema
    that Remotion expects. Handles both formats:
      - Flat (saved by EditorSidebar): { primary_color, blur_level, font_family, layout }
      - Nested (legacy):               { colors: { primary }, layout: { alignment }, ... }
    Unknown keys are ignored; missing keys fall back to defaults.
    """
    merged = {**default}

    # ── Flat format (EditorSidebar) ──
    if "primary_color" in raw:
        merged["primary_color"] = raw["primary_color"]
    if "blur_level" in raw:
        merged["blur_level"] = raw["blur_level"]
    if "font_family" in raw:
        merged["font_family"] = raw["font_family"]
    if "layout" in raw and isinstance(raw["layout"], str):
        cap = raw["layout"].capitalize()
        if cap in ("Top", "Center", "Bottom"):
            merged["layout"] = cap

    # ── Nested format (legacy) ──
    colors = raw.get("colors", {})
    if colors.get("primary"):
        merged["primary_color"] = colors["primary"]

    layout_raw = raw.get("layout", {})
    if isinstance(layout_raw, dict):
        alignment = layout_raw.get("alignment", "").capitalize()
        if alignment in ("Top", "Center", "Bottom"):
            merged["layout"] = alignment

    typography = raw.get("typography", {})
    if typography.get("family"):
        merged["font_family"] = typography["family"]
    if typography.get("size"):
        merged["review_text_size"] = int(typography["size"])

    # effects.blur -> blur_level
    # All other effects keys are ignored (overlay_darkness has no equivalent)
    effects_raw = raw.get("effects", {})
    if "blur" in effects_raw:
        merged["blur_level"] = effects_raw["blur"]

    return merged

def get_latest_config() -> dict:
    """Fetches the latest config from the Supabase 'settings' table."""
    default_config = {
        "primary_color": "#4285F4",
        "blur_level": 10,
        "font_family": "'Roboto', sans-serif",
        "layout": "Center",
        "avatar_size": 140,
        "review_text_size": 34,
        "reviewer_name_size": 30,
        "component_order": [
            {"id": "avatar", "label": "Avatar", "visible": True},
            {"id": "stars", "label": "Estrellas", "visible": True},
            {"id": "review_text", "label": "Texto de Reseña", "visible": True},
            {"id": "reviewer_name", "label": "Nombre del Autor", "visible": True}
        ],
        "business_name": {
            "visible": True,
            "show_rating": True,
            "text_size": 52,
            "rating_text_size": 32
        },
        "effects": {
            "fade_in_duration": 20,
            "card_slide_distance": 60,
            "card_damping": 14,
            "stars_initial_scale": 0.3,
            "stars_damping": 10,
            "stagger_delay": 5
        }
    }

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[REMOTION-RENDER] Supabase credentials not found in env. Using default config.")
        return default_config

    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        response = supabase.table("settings").select("config").order("id", desc=True).limit(1).execute()
        rows = response.data
        if rows and "config" in rows[0] and rows[0]["config"]:
            print(f"[REMOTION-RENDER] Loaded config from Supabase settings: {rows[0]['config']}")
            merged = normalize_supabase_config(rows[0]["config"], default_config)
            return merged
        else:
            print("[REMOTION-RENDER] Settings table is empty. Using default config.")
            return default_config
    except Exception as e:
        print(f"[REMOTION-RENDER] Error fetching config from Supabase: {e}. Using default config.")
        return default_config

def render_lead_remotion(lead_dir: str) -> str | None:
    """
    Renders the video for the given lead directory using Remotion.
    """
    metadata_path = os.path.join(lead_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"[REMOTION-RENDER] metadata.json not found in {lead_dir}")
        return None

    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    business_id = meta["business_id"]
    business_name = meta.get("business_name", "Negocio")
    
    # Convert background and avatars to base64 to completely avoid CORS/Local file protocol/Samba symlink limitations
    bg_local = meta.get("background_local_path")
    if bg_local:
        if not os.path.isabs(bg_local):
            bg_local = os.path.join(BASE_DIR, bg_local)
        meta["background_base64"] = get_image_base64(bg_local)
        
    for r in meta.get("reviews", []):
        avatar_local = r.get("avatar_local_path")
        if avatar_local:
            if not os.path.isabs(avatar_local):
                avatar_local = os.path.join(BASE_DIR, avatar_local)
            r["avatar_base64"] = get_image_base64(avatar_local)

    # 1. Fetch visual config
    config = get_latest_config()

    # 2. Prepare combined props for Remotion
    props = {
        "config": config,
        "metadata": meta
    }

    props_path = os.path.join(lead_dir, "props.json")
    with open(props_path, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=4)

    print(f"[REMOTION-RENDER] Combined props (with base64 assets) written to {props_path}")

    # 3. Define temporary silent video path
    silent_video_path = os.path.join(lead_dir, "silent_render.mp4")

    # 4. Invoke Remotion CLI to render silent video
    cmd = [
        "npx", "remotion", "render",
        "src/index.ts",
        "SocialProofVideo",
        silent_video_path,
        f"--props={props_path}"
    ]

    print(f"[REMOTION-RENDER] Invoking Remotion: {' '.join(cmd)}")
    start_time = time.time()
    
    result = subprocess.run(cmd, cwd=REMOTION_DIR, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"[REMOTION-RENDER] X Remotion compilation failed:\n{result.stderr}")
        return None

    duration = round(time.time() - start_time, 2)
    print(f"[REMOTION-RENDER] ✓ Silent video compiled by Remotion in {duration}s")

    # 5. Determine audio file path
    audio_path = os.path.join(lead_dir, "audio.mp3")
    if not os.path.exists(audio_path):
        audio_path = os.path.join(BASE_DIR, "audio.mp3")
        if not os.path.exists(audio_path):
            audio_path = None

    # Determine final video path with versioning
    version = 1
    while True:
        final_path = os.path.join(lead_dir, f"video_v{version}.mp4")
        if not os.path.exists(final_path):
            break
        version += 1

    # 6. Overlay audio if available
    if audio_path and os.path.exists(audio_path):
        print(f"[REMOTION-RENDER] Muxing background audio: {audio_path}...")
        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", silent_video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            final_path
        ]
        
        ffmpeg_result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if ffmpeg_result.returncode != 0:
            print(f"[REMOTION-RENDER] X FFmpeg audio muxing failed:\n{ffmpeg_result.stderr}")
            os.rename(silent_video_path, final_path)
            print(f"[REMOTION-RENDER] ✓ Final silent video (fallback): {final_path}")
        else:
            print(f"[REMOTION-RENDER] ✓ Video with audio successfully created: {final_path}")
            try:
                os.remove(silent_video_path)
            except OSError:
                pass
    else:
        os.rename(silent_video_path, final_path)
        print(f"[REMOTION-RENDER] ✓ Final silent video: {final_path}")

    # Cleanup props.json
    try:
        os.remove(props_path)
    except OSError:
        pass

    return final_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python render_remotion.py <business_name_or_folder_path>")
        sys.exit(1)

    arg = sys.argv[1]
    if os.path.isdir(arg) and os.path.exists(os.path.join(arg, "metadata.json")):
        lead_dir = arg
    else:
        business_id = hashlib.md5(arg.encode("utf-8")).hexdigest()
        lead_dir = os.path.join(BASE_TEMP_DIR, business_id)

    if not os.path.exists(lead_dir):
        print(f"[CLI] Error: Directory not found: {lead_dir}")
        sys.exit(1)

    result_path = render_lead_remotion(lead_dir)
    if not result_path:
        print("[CLI] Remotion Render failed.")
        sys.exit(1)
    
    print(f"\n[CLI] Video ready: {result_path}")
