# Local Cartify ML service (Windows)

This folder contains four saved price models plus regional advertisement classifier
and regressor inference, with their required configs/artifacts. No training notebooks,
datasets, runtime database exports, caches or copied virtual environment are needed.

## Normal startup after a restart

Keep the MongoDB Windows service running. Open separate PowerShell terminals:

```powershell
cd backend
npm.cmd start
```

```powershell
cd frontend
npm.cmd start
```

Backend startup reuses a healthy FastAPI service on 127.0.0.1:8001, or starts this
folder's `.venv\Scripts\python.exe` and waits up to 120 seconds for `/health`.
It then starts Express (or keeps an existing Express instance running).
Keep `ML_SERVICE_URL=http://127.0.0.1:8001` in the existing backend configuration.
Ctrl+C stops services started by that launcher, never independently started services.

`local_runner.py` runs the same uvicorn app/host/port as the command below. Its stdin
control allows graceful Windows shutdown without orphaning the venv's Python child.

## Recreating the environment (only if .venv is missing)

Use an installed **Python 3.12, 64-bit** interpreter:

```powershell
cd ml-service
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The already-created local venv is reused on normal startup; activation and package
installation are not required after each Windows restart. The venv depends on its
installed base Python; do not remove that Python installation. Recreate rather than
copy the venv if moving the project to a different path/computer.

## Optional independent ML startup

```powershell
cd ml-service
.\.venv\Scripts\python.exe -m uvicorn cartify_api:app --host 127.0.0.1 --port 8001
```

Then start the backend normally. Stopping the backend leaves this independent ML
process running. Health/status endpoints: `/health` and `/models` on port 8001.

Advertisement model metadata is available at `/ads/models`; inference routes are
`/ads/recommend-regions` and `/ads/recommend-categories`. Express computes the exact
17 historical features from Cartify orders. Python does not read MongoDB or Olist
CSVs during inference. See `backend/ADVERTISING.md` for the feature contract.

## Regression tests

From this folder, using the configured local environment:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p test_ad_recommendation.py
```

This covers saved advertisement artifacts, HTTP validation and all four existing
price prediction baselines. Model training is not part of local startup or tests.
