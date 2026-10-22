import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run with sudo python3 install.py")
    source = Path(__file__).resolve().parent
    project = Path("/opt/asa")
    if not (project / ".env").is_file() or not (project / "docker-compose.prod.yml").is_file():
        raise SystemExit("Expected the existing production site at /opt/asa.")
    manifest = json.loads((source / "manifest.json").read_text())
    for relative, digest in manifest.items():
        if Path(relative).is_absolute() or ".." in Path(relative).parts:
            raise SystemExit("Invalid bundle path")
        if hashlib.sha256((source / "payload" / relative).read_bytes()).hexdigest() != digest:
            raise SystemExit("Bundle integrity check failed")
    backup = Path("/var/backups/asa-bot-polling") / datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup.mkdir(parents=True, mode=0o700)
    os.chmod(backup.parent, 0o700)
    for relative in manifest:
        target = project / relative
        if target.is_file():
            saved = backup / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / "payload" / relative, target)
        os.chmod(target, 0o644)
    command = ["docker", "compose", "-f", "docker-compose.prod.yml", "-f", "docker-compose.bale.yml", "--profile", "bot"]
    print(f"Backup: {backup}", flush=True)
    subprocess.run(command + ["config", "--quiet"], cwd=project, check=True)
    build = command + ["build"]
    if os.environ.get("ASA_PIP_INDEX_URL"):
        build.extend(["--build-arg", "PIP_INDEX_URL=" + os.environ["ASA_PIP_INDEX_URL"]])
    subprocess.run(build + ["bot"], cwd=project, check=True)
    subprocess.run(command + ["up", "-d", "--no-deps", "--force-recreate", "bot"], cwd=project, check=True)
    for attempt in range(30):
        result = subprocess.run(command + ["logs", "--tail=30", "bot"], cwd=project, capture_output=True, text=True, check=True)
        if "Bot is ready and listening." in result.stdout + result.stderr:
            break
        time.sleep(2)
    else:
        raise SystemExit("Bot readiness is not confirmed. Check bot status and logs; do not delete bot_state.")
    subprocess.run(command + ["ps", "bot"], cwd=project, check=True)
    print("Polling fix installed. Send /start and Help in Bale, wait a few minutes, then send Help again.")
    print("A user message should produce one reply, and sending a new Help should still work.")


if __name__ == "__main__":
    main()
