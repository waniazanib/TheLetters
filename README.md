# TheLetters 

**TheLetters** is a high-fidelity, high-contrast digital stationery platform for styling, sealing, and delivering interactive letters, historic scrolls, and vintage envelopes.

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [✨ Core Capabilities](#-core-capabilities)
- [🛠️ Tech Stack & Engineering Specs](#-tech-stack--engineering-specs)
- [🧩 Hybrid Offline/Online Storage Engine](#-hybrid-offlineonline-storage-engine)
- [📂 Project Repository Structure](#-project-repository-structure)
- [🚀 Local Installation & Execution](#-local-installation--execution)
- [⚙️ Environment Configuration](#%EF%B8%8F-environment-configuration)
- [🌟 Future Enhancements](#-future-enhancements)

---

## 📌 Project Overview

**TheLetters** transforms standard email or digital messages into an immersive, multi-sensory aesthetic experience. Users design stationery to their precise specifications, adding sensory elements such as cinematic visual dust overlays. 

The system relies on real physical wax seal placement physics and custom vector canvas handwriting to replicate authentic lettercraft. Created letters are locked into customized vintage envelopes or engraved wood-and-metal scroll tubes, ready to be sent securely to recipients via un-guessable shared links.

---

## ✨ Core Capabilities

### 1. Interactive Stationery Design Engine
- **Delivery Formats**: Choose between multi-flap foldable **Envelopes** (Vintage, Modern, Royal, Floral, Love Letter, Luxury) or continuous **Message Scrolls** wrapped in luxury casing (Metal or wood).
- **Physical Wax Seal Sculpting**: Place interactive wax seals anywhere on the envelope closure. Select vintage designs (Crown, Rose, Heart, Compass, Moon, Custom Initial) paired with authentic seal colors (Sapphire, Gold, Crimson, Emerald, Matte Black).
- **Philatelic Postage Stamp Library**: Configured with a dynamic library of **many distinct high-quality vintage stamp templates** spanning historical, nature, romance, fantasy, travel, and seasonal motifs. Stamps can be placed, scaled, rotated, and shifted on the envelope.
- **Micro-Decorations**: Fine-tune paper textures, aging indices, corner ornaments (Gilded, Royal, Floral), fold lines, and crease factors.

### 2. Multi-Sensory Communication
- **Atmospheric Visual Particle Overlays**: Dynamically triggers hardware-accelerated particle effects upon opening, including *Sakura Petals, Floating Lanterns, Rose Petals, Gilded Dust, Fireflies, and Soft Snowfalls*.

### 3. Digital Lettercraft & Handwriting
- **Scribble Canvas**: Integrated handwriting pad capturing dynamic user strokes with adjustable brush thickness, custom colors, and precise coordinate arrays for native letter signing.
- **Graceful Typography**: Includes handwriting curves and historical fonts separated into `Elegant`, `Casual`, and `Vintage` categories.

### 4. Courier & Delivery Controls
- **Nostalgic Delayed Delivery**: Schedule letters to hold in an airtight locked state until a specified UTC timestamp in the future, preserving the suspense of postal post.
- **Self-Destruct/One-Time Views**: Set letters to permanently self-destruct after a single recipient opening.

---

## 🛠️ Tech Stack & Engineering Specs

- **Frontend Core**: React 19 (TypeScript) using strict ESM module standard.
- **Build System & Tooling**: Vite 6 for optimized module bundling.
- **Client Transitions**: `motion` (via `motion/react`) for spatial morphs, flap unfolding transitions, and responsive scroll rotations.
- **Styling Paradigm**: Tailwind CSS 4 using direct CSS variable bindings and fluid system padding.
- **Icons**: Lucide React for consistent decorative iconography.
- **Backend Services**: Native Express API layer for server functions.
- **Database Architecture**: Google Firebase Firestore (NoSQL) with real-time listeners.
- **Identity Provider**: Firebase Authentication (supporting Email/Password credentials and Google OAuth popups).

---

## 🧩 Hybrid Offline/Online Storage Engine

To guarantee resilience against network interruptions and environment constraints, the platform operates a custom **hybrid synchronization layer**:

1. **State Isolation**: When Firebase configurations are missing or in-transit, the database falls back seamlessly into an **Offline Sandbox Mode** utilizing scoped local storage models to capture letters, favorite registries, and guest profiles.
2. **Deterministic Guest Mode**: Guest sessions generate stable visual signatures stored locally, allowing drafts, history, and letters to persist on-device across page reloads.
3. **Verified Account Syncing**: Upon authenticated sign-in, locally held drafts and letters can be synchronized directly into Cloud Firestore databases.

---

## 📂 Project Repository Structure

```
├── .env.example              # Template containing all server-side environment configurations
├── .gitignore                # Paths excluded from tracking (node_modules, dist)
├── assets/                   # Non-code assets, raw illustration layers, and logos
├── firebase-blueprint.json   # Intermediate JSON Schema specifying database models and paths
├── firestore.rules           # Immutable security policies guarding read/write targets
├── index.html                # Vite entry framework for mounting DOM components
├── metadata.json             # Applet descriptor setting permissions and metadata
├── package.json              # Module declarations, engine locks, and workspace script runs
├── security_spec.md          # Exhaustive document describing database invariants and tests
├── tsconfig.json             # TypeScript structural guidelines
├── vite.config.ts            # Vite bundler options and Tailwind CSS configuration
└── src/                      # Source Code root
    ├── App.tsx               # Primary React component and root screen routing
    ├── data.ts               # Static stationery themes and philatelic stamp catalog 
    ├── firebase.ts           # Client initialization check for Firebase Auth/Firestore
    ├── index.css             # Root Tailwind imports and Google Font integrations
    ├── types.ts              # Declarations of domain stationery and user typing structures
    ├── components/           # Subdivided React interfaces
    │   ├── AuthScreen.tsx    # Clean modal interface handling Email/Google/Guest authorization
    │   ├── Dashboard.tsx    # Stationery cabinet sorting Outbox, Inbox, Drafts, and Favorites
    │   ├── LetterEditor.tsx  # Dynamic styling suite, writing paper, stamp room, and wax seals
    │   ├── LetterReader.tsx  # Interactive letter reading view with unfolding flaps and audio
    │   ├── HandwritingCanvas.# Vector coordinate capture area for signatures
    │   └── EffectsOverlay.tsx# Lightweight, independent WebGL canvas for particle dust and snow
    └── lib/
        └── db.ts             # Hybrid database logic, fallback state routing, and errors
```

---

## 🚀 Local Installation & Execution

### Prerequisites
Ensure you have **Node.js** (v18.x or higher) and **npm** installed on your system.

### 1. Clone & Set Up Directory
Open your terminal and run the following commands sequentially:
```bash
# Navigate to the workspace and install packages
npm install
```

### 2. Run the Development Server
Execute the bundler to run the application locally on the standard dev port:
```bash
npm run dev
```
Once initialized, open `http://localhost:3000` in your web browser to play with the stationery editor.

### 3. Build & Compile for Production
Ensure types and assets compile cleanly of any warnings:
```bash
# Verifies zero compile errors and outputs /dist assets
npm run build
```

---

## ⚙️ Environment Configuration

Define these keys within an active `.env` file at the root of the project to bind with web APIs and remote backends:

```env

# Standard Firebase Client Config (Optional - Fallbacks to Sandbox on omission)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---


