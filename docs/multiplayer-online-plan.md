# Multiplayer Online Mode - Implementation Plan & Progress

## Implementation Progress Status

- [x] Phase 1: Infrastructure & Security Setup
  - [x] Install firebase and firebase-admin dependencies
  - [x] Setup lib/firebase.js (Client SDK singleton with connection leak guards)
  - [x] Setup lib/firebaseAdmin.js (Server SDK with strict credential isolation)
  - [x] Setup app/api/auth/discord/route.js (OAuth2 initiation)
  - [x] Setup app/api/auth/callback/route.js (Exchange code, mint Firebase Custom Token)
  - [x] Setup app/api/cron/cleanup-rooms/route.js (3-hour TTL room garbage collection)
  - [x] Setup vercel.json (Cron config)
- [x] Phase 2: Core Logic Extraction & Room Management
  - [x] Extract gameReducer to lib/gameReducer.js (clean extraction without breaking local mode)
  - [x] Setup lib/roomManager.js (Room lifecycle, validation, presence, Room TTL, action dispatcher)
  - [x] Setup lib/onlineGameSync.js (Host/Player sync controller with connection cleanup on unmount)
  - [x] Update lib/gameEngine.js (Add non-breaking online metadata fields)
- [x] Phase 3: Lobby & Room Frontend
  - [x] Update components/TitleScreen.jsx (Add Online Mode entry button)
  - [x] Update app/page.jsx (Local/Online routing)
  - [x] Create app/lobby/page.jsx (Discord login, room creation, room joining)
  - [x] Create components/online/WaitingRoom.jsx (Slot assignment, house selection, start trigger)
- [x] Phase 4: Online Game Play View & Action Dispatch
  - [x] Create components/online/TurnTimer.jsx (15-second turn countdown with auto-roll fallback)
  - [x] Create components/online/PlayerView.jsx (Restricted player panel view)
  - [x] Create app/room/[code]/page.jsx (Orchestrator for Host, Player, and Spectator roles)
- [x] Phase 5: Security Rules, Error Boundaries & Quota Verification
  - [x] Create firebase-rules.json (Strict node access rules)
  - [x] Implement socket disconnection/reconnection handlers
  - [x] Run production build validation (npm run build - Passed with 0 errors)

---

## Goal Description

เพิ่มโหมด Multiplayer Online ให้เกมกระดาน Hogpod Legacy Board Game โดยใช้ Firebase Realtime Database (Spark/Free plan) สำหรับ real-time state sync ระหว่างผู้เล่น 4 คน + Admin 1 คน (ผู้ชม/Streamer) ต่อ 1 ห้อง ผ่านระบบสร้าง/เข้าห้องด้วยรหัส 6 ตัว พร้อม Discord OAuth2 Login สำหรับยืนยันตัวตน

### Design Principles & Server Safety Constraints
1. **Zero Breaking Changes to Local Mode**: โหมดเล่นคนเดียว (Local) ทำงานตามปกติ 100%
2. **Host-Authoritative Execution**: Host เป็นตัวประมวลผล state transitions หลัก และเขียน state ที่ validate แล้วลง Firebase
3. **Strict Credential Isolation**: Service Account Key และ Client Secret จะรันเฉพาะบน Server-side (Next.js API Route) เท่านั้น ไม่ส่งไปยัง Client เด็ดขาด
4. **Connection Leak Prevention**: ทุก Firebase RTDB listener (`onValue`, `onDisconnect`) มี cleanup function เสมอเมื่อ unmount ป้องกัน socket ค้างและ connection ล้น quota
5. **Room TTL & Quota Protection**: ห้องทุกห้องมีอายุสูงสุด 3 ชั่วโมง (10,800,000 ms) หากเล่นไม่จบหรือ Host ปิดหน้าจอ ระบบจะลบข้อมูลทิ้งอัตโนมัติ 3 ชั้น (Client check, Host timer, Server cron) ป้องกัน connection และ storage เกินลิมิต Spark Plan (100 concurrent connections)

---

## Security & Reliability Architecture

### 1. Environment Variables Configuration
ตัวแปรที่ต้องตั้งค่าใน `.env.local` และ Vercel Environment Variables:

Server-Only (ห้ามมี prefix NEXT_PUBLIC_):
- `DISCORD_CLIENT_ID`: Discord Application Client ID
- `DISCORD_CLIENT_SECRET`: Discord Application Client Secret
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Full JSON string ของ Firebase Service Account
- `CRON_SECRET`: Random string สำหรับ authenticate Vercel Cron

Client & Server:
- `NEXT_PUBLIC_APP_URL`: Base URL (เช่น https://yourdomain.com หรือ http://localhost:3005)
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase Web API Key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: project-id.firebaseapp.com
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`: https://project-id-default-rtdb.firebaseio.com
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: project-id

### 2. Connection Lifecycle & Memory Leak Guard
- **Heartbeat & Presence**: ใช้ `.info/connected` ร่วมกับ `onDisconnect().update({ online: false })`
- **Listener Unsubscription**: เก็บ unsubscribe callback ไว้ใน React `useEffect` cleanup ทุกครั้ง
- **Offline Fallback**: หาก Host หลุด ผู้เล่นจะเห็น notification สถานะ และระบบรอ Host reconnect ได้สูงสุด 60 วินาที

---

## Architecture Overview

```mermaid
graph TB
    subgraph Client Browser
        TS[Title Screen - Local / Online]
        LP[Lobby Page - Create / Join Room]
        GP_HOST[Game Page - HOST: Full Board, Admin, Reducer]
        GP_PLAYER[Game Page - PLAYER: Personal Panel, 3D Board]
        GP_ADMIN[Game Page - SPECTATOR: Full Board, Streamer Panel]
    end

    subgraph Vercel Serverless API
        AUTH[/api/auth/discord - OAuth2 Redirect]
        CB[/api/auth/callback - Token Exchange]
        CRON[/api/cron/cleanup-rooms - 3hr TTL Room Cleanup]
        FT[Firebase Admin SDK - Custom Token Minting]
    end

    subgraph Firebase Spark Plan
        RTDB[(Realtime Database - rooms / presence / state)]
        FA[Firebase Auth - Custom Token Authentication]
    end

    subgraph Discord
        DO[Discord OAuth2 API]
    end

    TS -->|Select Online| LP
    LP -->|Discord Login| AUTH
    AUTH -->|Authorize| DO
    DO -->|Callback Code| CB
    CB -->|Mint Token| FT
    FT -->|Custom Token| FA
    FA -->|Auth Session| LP

    LP -->|Create / Join| RTDB
    GP_HOST <-->|Sync State & Actions| RTDB
    GP_PLAYER <-->|Listen State / Dispatch Actions| RTDB
    GP_ADMIN <-->|Listen State / Admin Tools| RTDB
    CRON -->|Purge Expired Rooms| RTDB
```

---

## Realtime Database Schema

```
/rooms/{roomCode}
  ├── meta
  │   ├── roomCode: "ABC123"
  │   ├── hostUid: "discord:123456"
  │   ├── hostName: "PlayerName"
  │   ├── createdAt: serverTimestamp
  │   ├── expiresAt: 1720000000000 (now + 3 hours)
  │   ├── status: "waiting" | "playing" | "finished" | "expired"
  │   └── maxPlayers: 4
  ├── players
  │   ├── {uid}
  │   │   ├── displayName: "PlayerName"
  │   │   ├── avatar: "https://..."
  │   │   ├── houseId: "watrat" | "plodfindr" | "anal" | "slarf" | null
  │   │   ├── slot: 0 | 1 | 2 | 3
  │   │   ├── ready: true | false
  │   │   ├── online: true | false
  │   │   └── joinedAt: serverTimestamp
  ├── spectators
  │   └── {uid}
  │       ├── displayName: "AdminName"
  │       └── online: true | false
  ├── gameState
  │   └── (Full serialized game state written only by Host)
  └── actions
      └── {actionPushId}
          ├── type: "ROLL_DICE" | "USE_SKILL" | "USE_POTION" | "BUY_ITEM" | ...
          ├── playerUid: "discord:123456"
          ├── payload: { ... }
          └── timestamp: serverTimestamp
```

---

## Implemented Files Summary

### 1. Created Files (14 files)

1. `lib/firebase.js`: Client SDK Singleton initialization with connection safety
2. `lib/firebaseAdmin.js`: Server SDK Singleton initialization with private key parsing protection
3. `lib/roomManager.js`: Room creation, joining, house selection, TTL checks, action emission
4. `lib/onlineGameSync.js`: Host and Player sync managers with automatic listener cleanup
5. `lib/gameReducer.js`: Pure game reducer extracted from `app/page.jsx`
6. `app/api/auth/discord/route.js`: Endpoint for Discord OAuth2 redirection
7. `app/api/auth/callback/route.js`: Endpoint for token exchange and Custom Token generation
8. `app/api/cron/cleanup-rooms/route.js`: Serverless cron endpoint for 3-hour TTL purging
9. `app/lobby/page.jsx`: Lobby page for authenticated Discord users
10. `app/room/[code]/page.jsx`: Multi-role room page (Waiting, Host View, Player View, Spectator View)
11. `components/online/WaitingRoom.jsx`: House selection grid, player ready states, start trigger
12. `components/online/PlayerView.jsx`: Dedicated player HUD with single player panel and action buttons
13. `components/online/TurnTimer.jsx`: 15-second countdown with auto-roll triggering
14. `vercel.json`: Cron schedule definition for 30-minute interval
15. `firebase-rules.json`: RTDB security rules

### 2. Modified Files (4 files)

1. `package.json`: Added `firebase` and `firebase-admin` dependencies
2. `components/TitleScreen.jsx`: Added "เล่นออนไลน์ (ONLINE)" button
3. `app/page.jsx`: Delegated reducer to `lib/gameReducer.js`, added online navigation handler
4. `lib/gameEngine.js`: Added `_onlineUid`, `_onlineName`, `_onlineAvatar` properties to `createPlayer()`

---

## Verification & Build Results

- `npm.cmd run build`: **Compiled successfully** with zero errors across all 8 static and dynamic routes.
- Local mode regression check: Local mode state reducer, storage hydration, and UI remain intact.
