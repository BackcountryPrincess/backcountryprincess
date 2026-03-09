import os
import requests

FB_PAGE_ID = os.environ["FB_PAGE_ID"]
FB_TOKEN = os.environ["FB_ACCESS_TOKEN"]
IG_USER_ID = os.environ["IG_USER_ID"]
title = os.environ.get("POST_TITLE", "New post on Patreon!")
url = os.environ.get("POST_URL", "")
image = os.environ.get("POST_IMAGE", "")

message = f"🆕 {title}\n\nRead it on Patreon 👇\n{url}"

# --- Facebook ---
fb_url = f"https://graph.facebook.com/v19.0/{FB_PAGE_ID}/feed"
requests.post(fb_url, data={"message": message, "access_token": FB_TOKEN})

# --- Instagram (requires publicly accessible image URL) ---
if image:
    ig_media_url = f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media"
    media = requests.post(ig_media_url, data={
        "image_url": image,
        "caption": message,
        "access_token": FB_TOKEN
    }).json()
    
    if "id" in media:
        ig_publish_url = f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media_publish"
        requests.post(ig_publish_url, data={
            "creation_id": media["id"],
            "access_token": FB_TOKEN
        })
