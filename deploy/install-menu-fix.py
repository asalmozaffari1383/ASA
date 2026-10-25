import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run with sudo python3 install.py')
    project = Path('/opt/asa')
    source = Path(__file__).resolve().parent
    if not (project / 'public-site/dist/index.html').is_file():
        raise SystemExit('Existing public site was not found. No files changed.')
    manifest = json.loads((source / 'manifest.json').read_text())
    for relative, digest in manifest.items():
        if not relative.startswith('public-site/') or '..' in Path(relative).parts:
            raise SystemExit('Invalid bundle path.')
        if hashlib.sha256((source / 'payload' / relative).read_bytes()).hexdigest() != digest:
            raise SystemExit('Bundle integrity check failed.')
    subprocess.run(['nginx', '-t'], check=True)
    backup = Path('/var/backups/asa-menu') / datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup.mkdir(parents=True, mode=0o700)
    backup.parent.chmod(0o700)
    shutil.copytree(project / 'public-site/dist', backup / 'dist')
    for relative in manifest:
        if '/src/' in relative and (project / relative).is_file():
            destination = backup / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(project / relative, destination)
    print('Backup: ' + str(backup), flush=True)
    # Old versioned assets remain available for already-open browser tabs.
    for relative in manifest:
        if relative.endswith('/index.html'):
            continue
        target = project / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / 'payload' / relative, target)
        target.chmod(0o644)
    for directory in (project / 'public-site/dist').rglob('*'):
        if directory.is_dir():
            directory.chmod(0o755)
    index = project / 'public-site/dist/index.html'
    descriptor, temporary = tempfile.mkstemp(prefix='.index-menu-', dir=index.parent)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write((source / 'payload/public-site/dist/index.html').read_bytes())
        os.chmod(temporary, 0o644)
        os.replace(temporary, index)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('Menu fix installed successfully. Refresh https://asaeng.org', flush=True)


if __name__ == '__main__':
    main()
