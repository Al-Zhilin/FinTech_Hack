import atexit
import os
import signal
import socket
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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "..", ".venv", "Scripts", "python.exe"),  # Windows
        os.path.join(script_dir, "..", ".venv", "bin", "python"),          # Linux/Mac
    ]
    for p in candidates:
        if os.path.isfile(p):
            return os.path.abspath(p)
    raise FileNotFoundError(
        f"venv not found. Expected at: {[os.path.abspath(p) for p in candidates]}"
    )


def _is_port_busy(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def _kill_port(port: int) -> None:
    pid = None
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(
                ["netstat", "-ano"], text=True, stderr=subprocess.DEVNULL
            )
            for line in out.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    pid = int(line.strip().split()[-1])
                    break
        else:
            out = subprocess.check_output(
                ["lsof", "-ti", f":{port}"], text=True, stderr=subprocess.DEVNULL
            ).strip()
            if out:
                pid = int(out.split()[0])
    except Exception as e:
        print(f"[port] could not find process on port {port}: {e}")
        return

    if not pid:
        print(f"[port] no process found on port {port}")
        return

    try:
        if sys.platform == "win32":
            subprocess.check_call(
                ["taskkill", "/PID", str(pid), "/F"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        else:
            os.kill(pid, signal.SIGKILL)
        print(f"[port] killed PID {pid} on port {port}")
        time.sleep(1)
    except Exception as e:
        print(f"[port] failed to kill PID {pid}: {e}")


def _start_uvicorn():
    port = int(os.getenv("AI_SERVICE_PORT", "8001"))
    if _is_port_busy(port):
        print(f"[uvicorn] port {port} is busy — killing existing process...")
        _kill_port(port)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    python = _find_python()
    ssl_certfile = os.path.join(script_dir, "certificates", "server.crt")
    ssl_keyfile = os.path.join(script_dir, "certificates", "server.key")
    cmd = [python, "-m", "uvicorn", "app.main:app",
           "--host", "0.0.0.0", "--port", str(port),
           "--ssl-certfile", ssl_certfile, "--ssl-keyfile", ssl_keyfile]
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

    python = _find_python()
    print(f"[start] using python: {python}")

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
