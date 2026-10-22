from getpass import getpass
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile


IMAGE = "gilleslamiral/imapsync@sha256:ece980cb0fd2806369975d2989a3e8d9fbf28d632cdd45a05961a1e511612ed5"


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run: sudo python3 migrate.py")
    if socket.gethostbyname("mail.asaeng.org") != "194.5.195.189":
        raise SystemExit("Old source mail.asaeng.org no longer points to the old host. Do not guess the migration source.")
    if socket.gethostbyname("mx1.asaeng.org") != "89.44.240.98":
        raise SystemExit("New server DNS is not ready.")
    subprocess.run(["docker", "pull", IMAGE], check=True)
    cache = Path("/opt/asa-mail/migration-cache")
    cache.mkdir(mode=0o700, exist_ok=True)
    cache.chmod(0o700)
    secret_dir = Path(tempfile.mkdtemp(prefix="asa-imap-", dir="/dev/shm"))
    try:
        for filename, prompt in (("old", "OLD mailbox password: "), ("new", "NEW mailbox password: ")):
            password = getpass(prompt)
            if not password or "\n" in password or "\r" in password:
                raise SystemExit("Empty or invalid password.")
            secret = secret_dir / filename
            secret.write_text(password + "\n")
            secret.chmod(0o400)
            del password
        subprocess.run([
            "docker", "run", "--rm", "--user", "0", "--network", "host",
            "-v", f"{secret_dir}:/run/mail-secrets:ro", "-v", f"{cache}:/cache", IMAGE, "imapsync",
            "--host1", "mail.asaeng.org", "--port1", "993", "--ssl1",
            "--user1", "info@asaeng.org", "--passfile1", "/run/mail-secrets/old",
            "--sslargs1", "SSL_verify_mode=1", "--sslargs1", "SSL_verifycn_name=mail.asaeng.org",
            "--host2", "mx1.asaeng.org", "--port2", "993", "--ssl2",
            "--user2", "info@asaeng.org", "--passfile2", "/run/mail-secrets/new",
            "--sslargs2", "SSL_verify_mode=1", "--sslargs2", "SSL_verifycn_name=mx1.asaeng.org",
            "--automap", "--syncinternaldates", "--useuid", "--usecache", "--cachedir", "/cache",
            "--nolog", "--noreleasecheck",
        ], check=True)
    finally:
        shutil.rmtree(secret_dir)
    print("Copy completed. Old messages were NOT deleted. Run again after MX propagation for late arrivals.")


if __name__ == "__main__":
    main()
