import datetime, getpass, hashlib, json, os, re, shutil, subprocess, tempfile, time, urllib.request
from pathlib import Path

PROBE = '''import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.prod')
import django
django.setup()
from django.core.files.storage import default_storage as storage
from django.core.files.base import ContentFile
from botocore.exceptions import ClientError, BotoCoreError
name = None
try:
    name = storage.save('website/partners/connection-check.txt', ContentFile(b'ASA upload test'))
    with storage.open(name, 'rb') as file:
        assert file.read() == b'ASA upload test'
    storage.delete(name)
    name = None
    print('Private upload and read: OK', flush=True)
except ClientError as error:
    print('Storage error: '+str(error.response.get('Error',{}).get('Code','unknown')),flush=True)
    raise SystemExit(2)
except BotoCoreError:
    print('Storage connection failed.',flush=True)
    raise SystemExit(3)
finally:
    if name:
        try: storage.delete(name)
        except Exception: print('Test file cleanup was not confirmed.',flush=True)
'''

def main():
    if os.geteuid()!=0: raise SystemExit('Run with sudo python3 install.py')
    source=Path(__file__).resolve().parent
    project=Path('/opt/asa'); envfile=project/'.env'
    if not envfile.is_file(): raise SystemExit('Existing site not found.')
    manifest=json.loads((source/'manifest.json').read_text())
    for path,digest in manifest.items():
        if Path(path).is_absolute() or '..' in Path(path).parts: raise SystemExit('Invalid path')
        if hashlib.sha256((source/'payload'/path).read_bytes()).hexdigest()!=digest: raise SystemExit('Invalid package')
    compose=['docker','compose','-f','docker-compose.prod.yml']
    def run(command,**kwargs): return subprocess.run(command,cwd=project,check=True,**kwargs)
    run(compose+['config','--quiet']); run(['nginx','-t'])
    backup=Path('/var/backups/asa-partner-logo')/datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup.mkdir(parents=True,mode=0o700); backup.parent.chmod(0o700)
    shutil.copy2(envfile,backup/'.env'); (backup/'.env').chmod(0o600)
    for path in manifest:
        old=project/path
        if old.is_file():
            saved=backup/'files'/path; saved.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(old,saved)
    if (project/'frontend/dist').is_dir(): shutil.copytree(project/'frontend/dist',backup/'panel')
    with (backup/'postgres.dump').open('wb') as output:
        (backup/'postgres.dump').chmod(0o600)
        run(compose+['exec','-T','db','sh','-ec','pg_dump --format=custom --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB"'],stdout=output)
    if not (backup/'postgres.dump').stat().st_size: raise SystemExit('Empty backup; cancelled.')
    print('Backup: '+str(backup),flush=True)
    def copy(path):
        dest=project/path; dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source/'payload'/path,dest); dest.chmod(0o644)
    for path in manifest:
        if '/dist/' not in path: copy(path)
    run(compose+['build','web'])
    def probe(values=None):
        command=compose+['run','--rm','--no-deps','-T']; child=os.environ.copy()
        for key,value in (values or {}).items():
            child[key]=value; command+=['-e',key]
        return subprocess.run(command+['web','python','-c',PROBE],cwd=project,env=child).returncode==0
    if not probe():
        print('Copy EXISTING Access Key and Secret Key from Parspack asa-media. Input is hidden.',flush=True)
        values={'AWS_ACCESS_KEY_ID':getpass.getpass('Access Key (hidden): ').strip(),
                'AWS_SECRET_ACCESS_KEY':getpass.getpass('Secret Key (hidden): ').strip(),
                'AWS_STORAGE_BUCKET_NAME':'c301134','AWS_S3_ENDPOINT_URL':'https://c301134.parspack.net'}
        updated=envfile.read_text()
        for key,value in values.items():
            if not value or "'" in value or any(ord(c)<32 for c in value): raise SystemExit('Invalid or empty value; .env unchanged.')
            pattern=r'(?m)^'+key+r'=.*$'; entry=key+"='"+value+"'"
            updated=re.sub(pattern,lambda match:entry,updated) if re.search(pattern,updated) else updated.rstrip('\n')+'\n'+entry+'\n'
        if not probe(values): raise SystemExit('Keys still rejected. Existing .env and live containers unchanged. Send error output without keys.')
        fd,temporary=tempfile.mkstemp(prefix='.env-logo-',dir=project)
        try:
            with os.fdopen(fd,'w') as output: output.write(updated)
            os.chown(temporary,envfile.stat().st_uid,envfile.stat().st_gid)
            os.replace(temporary,envfile)
        finally:
            if os.path.exists(temporary): os.unlink(temporary)
    run(compose+['up','-d','--no-deps','web'])
    for attempt in range(40):
        try:
            request=urllib.request.Request('http://127.0.0.1:8000/api/public/partners/',headers={'Host':'asaeng.org','X-Forwarded-Proto':'https'})
            with urllib.request.urlopen(request,timeout=5) as response:
                if response.status==200 and isinstance(json.load(response),list): break
        except Exception: pass
        time.sleep(2)
    else: raise SystemExit('Backend not ready; backup at '+str(backup))
    for path in manifest:
        if '/dist/' in path and not path.endswith('/index.html'): copy(path)
    for path in (project/'frontend/dist').rglob('*'):
        if path.is_dir(): path.chmod(0o755)
    index=project/'frontend/dist/index.html'
    fd,temporary=tempfile.mkstemp(prefix='.index-logo-',dir=index.parent)
    try:
        with os.fdopen(fd,'wb') as output: output.write((source/'payload/frontend/dist/index.html').read_bytes())
        os.chmod(temporary,0o644); os.replace(temporary,index)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)
    print('Partner logo fix installed successfully.',flush=True)

if __name__=='__main__': main()
