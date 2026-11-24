"""Run the unchanged FastAPI app with graceful parent-owned Windows shutdown."""
import sys
import threading

import uvicorn


if __name__ == "__main__":
    # Equivalent to: python -m uvicorn cartify_api:app --host 127.0.0.1 --port 8001
    server = uvicorn.Server(uvicorn.Config("cartify_api:app", host="127.0.0.1", port=8001))
    # Load native model libraries before a blocking stdin-reader thread on Windows.
    server.config.load()

    def watch_parent():
        for command in sys.stdin:
            if command.strip() == "shutdown":
                break
        # EOF also stops this owned worker if the Node launcher disappears.
        server.should_exit = True

    threading.Thread(target=watch_parent, daemon=True).start()
    try:
        server.run()
    except KeyboardInterrupt:
        pass
