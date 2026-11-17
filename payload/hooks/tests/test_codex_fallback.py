"""Tests for codex-fallback.py. Run: python3 -I ~/.claude/hooks/tests/test_codex_fallback.py"""
import json
import os
import pathlib
import subprocess
import tempfile
import time
import unittest

HOOK = pathlib.Path(__file__).resolve().parent.parent / "codex-fallback.py"


def make_repo(branch, handoff=None):
    root = pathlib.Path(tempfile.mkdtemp())
    subprocess.run(["git", "init", "-q", "-b", branch, str(root)], check=True)
    (root / ".claude").mkdir()
    if handoff is not None:
        (root / ".claude/handoff.md").write_text(handoff)
    return root


def run(mode, root, stub):
    env = dict(os.environ, CLAUDE_NOTIFY="off", CODEX_TASK_BIN=str(stub),
               CODEX_FALLBACK_EVENT_LOG=str(root / "events.log"))
    payload = json.dumps({"cwd": str(root), "error": "rate_limit",
                          "last_assistant_message": "You've hit your limit"})
    return subprocess.run(["python3", "-I", str(HOOK), mode], input=payload,
                          capture_output=True, text=True, env=env, timeout=20)


class CodexFallbackTest(unittest.TestCase):
    def setUp(self):
        self.stub_dir = pathlib.Path(tempfile.mkdtemp())
        self.stub = self.stub_dir / "codex-task"
        self.stub.write_text('#!/bin/sh\ncat > "$(dirname "$0")/brief.txt"\necho "$@" > "$(dirname "$0")/args.txt"\n')
        self.stub.chmod(0o755)

    def wait_for(self, path):
        for _ in range(50):
            if path.exists() and path.stat().st_size:
                return True
            time.sleep(0.1)
        return False

    def test_launches_codex_with_handoff_on_feature_branch(self):
        root = make_repo("feature/1-x", "Status: in-progress\nNext: write handler")
        run("stopfailure", root, self.stub)
        self.assertTrue(self.wait_for(self.stub_dir / "brief.txt"))
        self.assertTrue(self.wait_for(self.stub_dir / "args.txt"))  # written by the same background run
        self.assertIn("Next: write handler", (self.stub_dir / "brief.txt").read_text())
        self.assertIn(f"impl medium {root}".replace("/private", ""), (self.stub_dir / "args.txt").read_text().strip().replace("/private", ""))
        self.assertTrue(list((root / ".claude").glob("codex-fallback-*.log")))
        self.assertIn(".claude/handoff.md", (root / ".git/info/exclude").read_text())

    def test_skips(self):
        cases = {
            "protected branch": make_repo("dev", "Status: in-progress"),
            "no handoff": make_repo("feature/x"),
            "waiting approval": make_repo("feature/x", "Status: waiting-approval"),
        }
        for name, root in cases.items():
            with self.subTest(name):
                run("stopfailure", root, self.stub)
                time.sleep(0.3)
                self.assertFalse((self.stub_dir / "brief.txt").exists())
                self.assertTrue((root / "events.log").exists(), "every failure is logged")

    def test_debounce(self):
        root = make_repo("feature/x", "Status: in-progress")
        (root / ".claude/codex-fallback.lock").touch()
        run("stopfailure", root, self.stub)
        time.sleep(0.3)
        self.assertFalse((self.stub_dir / "brief.txt").exists())

    def test_session_start_reports_unreviewed_logs_only(self):
        root = make_repo("feature/x")
        self.assertEqual(run("sessionstart", root, self.stub).stdout, "")
        (root / ".claude/codex-fallback-1.log").write_text("x")
        out = json.loads(run("sessionstart", root, self.stub).stdout)
        self.assertIn("codex-fallback-1.log", out["hookSpecificOutput"]["additionalContext"])
        (root / ".claude/codex-fallback-1.log").rename(root / ".claude/codex-fallback-1.log.reviewed")
        self.assertEqual(run("sessionstart", root, self.stub).stdout, "")


if __name__ == "__main__":
    unittest.main(verbosity=1)
