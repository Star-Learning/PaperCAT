import uvicorn
from os import getenv


if __name__ == "__main__":
    port = int(getenv("PAPER_CAT_BACKEND_PORT", "8765"))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False, log_level="info")
