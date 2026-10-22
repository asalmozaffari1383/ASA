# Bale bot deployment

Bot: [AsaengBot](https://ble.ir/AsaengBot).

The bot runs as a separate, optional Docker service using polling. It needs no
webhook, public port, or change to Nginx. Requests are submitted to the existing
website API and appear in the secretary panel with source `bale` and a tracking
code. The manager reviews payments using the existing financial workflow.

## Configuration

On the VPS, edit `/opt/asa/.env` and add the token received from Bale BotFather:

```dotenv
BALE_BOT_TOKEN=REPLACE_WITH_THE_REAL_TOKEN
BALE_BACKEND_API_URL=https://asaeng.org/api
```

Keep `.env` private and out of Git. Do not paste the token into shell command
arguments, screenshots, or logs. The bot uses the public HTTPS API, avoiding
internal Docker host names that production Django does not allow.

Sign in as the manager at `https://admin.asaeng.org`, then choose **تنظیمات بات**
(`/panel/ceo/bot-settings`). Set the advance amount in **rials**, account holder,
and at least one valid card, account number or Iranian IBAN. Review the values,
enter the current manager password, and confirm. The page also offers a preview
of the saved PDF and the latest 20 successful changes.

Only a CEO or superuser can use this API; financial permission alone is
insufficient. Every payment change requires the current password, locks after
five failed confirmations for 15 minutes, checks the previous version to avoid
overwriting concurrent edits, and records the actor and before/after values in
the database. Payment edits through the older financial settings API are blocked.
Creating/promoting a CEO or changing an existing CEO through user management also
requires password confirmation, preventing a stolen manager token from resetting
the manager password to bypass this check. The audit API is read-only. A server
or database administrator still has direct access; protect those credentials.

The backend preserves the official blank PDF layout in
`backend/apps/financials/assets/application_form.pdf` and removes its old printed
payment row before inserting the saved amount, destination and holder. If an
IBAN is supplied, it is printed; otherwise the card or account number is printed.
The bot caption lists all saved destinations. Each new request fetches both the
payment configuration and the PDF with the same version. A missing setting,
unavailable API/PDF or changed version stops collection without sending stale
payment instructions. There is no bundled static-form fallback in the bot.

After updating, rebuild the backend and run migrations before restarting the bot,
and build/deploy `frontend/dist` to make the settings page available. Updating the
bot alone is insufficient. Existing token, database and Nginx/TLS settings remain
in place. If the VPS uses `docker-compose.bale.yml`, include that overlay in
every Compose command as well.

## Start and verify

Run on the VPS:

```bash
cd /opt/asa
sudo chmod 600 .env
sudo docker compose -f docker-compose.prod.yml --profile bot up -d --build bot
sudo docker compose -f docker-compose.prod.yml --profile bot ps bot
sudo docker compose -f docker-compose.prod.yml --profile bot logs --tail=30 bot
```

Expect `Bot is ready and listening.`. Only run one polling instance for this
token. If a webhook was previously configured, remove it through Bale's official
API before polling; do not discard pending messages.

In Bale open `https://ble.ir/AsaengBot`, send `/start`, choose registration,
check the PDF and payment details, then submit a phone number and two images.
Check that the returned tracking code appears in the secretary panel. Use a real
authorized test request and remove it through the normal admin process if needed.

Conversation progress is held in memory. After a bot restart, customers partway
through the flow need to send `/start` again. Requests already saved in the
website database remain there.

## Polling and reconnects

The pinned Bale SDK keeps the last update ID only in memory and polls with that
ID rather than the next ID. Its filter hides that update locally without
acknowledging it on the server. After a network failure restarts the container,
the last message can be delivered again and produce a duplicate reply.

`bot/polling.py` replaces that polling path with ordered processing, the correct
next offset (`update_id + 1`), an atomic checkpoint in `/app/state/polling.json`,
and retries with backoff for temporary network failures. The `bot_state` Docker
volume preserves this checkpoint across container restarts and image rebuilds.
An exclusive lock prevents two pollers sharing this storage from running together.
Replayed IDs are ignored; a new message with identical text is still processed.
The private SDK transport is used because its public `get_updates` filters out
the update equal to the requested offset; keep the SDK pin and polling tests.

Include the committed `deploy/docker-compose.bale.yml` overlay if the server's
production Compose file does not define the bot volume. On the existing VPS the
overlay is installed as `/opt/asa/docker-compose.bale.yml`. Do not use `down -v`
or delete `bot_state` during an update: that would discard the checkpoint.

The checkpoint records completed handling; an abrupt kill between sending a
reply and saving the checkpoint can still cause replay. It is not an exactly-once
delivery guarantee. On the first upgrade from the old bot there is no saved
checkpoint, so an already queued legacy update may be seen once. Pending user
requests are not silently discarded during this migration.

## Tests

```bash
python -m pip install -r bot/requirements.txt
python -m unittest discover -s bot/tests -v
```
