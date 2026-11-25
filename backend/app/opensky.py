from dotenv import load_dotenv
import httpx
import os
import time

TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
ROOT_URL = "https://opensky-network.org/api"

class TokenManager:
    def __init__(self, client_id: str, client_secret: str, margin: int = 60):
        self.client_id = client_id
        self.client_secret = client_secret
        self.margin = margin
        self._token = None
        self._expires_at = 0.0

    def _fetch(self) -> None:
        print("fetching...")
        r = httpx.post(TOKEN_URL, data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                    timeout=10.0
                )

        # raises exception if error
        r.raise_for_status()

        data = r.json()
        self._token = data["access_token"]
        self._expires_at = time.monotonic() + data["expires_in"]

    def get(self) -> str:
        if self._token is None or time.monotonic() > self._expires_at - self.margin:
            self._fetch()

        return self._token


# /states/all returns ~11k rows and costs OpenSky credits, and both the live-list
# and search paths call it. Cache the last response briefly so repeated calls in a
# demo are fast and cheap.
STATES_TTL = 15.0
_states_cache: tuple[float, list[list]] | None = None

def get_states(token: str) -> list[list]:
    global _states_cache
    now = time.monotonic()
    if _states_cache is not None and now - _states_cache[0] < STATES_TTL:
        return _states_cache[1]

    GET_STATES = ROOT_URL + "/states/all"
    r = httpx.get(
        GET_STATES,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10.0)

    r.raise_for_status()
    states = r.json()["states"] or []
    _states_cache = (now, states)
    return states