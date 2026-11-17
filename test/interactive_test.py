"""Drive `npx claude-eng-team` through a real pseudo-terminal, answering each question only
after it appears — exactly like a person would. Run: python3 -I test/interactive_test.py"""
import json
import os
import pathlib
import pty
import select
import subprocess
import sys
import tempfile

# Never the real home: the CLI child inherits this, whatever flags a test forgets.
_SANDBOX = tempfile.mkdtemp(prefix="cet-sandbox-home-")
os.environ["HOME"] = _SANDBOX
os.environ["CLAUDE_CONFIG_DIR"] = os.path.join(_SANDBOX, ".claude")
import time
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
CLI = str(ROOT / "bin" / "cli.js")


def drive(args, script, timeout=60):
    """Run the CLI on a pty; `script` is a list of (prompt_substring, answer)."""
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp("node", ["node", CLI, *args])
    out, deadline = b"", time.time() + timeout
    pending = list(script)
    while time.time() < deadline:
        ready, _, _ = select.select([fd], [], [], 0.5)
        if ready:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break
            if not chunk:
                break
            out += chunk
        if pending and pending[0][0].encode() in out:
            os.write(fd, (pending.pop(0)[1] + "\r").encode())
            out += b"\n<answered>\n"
    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status), out.decode(errors="replace"), pending


class InteractiveInstall(unittest.TestCase):
    def test_five_questions_then_a_working_install(self):
        home = tempfile.mkdtemp(prefix="cet-pty-")
        code, out, unanswered = drive(["--home", home], [
            ("Your name (for CLAUDE.md)", "Ada Lovelace"),
            ("Language Claude should talk to you in", "Spanish"),
            ("Use Codex CLI", "n"),
            ("Run Bash commands without permission prompts?", "y"),
            ("Which groups?", "n"),
        ])
        self.assertEqual(unanswered, [], out)
        self.assertEqual(code, 0, out)
        self.assertIn("Installed", out)
        claude = pathlib.Path(home, ".claude")
        self.assertTrue(claude.joinpath("CLAUDE.md").read_text().startswith("# Ada Lovelace — Engineering Team"))
        self.assertIn("conversation with me in Spanish", claude.joinpath("CLAUDE.md").read_text())
        settings = json.loads(claude.joinpath("settings.json").read_text())
        self.assertIn("Bash", settings["permissions"]["allow"])
        self.assertNotIn("StopFailure", settings["hooks"])  # no codex

        # Running it again remembers every answer: Enter on each question keeps them.
        code, out, unanswered = drive(["--home", home], [
            ("Your name (for CLAUDE.md) (Ada Lovelace)", ""),
            ("Language Claude should talk to you in (Spanish)", ""),
            ("Use Codex CLI", ""),
            ("Run Bash commands without permission prompts? (the guard", ""),
            ("Which groups?", "n"),
        ])
        self.assertEqual((code, unanswered), (0, []), out)

        subprocess.run(["node", CLI, "uninstall", "--home", home], check=True, capture_output=True)
        leftovers = [p for p in claude.rglob("*") if p.is_file()]
        self.assertEqual(leftovers, [])


if __name__ == "__main__":
    unittest.main(verbosity=1)
