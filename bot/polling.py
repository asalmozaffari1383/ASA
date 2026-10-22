import asyncio
import fcntl
import json
import logging
import os
from pathlib import Path
import tempfile

import bale
from bale.error import BaleError, InvalidToken
from bale.request.params import handle_request_param


logger = logging.getLogger("asa.bot.polling")


class PollingCheckpoint:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.path = self.directory / "polling.json"
        self.next_offset = None
        self._lock = None

    def __enter__(self):
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._lock = (self.directory / "polling.lock").open("a")
        try:
            fcntl.flock(self._lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if self.path.exists():
                data = json.loads(self.path.read_text())
                offset = data["next_offset"]
                if type(offset) is not int or offset < 0:
                    raise ValueError("Invalid polling checkpoint")
                self.next_offset = offset
        except Exception:
            self._lock.close()
            self._lock = None
            raise
        return self

    def __exit__(self, *arguments):
        self._lock.close()
        self._lock = None

    def advance(self, offset):
        if self._lock is None:
            raise RuntimeError("Polling checkpoint must be locked")
        if self.next_offset is not None and offset <= self.next_offset:
            return
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", dir=self.directory, prefix="polling-", delete=False) as output:
                temporary = Path(output.name)
                json.dump({"next_offset": offset}, output)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, self.path)
            self.next_offset = offset
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)


class PersistentUpdater(bale.Updater):
    def __init__(self, bot, checkpoint, message_handler):
        super().__init__(bot)
        self.checkpoint = checkpoint
        self.message_handler = message_handler

    async def poll_once(self):
        parameters = handle_request_param({
            "offset": self.checkpoint.next_offset,
            "limit": 100,
            "timeout": 25,
        })
        response = await self.bot._http.get_updates(params=parameters)
        for payload in sorted(response.result or [], key=lambda item: int(item["update_id"])):
            update_id = int(payload["update_id"])
            if self.checkpoint.next_offset is not None and update_id < self.checkpoint.next_offset:
                continue
            update = bale.Update.from_dict(payload, self.bot)
            if update.message:
                await self.message_handler(self.bot, update.message)
            self.checkpoint.advance(update_id + 1)

    async def _polling(self):
        delay = 1
        while self.running:
            try:
                await self.poll_once()
            except InvalidToken:
                raise
            except (BaleError, asyncio.TimeoutError) as error:
                logger.warning("Bale polling interrupted (%s); retrying in %s seconds.", type(error).__name__, delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
            else:
                delay = 1
                await asyncio.sleep(1)
