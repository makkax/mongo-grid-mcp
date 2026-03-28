import subprocess, tempfile, os
REPO = r"C:\Users\alecb\WebStormProjects\mcp-server-mongodb-gridfs"
MSG = "feat: v1.1.0 - add watch/find/cleanup/update_metadata/upload_text\n\nNew tools:\n- gridfs_find: download by filename (no ObjectId)\n- gridfs_watch: poll bucket until file appears (relay primitive)\n- gridfs_cleanup: TTL delete with dryRun, prefix, status filter\n- gridfs_update_metadata: patch metadata fields (mark consumed)\n- gridfs_upload_text: plain text upload without base64\n\nindex.ts updated to v1.1.0, registers all 11 tools.\nCHANGELOG.md added.\n"
with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
    f.write(MSG); tmp = f.name
try:
    subprocess.run(["git", "add", "-A"], cwd=REPO, check=True)
    r = subprocess.run(["git", "commit", "-F", tmp], cwd=REPO, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode == 0:
        # Tag v1.1.0
        t = subprocess.run(["git", "tag", "-a", "v1.1.0", "-m", "v1.1.0 - relay tools: watch/find/cleanup/update_metadata/upload_text"],
            cwd=REPO, capture_output=True, text=True)
        print("tag:", t.stdout.strip() or t.stderr.strip() or "v1.1.0 created")
        p = subprocess.run(["git", "push", "--follow-tags"], cwd=REPO, capture_output=True, text=True)
        print(p.stdout.strip() or p.stderr.strip())
        print("PUSH OK" if p.returncode == 0 else "PUSH FAILED")
finally:
    os.unlink(tmp)
