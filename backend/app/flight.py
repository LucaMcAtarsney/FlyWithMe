from dataclasses import dataclass
import app.opensky as Opensky
from app.resolve import get_callsigns, icao_to_iata
import re
import sqlite3

# a live callsign we can turn back into a flight number: 3-letter airline ICAO
# prefix followed by a plain flight number, e.g. "BAW123".
_CALLSIGN_RE = re.compile(r"^([A-Z]{3})(\d{1,4})$")

@dataclass
class Flight:
    flight_number: str          # what the user typed, e.g. "BA123"
    callsign: str               # matched ICAO callsign, e.g. "BAW123"
    icao24: str                 # aircraft transponder address, e.g. "4ca7b5"
    lat: float | None           # degrees
    lon: float | None           # degrees
    altitude_m: float | None    # barometric altitude, metres
    heading: float | None       # true track, degrees clockwise from north
    velocity_ms: float | None   # ground speed, m/s
    on_ground: bool
    last_contact: int           # unix timestamp of last message

def _state_to_flight(state: list, flight_number: str) -> Flight:
    return Flight(
        flight_number=flight_number,
        callsign=state[1].strip(),
        icao24=state[0],
        lat=state[6],
        lon=state[5],
        altitude_m=state[7],
        heading=state[10],
        velocity_ms=state[9],
        on_ground=state[8],
        last_contact=state[4],
    )

def find_flight(flight_number: str, conn:sqlite3.Connection , tokens: Opensky.TokenManager) -> Flight | None:
    callsigns = get_callsigns(flight_number, conn)
    if not callsigns:
        return None

    states = Opensky.get_states(tokens.get())
    by_callsign = {s[1].strip(): s for s in states if s[1]}

    for callsign in callsigns:
        if callsign in by_callsign:
            return _state_to_flight(by_callsign[callsign], flight_number)

    return None

def list_live_flights(conn: sqlite3.Connection, tokens: Opensky.TokenManager, limit: int = 8) -> list[Flight]:
    """A spread of flights currently in the air that the user can click to track.

    Picks airborne aircraft whose callsign maps cleanly back to a flight number,
    so each item works with the same search flow. Prefers distinct airlines so the
    list looks varied, and returns full Flight objects so the frontend can track
    them directly without a second lookup.
    """
    states = Opensky.get_states(tokens.get())

    flights: list[Flight] = []
    seen_numbers: set[str] = set()
    seen_airlines: set[str] = set()

    for state in states:
        callsign = (state[1] or "").strip()
        lat, lon = state[6], state[5]
        on_ground = state[8]
        if on_ground or lat is None or lon is None:
            continue

        match = _CALLSIGN_RE.match(callsign)
        if not match:
            continue

        icao_prefix, number = match.group(1), match.group(2)
        iata = icao_to_iata(icao_prefix, conn)
        if iata is None:
            continue

        flight_number = iata + number.lstrip("0").zfill(1)
        if flight_number in seen_numbers or icao_prefix in seen_airlines:
            continue

        seen_numbers.add(flight_number)
        seen_airlines.add(icao_prefix)
        flights.append(_state_to_flight(state, flight_number))

        if len(flights) >= limit:
            break

    return flights

if __name__ == "__main__":
    from app.config import CLIENT_ID, CLIENT_SECRET
    from app.db import get_connection
    

    tokens = Opensky.TokenManager(CLIENT_ID, CLIENT_SECRET)
    conn = get_connection()
    print(find_flight("BA1",conn, tokens))




