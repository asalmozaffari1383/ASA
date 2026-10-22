import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import bale
from bale.error import InvalidToken, NetworkError

from bot import messages
from bot.main import handle_message, store
from bot.polling import PersistentUpdater, PollingCheckpoint


def incoming(update_id, text=messages.BTN_HELP):
    return {
        "update_id": update_id,
        "message": {
            "message_id": update_id, "date": 1792700000,
            "chat": {"id": 123, "type": "private"},
            "from": {"id": 123, "is_bot": False, "first_name": "Test"},
            "text": text,
        },
    }


class FakeTransport:
    def __init__(self, updates):
        self.pending = updates
        self.offsets = []

    async def get_updates(self, params):
        offset = params.payload.get("offset")
        self.offsets.append(offset)
        if offset is not None:
            self.pending = [item for item in self.pending if item["update_id"] >= offset]
        return SimpleNamespace(result=copy.deepcopy(self.pending))


class FakeBot(bale.Bot):
    pass


class PollingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.bot = FakeBot("test-token")
        self.bot.send_message = AsyncMock()
        self.transport = FakeTransport([incoming(42)])
        self.bot._http = self.transport
        store.reset(123)

    async def test_reproduces_library_replaying_unacknowledged_last_update(self):
        self.assertEqual(len(await self.bot.get_updates()), 1)
        self.assertEqual(await self.bot.get_updates(offset=42), [])
        self.assertEqual(len(self.transport.pending), 1)
        self.assertEqual(len(await self.bot.get_updates()), 1)

    async def test_help_reply_is_not_repeated_after_polling_or_restart(self):
        with PollingCheckpoint(self.directory.name) as checkpoint:
            updater = PersistentUpdater(self.bot, checkpoint, handle_message)
            await updater.poll_once()
            await updater.poll_once()
            self.assertEqual(checkpoint.next_offset, 43)
        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handle_message).poll_once()
        self.assertEqual(self.transport.offsets, [None, 43, 43])
        self.bot.send_message.assert_awaited_once_with(123, messages.HELP)

    async def test_restart_before_server_acknowledges_uses_saved_offset(self):
        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handle_message).poll_once()
        self.assertEqual(len(self.transport.pending), 1)
        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handle_message).poll_once()
        self.assertEqual(len(self.transport.pending), 0)
        self.assertEqual(self.bot.send_message.await_count, 1)

    async def test_consecutive_ids_and_identical_text_are_not_skipped(self):
        self.transport.pending = [incoming(43), incoming(42), incoming(42)]
        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handle_message).poll_once()
            self.assertEqual(checkpoint.next_offset, 44)
        self.assertEqual(self.bot.send_message.await_count, 2)

    async def test_network_recovery_reuses_offset_without_repeating_help(self):
        calls = 0

        async def fetch(params):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise NetworkError("temporary disconnect")
            payloads = [incoming(42)] if calls == 1 else [incoming(42), incoming(43)]
            return SimpleNamespace(result=payloads)

        self.bot._http = SimpleNamespace(get_updates=fetch)
        sleeps = []
        with PollingCheckpoint(self.directory.name) as checkpoint:
            updater = PersistentUpdater(self.bot, checkpoint, handle_message)
            updater.running = True

            async def pause(delay):
                sleeps.append(delay)
                if calls == 3:
                    updater.running = False

            with patch("bot.polling.asyncio.sleep", side_effect=pause):
                await updater._polling()
            self.assertEqual(checkpoint.next_offset, 44)
        self.assertEqual(self.bot.send_message.await_count, 2)
        self.assertEqual(sleeps, [1, 1, 1])

    async def test_invalid_token_is_not_silently_retried(self):
        self.bot._http = SimpleNamespace(get_updates=AsyncMock(side_effect=InvalidToken()))
        with PollingCheckpoint(self.directory.name) as checkpoint:
            updater = PersistentUpdater(self.bot, checkpoint, handle_message)
            updater.running = True
            with self.assertRaises(InvalidToken):
                await updater._polling()

    async def test_ignored_updates_are_acknowledged_without_sending_messages(self):
        self.transport.pending = [{"update_id": 42}]
        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handle_message).poll_once()
            self.assertEqual(checkpoint.next_offset, 43)
        self.bot.send_message.assert_not_awaited()

    async def test_same_chat_messages_complete_in_order(self):
        self.transport.pending = [incoming(42), incoming(43)]
        visited = []

        async def handler(bot, message):
            visited.append((message.message_id, "start"))
            import asyncio

            await asyncio.sleep(0)
            visited.append((message.message_id, "end"))

        with PollingCheckpoint(self.directory.name) as checkpoint:
            await PersistentUpdater(self.bot, checkpoint, handler).poll_once()
        self.assertEqual(visited, [(42, "start"), (42, "end"), (43, "start"), (43, "end")])


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)

    def test_second_poller_cannot_acquire_same_storage(self):
        with PollingCheckpoint(self.directory.name):
            with self.assertRaises(BlockingIOError):
                with PollingCheckpoint(self.directory.name):
                    pass

    def test_invalid_state_fails_closed_instead_of_replaying_history(self):
        Path(self.directory.name, "polling.json").write_text('{"next_offset": "invalid"}')
        with self.assertRaises(ValueError):
            with PollingCheckpoint(self.directory.name):
                pass

    def test_failed_disk_write_does_not_advance_or_destroy_checkpoint(self):
        with PollingCheckpoint(self.directory.name) as checkpoint:
            checkpoint.advance(43)
            with patch("bot.polling.os.replace", side_effect=OSError("disk unavailable")):
                with self.assertRaises(OSError):
                    checkpoint.advance(44)
            self.assertEqual(checkpoint.next_offset, 43)
        data = json.loads(Path(self.directory.name, "polling.json").read_text())
        self.assertEqual(data["next_offset"], 43)
