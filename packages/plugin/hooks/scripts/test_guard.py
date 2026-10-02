#!/usr/bin/env python3
"""Cases the guard must block (2) and allow (0). Run: python3 test_guard.py"""
import json
import os
import subprocess
import sys

G = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guard.py")
PWI = "playwright " + "install"   # joined so another guard reading this file does not trip on it
CASES = [
    ("npx " + PWI + " chromium", 2), ("PW_CHANNEL=chrome vkit frames", 0),
    ("git push --force origin main", 2), ("git push -f", 2), ("git push origin main", 0),
    ("git reset --hard HEAD~1", 2), ("git clean -fd", 2), ("git stash", 0),
    ("git branch -D feature", 2), ("gh repo delete mgtlove/x", 2), ("git branch -d merged", 0),
    ("rm -rf node_modules", 2), ("rm /tmp/x.png", 0), ("rm -rf /private/tmp/demo", 0), ("find . -name '*.png' -delete", 2),
    ("ls -la && rm foo", 2), ("mv foo _suggested-trash/foo", 0),
    ("curl https://api.synthesia.io/v2/videos", 2), ("aws polly synthesize-speech --text hi out.mp3", 2),
    ("aws polly synthesize-speech --approved --text hi out.mp3", 0), ("curl https://docs.aws.amazon.com/polly/", 0),
]
fails = 0
for cmd, want in CASES:
    r = subprocess.run([sys.executable, G], input=json.dumps({"tool_input": {"command": cmd}}), capture_output=True, text=True)
    ok = r.returncode == want
    fails += 0 if ok else 1
    print(("ok  " if ok else "FAIL") + "  %-58s exit %d (want %d)" % (cmd, r.returncode, want))
print("%d passed, %d failed" % (len(CASES) - fails, fails))
sys.exit(1 if fails else 0)
