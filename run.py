import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
VENV_DIR = PROJECT_ROOT / ".venv"
IS_WIN = sys.platform == "win32"
VENV_PYTHON = (
    VENV_DIR / ("Scripts" if IS_WIN else "bin") / ("python.exe" if IS_WIN else "python")
)
REQUIREMENTS_FILE = PROJECT_ROOT / "requirements.txt"


def ensure_venv() -> None:
    """Creates the virtual environment and installs dependencies if missing."""
    if not VENV_PYTHON.exists():
        print("Creating virtual environment in .venv ...")
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])
        print("Virtual environment created.")

    # Verify key packages are installed inside the venv
    check_code = "import fastapi, uvicorn"
    res = subprocess.run([str(VENV_PYTHON), "-c", check_code], capture_output=True)
    if res.returncode != 0 and REQUIREMENTS_FILE.exists():
        print("Installing required dependencies from requirements.txt ...")
        subprocess.check_call(
            [str(VENV_PYTHON), "-m", "pip", "install", "-r", str(REQUIREMENTS_FILE)]
        )
        print("Dependencies installed successfully.")


def reexec_in_venv() -> None:
    """Switches execution into the virtual environment Python interpreter."""
    if Path(sys.executable).resolve() != VENV_PYTHON.resolve():
        env = os.environ.copy()
        env["VIRTUAL_ENV"] = str(VENV_DIR)
        scripts_dir = str(VENV_DIR / ("Scripts" if IS_WIN else "bin"))
        env["PATH"] = scripts_dir + os.pathsep + env.get("PATH", "")

        sys.exit(
            subprocess.call(
                [str(VENV_PYTHON)] + sys.argv,
                env=env,
                cwd=str(PROJECT_ROOT),
            )
        )


def release_port(port: int = 8000) -> None:
    """Terminates any lingering or orphaned process listening on the target port (Windows)."""
    if IS_WIN:
        try:
            output = subprocess.check_output(
                f"netstat -ano | findstr :{port}", shell=True, text=True
            )
            current_pid = os.getpid()
            pids = set()
            for line in output.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in line:
                    pid = int(parts[-1])
                    if pid != current_pid and pid > 0:
                        pids.add(pid)
            for pid in pids:
                print(f"Releasing port {port} (terminating PID: {pid}) ...")
                subprocess.run(
                    f"taskkill /F /PID {pid}",
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
        except subprocess.CalledProcessError:
            pass  # No process is holding the port


if __name__ == "__main__":
    ensure_venv()
    reexec_in_venv()

    # Once inside the virtual environment:
    release_port(8000)
    print("Starting Task Board API on http://127.0.0.1:8000 ...")
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
