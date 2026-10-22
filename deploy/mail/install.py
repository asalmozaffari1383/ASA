import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time


ROOT = Path("/opt/asa-mail")
SOURCE = Path(__file__).resolve().parent
IMAGE = "mailserver/docker-mailserver:16.0.1@sha256:d0fe7668defe157aad57ea31b1707ad1e2fb57d7a91bdf17cbdf876549946c86"
COMPOSE = ["docker", "compose", "-f", str(ROOT / "compose.yaml")]


def run(*command, **options):
    return subprocess.run(command, check=True, **options)


def write(path, text, mode=0o600):
    path.write_text(text)
    path.chmod(mode)


def preflight():
    if os.geteuid() != 0:
        raise SystemExit("Run: sudo python3 install.py")
    for program in ("docker", "nginx", "certbot", "dig", "systemctl", "ufw"):
        if not shutil.which(program):
            raise SystemExit(f"Required program missing: {program}")
    run("docker", "compose", "version")
    run("nginx", "-t")
    for host in ("mx1.asaeng.org", "inbox.asaeng.org"):
        addresses = run("dig", "@1.1.1.1", "+short", host, "A", capture_output=True, text=True).stdout.split()
        ipv6 = run("dig", "@1.1.1.1", "+short", host, "AAAA", capture_output=True, text=True).stdout.split()
        if addresses != ["89.44.240.98"] or ipv6:
            raise SystemExit(f"Set A {host} = 89.44.240.98, DNS only, with no AAAA; then run again. MX must stay unchanged for now.")
    with socket.create_connection(("gmail-smtp-in.l.google.com", 25), timeout=10) as connection:
        if not connection.recv(1024).startswith(b"220"):
            raise SystemExit("Outbound SMTP did not return a valid greeting.")
    if shutil.disk_usage("/opt").free < 6 * 1024 ** 3:
        raise SystemExit("At least 6 GiB free disk is required.")
    if ROOT.exists() and not (ROOT / ".asa-managed").is_file():
        raise SystemExit("Existing unmanaged /opt/asa-mail; refusing to overwrite it.")
    if not (ROOT / ".asa-managed").exists():
        for port in (25, 465, 587, 993, 8088):
            with socket.socket() as connection:
                try:
                    connection.bind(("0.0.0.0", port))
                except OSError:
                    raise SystemExit(f"Port {port} is already occupied; no service was stopped.")


def nginx_config(include_tls):
    available = Path("/etc/nginx/sites-available/asa-mail")
    enabled = Path("/etc/nginx/sites-enabled/asa-mail")
    previous = available.read_text() if available.exists() else None
    if previous is not None and "asa-mail-acme" not in previous:
        raise SystemExit("Existing unrelated nginx asa-mail config; refusing to overwrite it.")
    content = (SOURCE / "nginx-http.conf").read_text()
    if include_tls:
        content += "\n" + (SOURCE / "nginx-https.conf").read_text()
    write(available, content, 0o644)
    created_link = not enabled.exists()
    if created_link:
        enabled.symlink_to(available)
    try:
        run("nginx", "-t")
    except subprocess.CalledProcessError:
        if previous is not None:
            write(available, previous, 0o644)
        elif created_link:
            enabled.unlink()
            available.unlink()
        raise
    run("systemctl", "reload", "nginx")


def main():
    preflight()
    ROOT.mkdir(mode=0o700, exist_ok=True)
    ROOT.chmod(0o700)
    for directory in ("data", "state", "logs", "config", "tls", "webmail-db", "webmail-config"):
        (ROOT / directory).mkdir(exist_ok=True)
    os.chown(ROOT / "webmail-db", 33, 33)
    for filename in ("compose.yaml", "mailserver.env"):
        destination = ROOT / filename
        if destination.exists() and destination.read_bytes() != (SOURCE / filename).read_bytes():
            raise SystemExit(f"Existing configuration differs: {destination}; review changes manually.")
        shutil.copyfile(SOURCE / filename, destination)
        destination.chmod(0o600)
    write(ROOT / ".asa-managed", "asa-mail-v1\n")
    for filename in ("asa.php", "des-key"):
        web_config = ROOT / "webmail-config" / filename
        if not web_config.exists():
            content = (SOURCE / "roundcube.php").read_text() if filename == "asa.php" else secrets.token_hex(12) + "\n"
            write(web_config, content, 0o640)
            os.chown(web_config, 0, 33)
    run(*COMPOSE, "config", "--quiet")
    run(*COMPOSE, "pull")
    certificate = Path("/etc/letsencrypt/live/asa-mail")
    Path("/var/www/asa-mail-acme").mkdir(exist_ok=True)
    nginx_config((certificate / "fullchain.pem").exists())
    run("certbot", "certonly", "--webroot", "-w", "/var/www/asa-mail-acme",
        "--cert-name", "asa-mail", "-d", "mx1.asaeng.org", "-d", "inbox.asaeng.org",
        "--non-interactive", "--agree-tos", "-m", "info@asaeng.org", "--keep-until-expiring")
    for filename, mode in (("fullchain.pem", 0o644), ("privkey.pem", 0o600)):
        shutil.copyfile(certificate / filename, ROOT / "tls" / filename)
        (ROOT / "tls" / filename).chmod(mode)
    accounts = ROOT / "config/postfix-accounts.cf"
    if not accounts.exists() or not any(line.startswith("info@asaeng.org|") for line in accounts.read_text().splitlines()):
        print("Choose the NEW info@asaeng.org password at the next prompt. Nothing is shown or logged.", flush=True)
        run("docker", "run", "--rm", "-it", "--hostname", "mx1.asaeng.org",
            "--env-file", str(ROOT / "mailserver.env"),
            "-v", f"{ROOT / 'config'}:/tmp/docker-mailserver", "--entrypoint", "setup",
            IMAGE, "email", "add", "info@asaeng.org")
    for alias in ("postmaster@asaeng.org", "abuse@asaeng.org"):
        aliases = ROOT / "config/postfix-virtual.cf"
        if not aliases.exists() or not any(line.split() and line.split()[0] == alias for line in aliases.read_text().splitlines()):
            run("docker", "run", "--rm", "--hostname", "mx1.asaeng.org",
                "-v", f"{ROOT / 'config'}:/tmp/docker-mailserver", "--entrypoint", "setup",
                IMAGE, "alias", "add", alias, "info@asaeng.org")
    for port in (25, 465, 587, 993):
        run("ufw", "allow", f"{port}/tcp")
    run(*COMPOSE, "up", "-d", "mailserver")
    for attempt in range(60):
        result = subprocess.run(COMPOSE + ["exec", "-T", "mailserver", "dms-healthcheck"], capture_output=True)
        if result.returncode == 0:
            break
        time.sleep(2)
    else:
        raise SystemExit("Mail readiness failed. Inspect: sudo docker compose -f /opt/asa-mail/compose.yaml logs --tail=60 mailserver. MX was not changed.")
    if not list((ROOT / "config/rspamd/dkim").glob("*.private*")):
        run(*COMPOSE, "exec", "-T", "mailserver", "setup", "config", "dkim", "selector", "asa2026", "domain", "asaeng.org")
    run(*COMPOSE, "up", "-d", "webmail")
    nginx_config(True)
    hook = Path("/etc/letsencrypt/renewal-hooks/deploy/asa-mail")
    hook.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE / "renew-mail-tls.sh", hook)
    hook.chmod(0o700)
    run(*COMPOSE, "ps")
    print("Mail services installed. DNS/MX has NOT been switched; old mailbox has NOT been deleted.")
    print("Login: https://inbox.asaeng.org ; username: info@asaeng.org")
    print("DKIM public DNS record(s):")
    for public in (ROOT / "config/rspamd/dkim").glob("*.public*"):
        print(public.name, public.read_text())
    for public in (ROOT / "config/rspamd/dkim").glob("*.txt"):
        if "private" not in public.name and "public" not in public.name:
            print(public.name, public.read_text())
    print("Next: request PTR 89.44.240.98 -> mx1.asaeng.org, migrate old mail, publish DKIM, switch MX, test delivery, then retire old host.")


if __name__ == "__main__":
    main()
