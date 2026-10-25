"""Bundle existing production builds and their source without secrets or uploads."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["menu", "partner-logo"])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    if args.kind == "menu":
        paths = ["public-site/src/components/layout/Header.tsx", "public-site/src/hooks/useActiveSection.ts"]
        build = "public-site/dist"
        installer = "install-menu-fix.py"
    else:
        paths = ["backend/apps/common/storages.py"]
        paths += [str(path.relative_to(project)) for path in (project / "backend/apps/website").rglob("*.py")]
        paths += [str(path.relative_to(project)) for path in (project / "frontend/src").rglob("*") if path.is_file()]
        build = "frontend/dist"
        installer = "install-partner-logo.py"
    if not (project / build / "index.html").is_file():
        raise SystemExit("Build " + build.split("/")[0] + " first.")
    paths += [str(path.relative_to(project)) for path in (project / build).rglob("*") if path.is_file()]
    destination = args.output or Path("/tmp") / ("asa-" + args.kind + "-fix.tar.gz")
    manifest = {path: hashlib.sha256((project / path).read_bytes()).hexdigest() for path in sorted(set(paths))}
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        metadata = Path(directory) / "manifest.json"
        metadata.write_text(json.dumps(manifest, indent=2))
        with tarfile.open(destination, "w:gz") as archive:
            archive.add(project / "deploy" / installer, arcname="install.py")
            archive.add(metadata, arcname="manifest.json")
            for path in manifest:
                archive.add(project / path, arcname="payload/" + path)
    print(destination)


if __name__ == "__main__":
    main()
