from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import CLIENT_ID, CLIENT_SECRET, ALLOWED_ORIGINS
from app.opensky import TokenManager
from app.db import get_connection
from app.flight import Flight, find_flight, list_live_flights
import sqlite3

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.tokens = TokenManager(CLIENT_ID, CLIENT_SECRET)
    print("startup: TokenManager created",flush=True)
    yield
    print("shutdown")

app = FastAPI(title="flywithme", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

def get_tokens(request: Request) -> TokenManager:
    return request.app.state.tokens

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/airlines/count")
def airline_count(conn: sqlite3.Connection = Depends(get_db)):
    row = conn.execute("SELECT COUNT(*) AS n FROM airlines").fetchone()
    return {"airlines": row["n"]}

@app.get("/api/flights/live")
def flights_live(
    limit: int = 8,
    conn: sqlite3.Connection = Depends(get_db),
    tokens: TokenManager = Depends(get_tokens),
) -> list[Flight]:
    return list_live_flights(conn, tokens, limit=limit)

@app.get("/api/flight/{flight_number}")
def get_flight(
    flight_number: str,
    conn: sqlite3.Connection = Depends(get_db),
    tokens: TokenManager = Depends(get_tokens),
) -> Flight:
    flight = find_flight(flight_number, conn, tokens)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_number} not found")
    return flight