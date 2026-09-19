# PitchBid — Real-Time Football Player Auction Platform

A production-ready, full-stack Football Player Auction platform designed with stadium-grade performance, real-time Socket.IO synchronization, server-side atomic bid locking, and dark mode UI.

---

## Key Highlights & Features

### 1. Two Distinct Roles
- **Auctioneer (Host):**
  - Create auctions with customizable purse, squad size limits (min & max), era range (e.g. 2010–2024), base price, increments, and timer durations.
  - Automatically generates a 6-character team join code (`roomCode`) and, for manual auctions, an `auctioneerCode`.
  - **Lobby Management:** View joined teams in real time, kick unwanted teams, and launch auction when at least 2 teams are ready.
  - **Live Auction Controls:** Start, pause, resume, skip player (mark unsold), undo last sale, and end auction.
  - **Manual Mode Adjudication:** Dropdown selection of winning team with real-time budget check, price input with quick increments (+1M, +2M, +5M), confirm sale, or mark unsold.
  - **Player Pool Management:** View all players, filter by position/era, add players manually, upload CSV/JSON, or re-seed 65+ football legends.

- **Player (Team Owner):**
  - Enter auction arena via 6-character room code.
  - Customize team franchise: name, club color, and team badge/crest emoji.
  - **Live Bidding Arena:** High-visibility current player card, FIFA-style rating crest, scoreboard, and live countdown timer.
  - **One-Click Bid Button:** Automatically calculates the exact next bid (`currentBid + increment` or `basePrice`).
  - **Client & Server Guardrails:** Instantly alerts if bid is disabled due to squad size, insufficient reserve, self-outbidding, or pause.
  - **Own Team HUD:** Live display of remaining purse, squad count, and maximum permitted bid.

### 2. Squad Reserve Rule Enforcement
Both client and server enforce the mathematical reserve rule:
$$\text{Bid} \le \text{PurseLeft} - (\text{MinSquad} - \text{CurrentSquadSize} - 1) \times \text{BasePrice}$$
This guarantees a team cannot blow their entire purse early and be left unable to meet the league's minimum squad requirement.

### 3. Server-Side Atomic Concurrency
- `auctionLocks`: In-memory promise queue (mutex pattern) on every bid operation per auction.
- Eliminates race conditions if multiple teams tap "Bid" simultaneously at the last millisecond.
- Live server timer is the single source of truth (`timerEndsAt`), emitting periodic tick syncs to eliminate client drift.

### 4. Results & Reporting
- Final team rosters with player names, positions, ratings, and hammer prices.
- Expenditure leaderboard and remaining purse standings.
- Unsold player ledger.
- Export to **CSV** and **Printable Team Sheet**.
- **My Teams:** Personal franchise history across all leagues.

---

## Tech Stack

| Tier | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Motion |
| **Backend** | Node.js, Express, Socket.IO, TypeScript (`tsx`, `esbuild`) |
| **Database** | MongoDB with Mongoose + Automatic in-memory persistence fallback |
| **Auth** | JWT (JSON Web Tokens), Bcryptjs password hashing, Role Middleware |

---

## Project Structure

```
├── client/                     # Client configuration & environment templates
│   └── .env.example
├── server/
│   ├── config/db.ts            # Mongo / In-Memory database store
│   ├── controllers/            # Auth, Auction, and Player controllers
│   ├── data/seedPlayers.ts     # 65+ verified international football legends
│   ├── middleware/             # JWT auth, role validation, input validation
│   ├── models/                 # Database schemas & abstracted repository
│   ├── routes/                 # REST API routes
│   ├── scripts/seed.ts         # Pre-seeds demo accounts & rooms
│   ├── services/               # AuctionService (atomic locks, live timers, rules)
│   ├── sockets/socketHandler.ts# Socket.IO rooms & event routing
│   ├── tests/bidValidation.test.ts # Unit tests for bid validation logic
│   └── .env.example
├── src/                        # Frontend React Application
│   ├── components/             # PlayerCard, CountdownTimer, PurseTable, BidLog, etc.
│   ├── context/                # AuthContext, ToastContext
│   ├── hooks/                  # useSocket hook
│   ├── pages/                  # Login, Register, Host Dashboard, Control Room, etc.
│   ├── services/api.ts         # REST API client
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── App.tsx                 # Core router & layout
│   └── main.tsx                # React entrypoint
├── server.ts                   # Unified Express & Vite entry point
├── package.json
└── README.md
```

---

## Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Seed Database & Run Tests
Populates demo accounts and two pre-configured auctions (one Live, one Manual):
```bash
npx tsx server/scripts/seed.ts
npx tsx server/tests/bidValidation.test.ts
```

### 4. Start Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

---

## Pre-Configured Demo Credentials

You can log in manually or use the **1-Click Demo Buttons** on the login page:

| Role | Email | Password | Details |
|---|---|---|---|
| **Auctioneer (Host)** | `host@auction.com` | `admin123` | Full host permissions |
| **Team Owner 1** | `owner1@auction.com` | `player123` | Real Kings FC |
| **Team Owner 2** | `owner2@auction.com` | `player123` | Catalan Stars FC |
| **Team Owner 3** | `owner3@auction.com` | `player123` | London Gunners |

### Pre-Seeded Auction Rooms

1. **Room Code `LEAGUE` (Live Mode):**
   - World Legends Premier Auction 2026
   - 65 international football legends (Messi, Ronaldo, Zidane, Mbappé, Haaland, etc.)
   - 4 teams registered and ready in lobby.

2. **Room Code `CHAMP1` (Manual Mode):**
   - Champions Classic
   - Secret Auctioneer Code: `MANAGE`
   - Host manually confirms winning bids and hammer prices.

---

## Testing Bid Validation
Run the unit test suite to verify the reserve rule and outbid logic:
```bash
npx tsx server/tests/bidValidation.test.ts
```
