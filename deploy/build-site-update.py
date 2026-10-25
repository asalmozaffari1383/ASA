"""Build one production update for the public website, staff panel and page-content API."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/tmp/asa-site-update.tar.gz'))
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    env = {**os.environ, 'VITE_API_BASE_URL': '/api', 'VITE_PUBLIC_SITE_URL': 'https://asaeng.org'}
    for app in ('frontend', 'public-site'):
        subprocess.run(['npm', 'run', 'build'], cwd=project / app, env=env, check=True)
    subprocess.run(['npx', 'tsc', '--noEmit'], cwd=project / 'public-site', check=True)
    paths = {'backend/apps/common/storages.py'}
    paths.update(str(path.relative_to(project)) for path in (project / 'backend/apps/website').rglob('*.py') if '__pycache__' not in path.parts)
    for app in ('frontend', 'public-site'):
        for directory in ('src', 'dist', 'public'):
            paths.update(str(path.relative_to(project)) for path in (project / app / directory).rglob('*') if path.is_file() and not any(part.startswith('.') for part in path.relative_to(project).parts))
        for pattern in ('package*.json', 'tsconfig*.json', 'vite.config.*', 'tailwind.config.*', 'postcss.config.*', 'index.html'):
            paths.update(str(path.relative_to(project)) for path in (project / app).glob(pattern) if path.is_file())
    manifest = {path: hashlib.sha256((project / path).read_bytes()).hexdigest() for path in sorted(paths)}
    destination = args.output.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        metadata = Path(directory) / 'manifest.json'
        metadata.write_text(json.dumps(manifest, indent=2))
        with tarfile.open(destination, 'w:gz') as archive:
            archive.add(project / 'deploy/install-site-update.py', arcname='install.py')
            archive.add(metadata, arcname='manifest.json')
            for path in manifest:
                archive.add(project / path, arcname='payload/' + path)
    print('Ready: ' + str(destination))
    print('The package contains no .env, credentials or user uploads.')


if __name__ == '__main__':
    main()
