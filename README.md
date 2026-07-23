# Mobile Hub POS

An offline desktop POS and inventory management system for mobile phone shops in Pakistan, built with Electron, React, TypeScript, and Tailwind CSS.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 33 |
| Renderer | React 18 + TypeScript (strict) |
| Build Tool | electron-vite |
| Styling | Tailwind CSS (hand-built components) |
| Database | better-sqlite3 (local, phase 2) |
| Packaging | electron-builder |

## Project Structure

```
src/
├── main/          # Electron main process
├── preload/       # Preload scripts (contextBridge)
├── renderer/      # React app (Vite-built)
│   └── src/
│       ├── assets/       # CSS & static assets
│       ├── components/   # Reusable UI components
│       ├── screens/      # Page-level components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utility functions
└── shared/        # TypeScript types shared across processes
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (Electron + Vite with hot reload)
npm run dev

# Type-check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Security

- `contextIsolation: true` — renderer is isolated from main process
- `nodeIntegration: false` — no direct Node.js access from renderer
- Communication only through the preload bridge (`contextBridge.exposeInMainWorld`)

## Package Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Electron with Vite hot-reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## License

Private / Proprietary

