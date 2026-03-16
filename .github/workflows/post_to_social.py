"""
post-to-social.py
Triggered by GitHub Actions when a new Patreon post is published.
Posts to Facebook Page and Instagram Business Account via Meta Graph API v21.
"""

import os
import sys
import requests
import logging

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ── Config (injected via GitHub Actions secrets / env) ───────────────────────
FB_PAGE_ID    = os.environ["FB_PAGE_ID"]
FB_TOKEN      = os.environ["FB_ACCESS_TOKEN"]
IG_USER_ID    = os.environ.get("IG_USER_ID", "")
POST_TITLE    = os.environ.get("POST_TITLE", "New post on Patreon!")
POST_URL      = os.environ.get("POST_URL", "")
POST_IMAGE    = os.environ.get("POST_IMAGE", "")   # must be a public URL

GRAPH_VERSION = "v21.0"
GRAPH_BASE    = f"https://graph.facebook.com/{GRAPH_VERSION}"

# ── Message ───────────────────────────────────────────────────────────────────
message = f"🆕 {POST_TITLE}\n\nRead it on Patreon 👇\n{POST_URL}"

errors = []  # collect all errors, report at end


# ── Facebook ──────────────────────────────────────────────────────────────────
def post_to_facebook():
    log.info("Posting to Facebook Page %s …", FB_PAGE_ID)
    url  = f"{GRAPH_BASE}/{FB_PAGE_ID}/feed"
    data = {"message": message, "access_token": FB_TOKEN}

    # Include link preview if we have a URL
    if POST_URL:
        data["link"] = POST_URL

    resp = requests.post(url, data=data, timeout=30)
    body = resp.json()

    if resp.ok and "id" in body:
        log.info("✅ Facebook post created: %s", body["id"])
    else:
        err = body.get("error", body)
        log.error("❌ Facebook post FAILED: %s", err)
        errors.append(f"Facebook: {err}")


# ── Instagram ─────────────────────────────────────────────────────────────────
def post_to_instagram():
    if not IG_USER_ID:
        log.warning("IG_USER_ID not set — skipping Instagram.")
        return

    log.info("Posting to Instagram account %s …", IG_USER_ID)

    # Build media container payload
    media_data = {
        "caption": message,
        "access_token": FB_TOKEN,
    }

    if POST_IMAGE:
        # Image post
        media_data["image_url"] = POST_IMAGE
        media_data["media_type"] = "IMAGE"
    else:
        # Text / link post via REELS is not supported;
        # fall back to a plain caption-only container (story/reel not needed).
        # Instagram requires an image or video — log a warning and skip.
        log.warning(
            "No POST_IMAGE provided — Instagram requires an image. "
            "Skipping Instagram post. Supply a public image URL to enable IG posting."
        )
        return

    # Step 1 — Create media container
    container_url = f"{GRAPH_BASE}/{IG_USER_ID}/media"
    container_resp = requests.post(container_url, data=media_data, timeout=30)
    container_body = container_resp.json()

    if not container_resp.ok or "id" not in container_body:
        err = container_body.get("error", container_body)
        log.error("❌ Instagram container creation FAILED: %s", err)
        errors.append(f"Instagram container: {err}")
        return

    creation_id = container_body["id"]
    log.info("Instagram container created: %s", creation_id)

    # Step 2 — Publish container
    publish_url  = f"{GRAPH_BASE}/{IG_USER_ID}/media_publish"
    publish_resp = requests.post(
        publish_url,
        data={"creation_id": creation_id, "access_token": FB_TOKEN},
        timeout=30,
    )
    publish_body = publish_resp.json()

    if publish_resp.ok and "id" in publish_body:
        log.info("✅ Instagram post published: %s", publish_body["id"])
    else:
        err = publish_body.get("error", publish_body)
        log.error("❌ Instagram publish FAILED: %s", err)
        errors.append(f"Instagram publish: {err}")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info("=== BCP Social Post ===")
    log.info("Title : %s", POST_TITLE)
    log.info("URL   : %s", POST_URL)
    log.info("Image : %s", POST_IMAGE or "(none)")

    post_to_facebook()
    post_to_instagram()

    if errors:
        log.error("Completed with %d error(s):", len(errors))
        for e in errors:
            log.error("  • %s", e)
        sys.exit(1)   # fail the GitHub Action so you get a notification
    else:
        log.info("All done — no errors.")
        sys.exit(0)
