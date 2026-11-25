from dotenv import load_dotenv
import os

load_dotenv()

CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET = os.environ["CLIENT_SECRET"]

# Comma-separated list of origins allowed to call the API directly. In production
# the Vercel rewrite keeps calls same-origin, so this is a safety net; defaults
# cover the deployed frontend and local Vite dev server.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://flywithme.pentgon.com,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

