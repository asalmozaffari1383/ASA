"""Conversation state machine storage (Part 4).

A simple in-memory, per-chat session store. The bot runs as a single async process,
so a dict is memory-safe (no cross-thread access). Each session holds the user's
current step plus the data cached so far (phone, form image bytes).
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class State(str, Enum):
    IDLE = "idle"
    WAITING_FOR_PHONE = "waiting_for_phone"
    WAITING_FOR_FORM_PHOTO = "waiting_for_form_photo"
    WAITING_FOR_RECEIPT_PHOTO = "waiting_for_receipt_photo"


@dataclass
class Session:
    state: State = State.IDLE
    phone: Optional[str] = None
    form_bytes: Optional[bytes] = None
    form_name: str = "form.jpg"


class SessionStore:
    """Keyed by chat id."""

    def __init__(self) -> None:
        self._sessions: dict[int, Session] = {}

    def get(self, chat_id: int) -> Session:
        return self._sessions.setdefault(chat_id, Session())

    def reset(self, chat_id: int) -> None:
        self._sessions[chat_id] = Session()
