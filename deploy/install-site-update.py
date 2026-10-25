"""Install the combined public-content, Jalali calendar and partner controls update."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request


def verify(source):
    manifest = json.loads((source / 'manifest.json').read_text())
    if not manifest:
        raise SystemExit('Empty package; cancelled.')
    for relative, digest in manifest.items():
        path = Path(relative)
        allowed = relative.startswith(('backend/apps/website/', 'frontend/', 'public-site/')) or relative == 'backend/apps/common/storages.py'
        if path.is_absolute() or '..' in path.parts or not allowed or any(part.startswith('.') for part in path.parts):
            raise SystemExit('Invalid package path; cancelled.')
        payload = source / 'payload' / path
        if not payload.is_file() or payload.is_symlink() or hashlib.sha256(payload.read_bytes()).hexdigest() != digest:
            raise SystemExit('Package integrity check failed: ' + relative)
    for required in ('frontend/dist/index.html', 'public-site/dist/index.html', 'backend/apps/website/migrations/0007_pagecontent.py'):
        if required not in manifest:
            raise SystemExit('Incomplete package: ' + required)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate the package without installing anything.')
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    manifest = verify(source)
    if args.check:
        print('Package verified: ' + str(len(manifest)) + ' files. No changes made.')
        return
    if os.geteuid() != 0:
        raise SystemExit('Run: sudo python3 install.py')
    project = Path('/opt/asa')
    if not (project / '.env').is_file() or not (project / 'docker-compose.prod.yml').is_file():
        raise SystemExit('Existing /opt/asa installation not found. No changes made.')
    for relative in manifest:
        if not (project / relative).resolve().is_relative_to(project):
            raise SystemExit('Destination points outside the project; cancelled.')
    compose = ['docker', 'compose', '-f', 'docker-compose.prod.yml']
    def run(command, **kwargs):
        return subprocess.run(command, cwd=project, check=True, **kwargs)
    run(compose + ['config', '--quiet'])
    run(['nginx', '-t'])
    backup = Path('/var/backups/asa-site-update') / datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup.mkdir(parents=True, mode=0o700)
    backup.parent.chmod(0o700)
    added = []
    for relative in manifest:
        existing = project / relative
        if existing.is_file():
            target = backup / 'files' / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(existing, target)
        else:
            added.append(relative)
    (backup / 'added-files.json').write_text(json.dumps(added, indent=2))
    dump = backup / 'postgres.dump'
    with dump.open('wb') as output:
        dump.chmod(0o600)
        run(compose + ['exec', '-T', 'db', 'sh', '-ec', 'pg_dump --format=custom --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB"'], stdout=output)
    if not dump.stat().st_size:
        raise SystemExit('Database backup was empty. Installation cancelled.')
    print('Backup saved: ' + str(backup), flush=True)
    def copy(relative):
        target = project / relative
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        shutil.copy2(source / 'payload' / relative, target)
        target.chmod(0o644)
    try:
        # Existing containers and published frontend stay available during the build.
        for relative in manifest:
            if '/dist/' not in relative:
                copy(relative)
        print('Building backend...', flush=True)
        run(compose + ['build', 'web'])
        print('Applying database migrations...', flush=True)
        run(compose + ['run', '--rm', '--no-deps', '-T', 'web', 'python', 'manage.py', 'migrate', '--noinput'])
        run(compose + ['up', '-d', '--no-deps', 'web'])
        for attempt in range(40):
            try:
                request = urllib.request.Request('http://127.0.0.1:8000/api/public/page-content/', headers={'Host': 'asaeng.org', 'X-Forwarded-Proto': 'https'})
                with urllib.request.urlopen(request, timeout=3) as response:
                    data = json.load(response)
                    if response.status == 200 and isinstance(data.get('content'), dict) and 'hero_title' in data['content']:
                        break
            except Exception:
                pass
            time.sleep(2)
        else:
            raise RuntimeError('New backend did not become ready. Frontend has not been switched.')
        # Keep old versioned assets for tabs that were open before this update.
        for relative in manifest:
            if '/dist/' in relative and not relative.endswith('/index.html'):
                copy(relative)
        for app in ('frontend', 'public-site'):
            directory = project / app / 'dist'
            directory.chmod(0o755)
            for child in directory.rglob('*'):
                if child.is_dir():
                    child.chmod(0o755)
            fd, temporary = tempfile.mkstemp(prefix='.index-update-', dir=directory)
            try:
                with os.fdopen(fd, 'wb') as output:
                    output.write((source / 'payload' / app / 'dist/index.html').read_bytes())
                os.chmod(temporary, 0o644)
                os.replace(temporary, directory / 'index.html')
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
    except (subprocess.CalledProcessError, RuntimeError, OSError) as error:
        raise SystemExit('Installation stopped: ' + str(error) + '\nBackup: ' + str(backup) + '\nDo not delete this backup. Send the final error output without passwords or .env contents.')
    print('UPDATE COMPLETE', flush=True)
    print('Content editor: https://admin.asaeng.org/panel/ceo/site-pages')
    print('Jalali calendar: https://asaeng.org/request-certificate')
    print('Partner controls: https://admin.asaeng.org/panel/ceo/site-partners')
    print('Refresh the panel and website with Command+Shift+R.')


if __name__ == '__main__':
    main()
