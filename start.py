import atexit
import os
import signal
import subprocess
import sys
import time
import urllib.request

OLLAMA_URL = "http://localhost:11434"
RESTART_DELAY = 3

_procs: dict = {}


def _is_ollama_up() -> bool:
    try:
        urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2)
        return True
    except Exception:
        return False


def _start_ollama():
    if _is_ollama_up():
        print("[ollama] already running — skipping start")
        return None
    print("[ollama] starting 'ollama serve'...")
    proc = subprocess.Popen(["ollama", "serve"])
    for i in range(15):
        time.sleep(1)
        if _is_ollama_up():
            print(f"[ollama] ready (pid={proc.pid})")
            return proc
        print(f"[ollama] waiting... ({i + 1}/15)")
    print("[ollama] WARNING: not responding after 15 s, continuing anyway")
    return proc


def _find_python() -> str:
    """Return venv python if present, else sys.executable."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "..", ".venv", "Scripts", "python.exe"),  # Windows
        os.path.join(script_dir, "..", ".venv", "bin", "python"),           # Linux/Mac
        os.path.join(script_dir, ".venv", "Scripts", "python.exe"),
        os.path.join(script_dir, ".venv", "bin", "python"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return os.path.abspath(p)
    return sys.executable


def _start_uvicorn():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    python = _find_python()
    cmd = [python, "-m", "uvicorn", "app.main:app",
           "--host", "0.0.0.0", "--port", "8001"]
    print(f"[uvicorn] starting: {' '.join(cmd)}")
    return subprocess.Popen(cmd, cwd=script_dir)


def _cleanup():
    for name, proc in _procs.items():
        if proc and proc.poll() is None:
            print(f"[{name}] terminating (pid={proc.pid})...")
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


def _on_signal(sig, frame):
    print(f"\n[start] received signal {sig}, shutting down...")
    _cleanup()
    sys.exit(0)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    signal.signal(signal.SIGINT, _on_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _on_signal)

    atexit.register(_cleanup)

    _procs["ollama"] = _start_ollama()
    _procs["uvicorn"] = _start_uvicorn()

    print("\n[start] all services running — Ctrl+C to stop\n")

    while True:
        time.sleep(5)

        uv = _procs["uvicorn"]
        if uv.poll() is not None:
            print(f"[uvicorn] exited (code={uv.returncode}), restarting in {RESTART_DELAY}s...")
            time.sleep(RESTART_DELAY)
            _procs["uvicorn"] = _start_uvicorn()

        ol = _procs.get("ollama")
        if ol and ol.poll() is not None:
            print(f"[ollama] exited (code={ol.returncode}), restarting...")
            time.sleep(RESTART_DELAY)
            _procs["ollama"] = _start_ollama()
