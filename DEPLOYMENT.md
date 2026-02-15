# AICCORE Museum Agent Arena: Running & Deployment Guide

Welcome to the **AICCORE Museum Agent Arena**. This guide will teach you how to run the system locally for development and how to deploy it in a physical museum environment.

---

## 🏗 System Architecture

The Arena consists of three main components that must run simultaneously:
1.  **AICCORE Backend (FastAPI Wrapper)**: The brain of the site. It manages sessions, station unlocks, and telemetry.
2.  **Langflow Engine (Frontend Dev Server)**: The visual agent builder that students interact with.
3.  **AICCORE Dashboard (Next.js)**: The Command Center. It handles the Station Lock Screen and the Live Leaderboard.

---

## 🚀 How to Run Locally (Development)

To get the full Arena running, you need three terminal windows open:

### 1. Start the AICCORE Backend (The Brain)
```bash
# Terminal 1
source .venv/bin/activate
export PYTHONPATH=$(pwd)
export AICCORE_BACKEND_ONLY=true
python3 aiccore/wrapper/main.py
```
*Accessible at: http://localhost:7860/docs*

### 2. Start the Langflow Builder (The Engine)
```bash
# Terminal 2
cd langflow/src/frontend
export VITE_PORT=5173
npm run start -- --host 0.0.0.0
```
*Accessible at: http://localhost:5173*

### 3. Start the Arena Dashboard (The Command Center)
```bash
# Terminal 3
cd aiccore/dashboard/museum-arena-dashboard
npm run dev
```
*Accessible at: http://localhost:3000 (Spectator View)*
*Accessible at: http://localhost:3000/builder (Student Station)*

---

## 🏛 How to Deploy (Museum Environment)

In a museum, you typically have one central server and multiple builder stations (Raspberry Pis, iPads, or Mini-PCs) connected via a local LAN.

### 1. Preparation
1.  **Server**: A powerful workstation (Mac Studio, PC with GPU) located in the server room or behind the exhibit.
2.  **Network**: Static IP for the server (e.g., `192.168.1.50`).
3.  **Config**: Update `aiccore/dashboard/museum-arena-dashboard/app/builder/page.tsx` to use the server's IP instead of `localhost`.

### 2. Production Build
For the best performance, build the frontend assets:
```bash
# Build Arena Dashboard
cd aiccore/dashboard/museum-arena-dashboard
npm run build
npm run start

# Build Langflow UI
cd langflow/src/frontend
npm run build
# Serve using a static file server or integrated with the Python backend
```

### 3. Process Management (PM2)
We recommend using **PM2** to ensure the services auto-restart if the power fluctuates.
```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start "python3 aiccore/wrapper/main.py" --name aiccore-backend
pm2 start "cd langflow/src/frontend && npm run start" --name langflow-engine
pm2 start "cd aiccore/dashboard/museum-arena-dashboard && npm run start" --name arena-dashboard

# Save the process list
pm2 save
pm2 startup
```

### 4. Station Lockdown
For each student station:
1.  Open the browser to `http://<SERVER_IP>:3000/builder`
2.  Set the browser to **Kiosk Mode** (F11 or specialized Kiosk software).
3.  The station will remain on the "Locked" screen until a student enters their 4-digit code.

---

## 🔐 Security Note
*   The **"0000"** code is a developer bypass. For production, codes should be generated and distributed via the museum's registration system.
*   The **Station Eraser** automatically purges the workspace every time a station is reset, ensuring the next student starts with a clean slate.

---

**Happy Building! 🚀**
