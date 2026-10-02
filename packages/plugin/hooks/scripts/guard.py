#!/usr/bin/env python3
"""guard.py: run before a shell command. Exit 0 lets it run; exit 2 blocks it and
the message on stderr tells the agent why and what to do instead. Fails open:
an unexpected error here lets the command through and says so.

Rules: no browser download; no force push or history rewrite; no deletion
outside temporary folders (move things into _suggested-trash/ and say so);
no call to a paid API without --approved on the command line.
"""
import json
import re
import sys

TEMP = ("/tmp/", "/private/tmp/", "/var/folders/", "$TMPDIR", "${TMPDIR}")
PAID_HOSTS = ("polly", "bedrock", "api.synthesia.io", "api.elevenlabs.io", "api.openai.com")
DOC_HOSTS = ("docs.aws.amazon.com", "developers.", "/docs/")


def block(rule, msg):
    sys.stderr.write("[vkit guardrail: %s] %s\n" % (rule, msg))
    sys.exit(2)


def parts(cmd):
    return [s.strip() for s in re.split(r"(?:\|\||&&|;|\||\n)", cmd) if s.strip()]


def check(cmd):
    for seg in parts(cmd):
        words = seg.split()
        if not words:
            continue
        low = seg.lower()
        if re.search(r"\bplaywright\s+install\b", low):
            block("browser-download", "Nothing downloads a browser. Use the Chrome already installed: PW_CHANNEL=chrome vkit frames.")
        if re.search(r"\bgit\s+push\b.*(--force|-f\b|--force-with-lease)", low):
            block("force-push", "No force pushes. Make a new commit on top; if history must change, a person does it by hand.")
        if re.search(r"\bgit\s+reset\s+--hard\b", low) or re.search(r"\bgit\s+clean\s+-\w*f", low):
            block("delete", "No history or working-tree wipes. git stash or a new branch keeps the work.")
        if re.search(r"\bgit\s+branch\s+-D\b", seg) or re.search(r"\bgit\s+push\b.*--delete", low) or re.search(r"\bgh\s+repo\s+delete\b", low):
            block("delete", "Branches and repos are not deleted by an agent. Say which one and why; a person decides.")
        if words[0] in ("rm", "rmdir", "unlink") or re.search(r"\bfind\b.*-delete", low) or re.search(r"\bsudo\s+rm\b", low):
            targets = [w for w in words[1:] if not w.startswith("-")]
            if not targets or not all(t.startswith(TEMP) for t in targets):
                block("delete", "Nothing is deleted. Move it into _suggested-trash/ beside it and say what moved. Temporary files under /tmp are fine.")
        if any(h in low for h in PAID_HOSTS) and "--approved" not in low and not any(d in low for d in DOC_HOSTS):
            if words[0] in ("curl", "wget", "aws", "node", "python3", "python", "http", "npx"):
                block("paid-call", "A paid service needs a recorded go-ahead from the person. Add --approved to the command once they have said yes in the conversation.")


def main():
    try:
        data = json.load(sys.stdin)
        cmd = (data.get("tool_input") or {}).get("command") or ""
        if cmd:
            check(cmd)
    except SystemExit:
        raise
    except Exception as e:  # fail open
        sys.stderr.write("[vkit guardrail] could not check the command (%s); letting it run\n" % e)
    sys.exit(0)


if __name__ == "__main__":
    main()
