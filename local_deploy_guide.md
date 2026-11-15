# Run COIP locally on Windows

This guide uses PowerShell and assumes your checkout is at `D:\Kartika`. Replace that path if you move the project.

You will run two programs in two terminals:

| Program | Purpose | Address |
|---|---|---|
| Python backend | Loads demo data and calculates simulation results | `http://127.0.0.1:8000` |
| Vite frontend | Displays the app in your browser | `http://127.0.0.1:5173` |

Keep both terminals open while using the app. This runs on your own computer; it does not publish a website. No Docker or database setup is required.

## 1. Check your tools

Open PowerShell and run:

```powershell
Set-Location D:\Kartika
python --version
node --version
npm.cmd --version
```

Use Python 3.12 for the setup described here and Node.js 24 or newer for the project's frontend tests. At guide creation, this workstation reported Python 3.12.10, Node.js 26.8.1 and npm 12.2.2.

If a command is not found, install the corresponding Python or Node.js runtime, then open a new PowerShell terminal. If Windows provides Python through `py` instead, use `py -3.12` in the environment-creation command below.

Commands below use `npm.cmd` to avoid the PowerShell execution-policy issue that can occur with `npm.ps1`.

## 2. First-time installation

Run these commands from the repository root:

```powershell
Set-Location D:\Kartika
python -m venv frontend/.venv
.\frontend\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location D:\Kartika\frontend
npm.cmd ci
```

Wait for each command to finish successfully before continuing. Installing dependencies needs internet access. If `frontend\.venv` already contains a working project environment, skip the environment-creation command and use it.

You do not need to activate the virtual environment: the startup commands call its Python executable directly. You normally only repeat dependency installation after dependency files change.

## 3. Start the backend — Terminal 1

Open a PowerShell terminal and run:

```powershell
Set-Location D:\Kartika
$env:COIP_OPERATOR_TOKEN = [guid]::NewGuid().ToString('N')
Write-Output "Local replay token: $env:COIP_OPERATOR_TOKEN"
.\frontend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Copy the generated local replay token for use in step 5. It authorizes replay/reset actions on this local instance. Keep it out of recordings. It is set only in this terminal's environment and inherited by the backend process.

Wait for the server to report that application startup is complete and that Uvicorn is running on port 8000. The terminal remaining busy is normal.

To check the backend, open these addresses in your browser:

- `http://127.0.0.1:8000/api/overview` — should display JSON data.
- `http://127.0.0.1:8000/docs` — should display the API documentation.

The backend root address alone is not the app UI and may return “Not Found.”

## 4. Start the frontend — Terminal 2

Open a second PowerShell terminal; leave Terminal 1 running.

```powershell
Set-Location D:\Kartika\frontend
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173** in your browser.

You should see the COIP **Operasi** screen and **API terhubung** in the sidebar. On a fresh backend startup, the supplied fixture data should show 8 assets, 19 events and 2 incidents.

No frontend environment file is needed for this setup. Vite forwards `/api` requests to port 8000. If you already have a `frontend/.env.local` file from another deployment, ensure `VITE_API_BASE_URL` is empty for this local setup, then restart Vite. Do not put the operator token in a `VITE_*` variable.

## 5. Run your first simulation

1. Open **Simulasi** in the sidebar.
2. Select the incident for **SRV-APP**, initially **INC-0001**.
3. Click **A — Isolasi SRV-APP**. Portal should become unavailable.
4. Click **B — Blokir alur teramati**. Portal should become degraded.
5. Click **C — Batasi akses segmen**. Portal should become unavailable, with EXT-C2 still reachable.
6. Click **Bandingkan semua skenario**.

Check these rounded UI scores:

| Scenario | Pembatasan | Ketersediaan |
|---|---:|---:|
| A | 100% | 75% |
| B | 83% | 88% |
| C | 75% | 75% |

Scenario C should be marked as dominated by isolation. The full explanations and removed-flow checks are in [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md).

Simulation does not require the replay token and does not apply real network changes. You do not need to reset between scenarios.

To export results, open **Laporan**, select the same incident and click **Unduh laporan investigasi**. Open the downloaded `.md` file with a text editor or Markdown preview.

## 6. Optional: practise event replay

Do this after your first successful simulation so you know what a fully loaded scenario looks like.

1. Paste the token printed in Terminal 1 into the app's **Token operator** field.
2. Open **Operasi** and click **Ulangi**.
3. Read the confirmation and click **Mulai ulang skenario**.
4. Click **Lanjutkan** to load one event at a time.
5. Click **Muat sisa skenario** to finish loading all 19 events before checking the three expected Twin outcomes again.
6. Select the current SRV-APP incident. After replay, its ID can differ from INC-0001; old links may no longer work.

Reset clears the connected backend's in-memory events and incidents for all users of that instance, including ingested records. It leaves the fixture files intact. Use your own local instance for practice.

Reloading the browser clears the UI's token from memory. Enter it again when you want to replay. If you restart the backend using step 3, a new token is generated; use that new value.

## 7. Stop the app

Press **Ctrl+C** in Terminal 2 to stop Vite, then **Ctrl+C** in Terminal 1 to stop the backend.

The backend stores runtime data in memory. Restarting it reloads the initial fixtures and loses the current replay/ingestion state. Download any report you want to keep before stopping it.

## 8. Start again next time

You normally do not need to reinstall anything. Repeat **step 3** in one terminal and **step 4** in another, then open `http://127.0.0.1:5173`.

If the team changed `requirements.txt`, rerun the Python dependency installation. If `package.json` or `package-lock.json` changed, rerun `npm.cmd ci` in `frontend` before starting Vite.

## 9. Optional: check the production build locally

Keep the backend running. Stop the development frontend with Ctrl+C, then run in Terminal 2:

```powershell
Set-Location D:\Kartika\frontend
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173` again. The preview uses the built files and the configured API proxy. Keeping port 5173 makes the address consistent with the development setup. Do not run dev and preview on that port simultaneously.

Do not double-click `frontend/dist/index.html` to run the app: use the preview server. Preview is for local checking; public hosting remains a separate task.

## Troubleshooting

| Problem | What to do |
|---|---|
| `python` or `node` is not recognized | Install the runtime, reopen PowerShell and repeat step 1. If available, use `py -3.12` to create the Python environment. |
| `.venv\Scripts\python.exe` is missing | Complete step 2 from `D:\Kartika`. |
| `No module named uvicorn`, `fastapi` or `networkx` | Run `.\frontend\.venv\Scripts\python.exe -m pip install -r requirements.txt` from the repository root. Use that same environment to start the backend. |
| `npm.ps1 cannot be loaded` | Use `npm.cmd`, exactly as shown. No execution-policy change is needed. |
| Port 8000 or 5173 is already in use | Check whether your earlier backend/frontend terminal is still running. Use that instance or stop your earlier process with Ctrl+C. Do not terminate an unfamiliar process. |
| `API tidak tersedia` or proxy connection refused | Confirm Terminal 1 is running on port 8000. Open `/api/overview` directly, then click **Hubungkan kembali** in the app. |
| API requests go to an old hosted address | Check `VITE_API_BASE_URL` in your frontend environment files or shell environment. Leave it empty and restart Vite for the default local proxy. |
| Reset/step returns 403 | Paste the current backend token into **Token operator**. If the backend was started without the environment variable, stop it and repeat step 3. |
| Token stopped working after refresh | Re-enter it: the browser only keeps it in memory. |
| Presets or an incident return 404 | Refresh the app and select the current SRV-APP incident. After code updates, restart the backend so it loads the current routes. |
| No incident after reset | Load more events, then use **Muat sisa skenario** and reselect the incident. |
| Scores differ from the reference | Ensure all 19 fixture events are loaded and SRV-APP is selected. See the simulation guide before treating this as an engine error. |
| Phone cannot open `127.0.0.1:5173` | This guide binds servers to your computer only. Use C's hosted URL for phone testing; a phone's `127.0.0.1` refers to the phone itself. |

## Optional developer checks

Run backend tests from a separate terminal at the repository root:

```powershell
Set-Location D:\Kartika
.\frontend\.venv\Scripts\python.exe -B -W error::ResourceWarning -m unittest discover -s backend/tests -v
```

Run frontend tests and a build from the frontend directory:

```powershell
Set-Location D:\Kartika\frontend
npm.cmd test
npm.cmd run build
```

The backend suite starts isolated API processes for its HTTP tests. You do not need to manually reset your running demo for these tests.

This guide was checked against the repository's dependency files, startup scripts, proxy settings and token handling. Creating it did not start either server or install dependencies.
