# KCIM App

A desktop application built with **Tauri 2** + **SolidJS** + **Rust** for Kyocera Cloud Information Manager.

## Features

- **User Authentication** — Register/login with Argon2 password hashing (stored locally in SQLite)
- **Session Management** — 30-minute token expiry with live countdown and session extension
- **Create Folders** — Create folders on the filesystem with path validation and duplicate detection
- **Folder Tracking** — All created folders are logged and displayed in a history table
- **Password Policy** — Requires 8+ characters, uppercase, lowercase, number, and symbol

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- [Rust](https://www.rust-lang.org/tools/install) (1.77.2+)
- **Windows**: Visual Studio Build Tools with C++ workload (required by Tauri)

## Setup

```bash
# Clone the repository
git clone https://github.com/rj-yanson/kcim-app.git
cd kcim-app

# Install frontend dependencies
pnpm install
```

Rust dependencies are automatically fetched on first build via Cargo.

## Development

```bash
pnpm dev
```

This runs `tauri dev` which:
1. Starts the Vite dev server (SolidJS frontend) on `http://localhost:5173`
2. Compiles the Rust backend
3. Opens the desktop window with hot-reload enabled

## Build for Production

```bash
pnpm build
```

This creates an optimized production binary. The installer/executable will be in:

```
src-tauri/target/release/bundle/
```

## Project Structure

```
kcim-app/
├── src/                        # SolidJS frontend
│   ├── index.tsx               # Router setup
│   ├── index.css               # Global styles
│   ├── lib/api.ts              # Typed Tauri invoke wrappers
│   ├── stores/auth.ts          # Reactive auth state + session timer
│   └── routes/
│       ├── Login.tsx           # Login & registration page
│       └── Dashboard.tsx       # Folder creation + history
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs            # App entry point
│   │   ├── lib.rs             # Tauri builder, plugin registration
│   │   ├── auth.rs            # Auth commands (login, register, sessions)
│   │   ├── fs_ops.rs          # Filesystem commands (create/list folders)
│   │   └── error.rs           # Unified error type
│   ├── capabilities/
│   │   └── default.json       # Tauri permissions
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri configuration
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Data Storage

The SQLite database (`kcim_users.db`) is stored in the OS app data directory:

- **Windows**: `%APPDATA%\com.kyocera.kcim\`
- **macOS**: `~/Library/Application Support/com.kyocera.kcim/`
- **Linux**: `~/.config/com.kyocera.kcim/`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SolidJS, TypeScript, Vite |
| Backend | Rust, Tauri 2 |
| Routing | @solidjs/router |
| Password Hashing | Argon2 |
| Database | SQLite (rusqlite) |
| Dialog | tauri-plugin-dialog |
