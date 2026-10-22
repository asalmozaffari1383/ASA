import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request


def run(arguments, project, **kwargs):
    return subprocess.run(arguments, cwd=project, check=True, **kwargs)


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run with sudo python3 install.py")
    source = Path(__file__).resolve().parent
    project = Path("/opt/asa")
    environment = project / ".env"
    if not environment.is_file() or not (project / "docker-compose.prod.yml").is_file():
        raise SystemExit("Expected the existing production site at /opt/asa.")
    manifest = json.loads((source / "manifest.json").read_text())
    for relative, digest in manifest.items():
        candidate = source / "payload" / relative
        if Path(relative).is_absolute() or ".." in Path(relative).parts:
            raise SystemExit("Invalid bundle path.")
        if hashlib.sha256(candidate.read_bytes()).hexdigest() != digest:
            raise SystemExit("Bundle integrity check failed.")
    command = ["docker", "compose", "-f", "docker-compose.prod.yml"]
    if (project / "docker-compose.bale.yml").is_file():
        command.extend(["-f", "docker-compose.bale.yml"])
    command.extend(["--profile", "bot"])
    run(command + ["config", "--quiet"], project)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup = Path("/var/backups/asa-bot-settings") / stamp
    backup.mkdir(parents=True, mode=0o700)
    os.chmod(backup.parent, 0o700)
    shutil.copy2(environment, backup / ".env")
    os.chmod(backup / ".env", 0o600)
    for relative in manifest:
        original = project / relative
        if original.is_file():
            saved = backup / "files" / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(original, saved)
    for folder in ("frontend/dist", "public-site/dist"):
        if (project / folder).is_dir():
            shutil.copytree(project / folder, backup / folder)
    print(f"Backup: {backup}", flush=True)
    dump_path = backup / "postgres.dump"
    descriptor = os.open(dump_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as database_backup:
        run(command + ["exec", "-T", "db", "sh", "-ec", 'pg_dump --format=custom --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB"'], project, stdout=database_backup)
    if dump_path.stat().st_size == 0:
        raise SystemExit("Database backup is empty. Update cancelled.")
    for relative in manifest:
        target = project / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / "payload" / relative, target)
        os.chmod(target, 0o644)
    try:
        build = command + ["build"]
        package_index = os.environ.get("ASA_PIP_INDEX_URL")
        if package_index:
            build.extend(["--build-arg", "PIP_INDEX_URL=" + package_index])
        run(build + ["web", "bot"], project)
        run(command + ["up", "-d", "--no-deps", "web"], project)
        ready = False
        for attempt in range(30):
            try:
                with urllib.request.urlopen("https://asaeng.org/api/bale/application-form/", timeout=10) as response:
                    ready = response.status == 200 and response.read(5) == b"%PDF-"
                if ready:
                    break
            except Exception:
                pass
            time.sleep(2)
        if not ready:
            raise RuntimeError("Backend PDF check failed; inspect web logs.")
        for folder in ("frontend/dist", "public-site/dist"):
            shutil.copytree(source / folder, project / folder, dirs_exist_ok=True)
            for asset in (project / folder).rglob("*"):
                os.chmod(asset, 0o755 if asset.is_dir() else 0o644)
        run(command + ["up", "-d", "--no-deps", "--force-recreate", "bot"], project)
        for attempt in range(20):
            result = run(command + ["logs", "--tail=30", "bot"], project, capture_output=True, text=True)
            if "Bot is ready and listening." in result.stdout + result.stderr:
                break
            time.sleep(2)
        else:
            raise RuntimeError("Bot readiness is not confirmed; inspect bot status.")
        run(command + ["ps", "web", "bot"], project)
    except Exception:
        print(f"Update did not complete. Backup retained at {backup}. No database volume was removed.", flush=True)
        raise
    print("Update complete. Open https://admin.asaeng.org/panel/ceo/bot-settings")
    print("Set the real amount, account holder and destination, confirm with the manager password, then test /start in https://ble.ir/AsaengBot")


if __name__ == "__main__":
    main()
