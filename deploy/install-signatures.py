import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run with sudo python3 install.py")
    source = Path(__file__).resolve().parent
    project = Path("/opt/asa")
    if not (project / ".env").is_file() or not (project / "docker-compose.prod.yml").is_file():
        raise SystemExit("Expected existing site at /opt/asa")
    manifest = json.loads((source / "manifest.json").read_text())
    for relative, hashes in manifest.items():
        if Path(relative).is_absolute() or ".." in Path(relative).parts:
            raise SystemExit("Invalid bundle path")
        if hashlib.sha256((source / "payload" / relative).read_bytes()).hexdigest() != hashes["updated"]:
            raise SystemExit("Bundle integrity check failed")
        target = project / relative
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() not in hashes.values():
            raise SystemExit(f"Server file differs from expected version: {relative}. No files changed; review before installing.")
    backup = Path("/var/backups/asa-signatures") / datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup.mkdir(parents=True, mode=0o700)
    backup.parent.chmod(0o700)
    for relative in manifest:
        target = project / relative
        saved = backup / relative
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, saved)
        shutil.copyfile(source / "payload" / relative, target)
        target.chmod(0o644)
    command = ["docker", "compose", "-f", "docker-compose.prod.yml"]
    if (project / "docker-compose.bale.yml").is_file():
        command.extend(["-f", "docker-compose.bale.yml"])
    subprocess.run(command + ["config", "--quiet"], cwd=project, check=True)
    build = command + ["build"]
    if os.environ.get("ASA_PIP_INDEX_URL"):
        build += ["--build-arg", "PIP_INDEX_URL=" + os.environ["ASA_PIP_INDEX_URL"]]
    subprocess.run(build + ["web"], cwd=project, check=True)
    subprocess.run(command + ["up", "-d", "--no-deps", "web"], cwd=project, check=True)
    subprocess.run(command + ["exec", "-T", "web", "python", "manage.py", "check"], cwd=project, check=True)
    subprocess.run(command + ["ps", "web"], cwd=project, check=True)
    print(f"Signature update installed. Backup: {backup}")
    print("Issue a NEW test certificate to verify uploaded expert/issuer signatures. Existing PDFs are unchanged.")


if __name__ == "__main__":
    main()
