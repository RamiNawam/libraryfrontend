# GenDigitalTwin

A full-stack **digital twin–style graph application** for modeling and monitoring
integrations between enterprise systems such as **CRM, F&O, ODS, Azure Logic Apps,
REST APIs**, and other internal/external systems.

GenDigitalTwin gives teams a single visual canvas where every system, every
integration path, and every individual data flow is represented as a node or edge
on a graph. Some parts of the graph are purely *modeled* (drawn by a human to
document intent), while other parts are *connected* to live infrastructure (e.g.
Azure Logic Apps) so their real health and run status appear directly on the
diagram.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Backend Setup](#3-backend-setup)
4. [Frontend Setup](#4-frontend-setup)
5. [File Tree](#5-file-tree)
6. [What Each Important File / Folder Does](#6-what-each-important-file--folder-does)
7. [How the Frontend and Backend Communicate](#7-how-the-frontend-and-backend-communicate)
8. [How the REST APIs Work](#8-how-the-rest-apis-work)
9. [How the Graph Data Model Works](#9-how-the-graph-data-model-works)
10. [Entities, Groups, Dataflow Types, and Dataflows](#10-entities-groups-dataflow-types-and-dataflows)
11. [How Logic Apps Are Connected](#11-how-logic-apps-are-connected)
12. [How Refresh / Sync Works](#12-how-refresh--sync-works)
13. [Mode and Health Logic (mock / connected / not_connected / azure)](#13-mode-and-health-logic)
14. [Future Architecture Direction (CRM, ODS, APIs)](#14-future-architecture-direction)

---

## 1. Project Overview

GenDigitalTwin is a **"digital twin" of an enterprise integration landscape**. Instead
of keeping integration knowledge scattered across spreadsheets, Visio diagrams, and
people's heads, the application captures it as a **live, interactive graph**:

- **Systems** (CRM, F&O, ODS, Docmosis, external APIs) appear as **nodes**.
- **Integration paths** between systems appear as **dataflow type** nodes (rendered as
  triangles) and the **edges** that connect them.
- **Individual integrations** (a specific Logic App workflow, a specific API contract)
  live *inside* a dataflow type as **dataflows**.

The graph serves two purposes at once:

1. **Documentation / modeling** — draw how systems *should* talk to each other.
2. **Monitoring** — for integrations wired to real infrastructure (currently Azure
   Logic Apps), the graph shows live **health** (green / red / grey) pulled from the
   actual run history.

The whole thing is built as a classic two-tier app: a **React + React Flow** frontend
for the canvas, and a lightweight **Express** backend that persists the graph to a
local JSON file and talks to Azure on demand.

---

## 2. Tech Stack

### Backend
- **Node.js** — runtime
- **Express.js** — REST API server
- **dotenv** — loads configuration / secrets from `.env`
- **cors** — allows the Vite dev frontend to call the API cross-origin
- **nanoid** — generates short unique IDs for entities, groups, dataflows, etc.
- **File-based persistence** — the entire graph state lives in `db.json`
- **Azure Resource Manager REST API** — used to read Logic Apps run history
- **Microsoft Entra ID (client credentials flow)** — service-principal auth used to
  obtain an access token for Azure calls

### Frontend
- **React** — UI framework
- **TypeScript** — typed components and shared data model
- **Vite** — dev server and build tool
- **Tailwind CSS** — styling (with `postcss.config.js` + `tailwind.config.js`)
- **React Flow / `@xyflow/react`** — the interactive node/edge graph canvas
- **Zustand** — client-side state management for the graph

---

## 3. Backend Setup

The backend lives in `backend/` and is a standalone Express app.

```bash
cd backend
npm install
```

Create a `.env` file with the Azure / Entra ID credentials needed for Logic Apps
access (values are examples — use your own):

```env
PORT=4000

# Microsoft Entra ID (Azure AD) service principal
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_SUBSCRIPTION_ID=...
```

Run the server:

```bash
node server.js
# or, if a script is defined:
npm start
```

Useful scripts / files:

- **`server.js`** — starts the Express REST API.
- **`db.json`** — the persisted graph (created/seeded on first run or via bootstrap).
- **`reset.js`** — resets `db.json` back to a clean/seed state.

> The backend has **no external database** — `db.json` *is* the database. This keeps the
> app trivial to run locally and easy to inspect/version.

---

## 4. Frontend Setup

The frontend lives in `frontend/` and is a Vite + React + TypeScript app.

```bash
cd frontend
npm install
npm run dev      # start the Vite dev server
npm run build    # produce a production build in dist/
```

The frontend expects the backend API base URL to be reachable (configured inside
`src/api/client.ts`, typically pointing at `http://localhost:4000`). During development,
Vite serves the UI and `cors` on the backend allows the cross-origin API calls.

---

## 5. File Tree

```text
GENDIGITALTWIN
│
├── backend
│   ├── .env                         # secrets/config (Azure, port) — not committed
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                    # main Express REST API server
│   ├── db.json                      # file-based graph database (the persisted state)
│   ├── db.js                        # load/save helpers for db.json
│   ├── reset.js                     # resets db.json to a seed state
│   │
│   ├── integrations
│   │   └── logicApps
│   │       └── logicAppsClient.js   # calls Azure Logic Apps / ARM REST APIs
│   │
│   └── node_modules/
│
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite-env.d.ts
│   ├── .gitignore
│   ├── .editorconfig
│   ├── dist/                        # production build output
│   ├── node_modules/
│   │
│   └── src
│       ├── App.tsx                  # root React component / layout
│       ├── main.tsx                 # React entry point
│       ├── index.css                # Tailwind + global styles
│       │
│       ├── api
│       │   └── client.ts            # frontend → backend API client
│       │
│       ├── components
│       │   ├── canvas
│       │   │   ├── InfraCanvas.tsx       # the React Flow graph canvas
│       │   │   └── MiniMapStyled.tsx     # styled minimap overlay
│       │   │
│       │   ├── edges
│       │   │   ├── ConnectorEdge.tsx     # edges to/from triangle dataflow-type nodes
│       │   │   └── FlowEdge.tsx          # generic flow edge
│       │   │
│       │   ├── nodes
│       │   │   ├── ConnectionNode.tsx    # triangle node = a dataflow TYPE
│       │   │   ├── GroupNode.tsx         # grouping/container box
│       │   │   └── SystemNode.tsx        # system/entity node (CRM, F&O, …)
│       │   │
│       │   └── panels
│       │       ├── AddPanel.tsx          # add entities / groups / dataflow types
│       │       ├── ConnectionDrawer.tsx  # manage dataflows inside a dataflow type
│       │       ├── EdgeDrawer.tsx        # inspect/edit an edge
│       │       ├── flowDetail.tsx        # view/edit a single dataflow
│       │       ├── GroupDrawer.tsx       # edit a group
│       │       ├── NodeDrawer.tsx        # edit a system/entity node
│       │       ├── RefreshControl.tsx    # "Refresh now" → triggers Azure sync
│       │       └── Sidebar.tsx           # main navigation / controls sidebar
│       │
│       ├── hooks
│       │   ├── useGraphState.ts          # graph state orchestration hook
│       │   └── useSocketMock.ts          # mock realtime/socket behavior
│       │
│       ├── lib
│       │   └── timeAgo.ts                # "x minutes ago" formatting helper
│       │
│       ├── mock
│       │   └── data.ts                   # seed/mock graph data
│       │
│       ├── store
│       │   └── graphStore.ts             # Zustand store for graph state
│       │
│       └── types
│           └── index.ts                  # shared TypeScript types
│
└── README.md
```

---

## 6. What Each Important File / Folder Does

### Backend

| File / Folder | Responsibility |
|---|---|
| `server.js` | The **main Express REST API server**. Declares all `/api/*` routes, wires up `cors`, and is the single entry point of the backend. |
| `db.js` | Loads and saves the local JSON database. Provides `read`/`write` helpers so route handlers don't touch the filesystem directly. |
| `db.json` | The **graph state itself** — entities, groups, dataflow types, dataflows, edges, and their mode/health/azure metadata. This is the source of truth. |
| `reset.js` | Utility script to reset `db.json` to a known seed state (handy during development/demos). |
| `.env` | Holds the port and the **Azure / Microsoft Entra ID** credentials. Never committed. |
| `integrations/logicApps/logicAppsClient.js` | The **Azure Logic Apps client**. Authenticates with Entra ID, then calls Azure Resource Manager REST APIs to read Logic App run history (both Consumption and Standard kinds). |
| `integrations/` (folder) | The home for **all external-system integrations**. Today it only contains `logicApps`, but it is structured to grow (see [Future Architecture](#14-future-architecture-direction)). |

### Frontend

| File / Folder | Responsibility |
|---|---|
| `src/main.tsx` | React entry point — mounts `App` into the DOM. |
| `src/App.tsx` | Root layout — composes the canvas, sidebar, and panels. |
| `src/api/client.ts` | The **frontend-to-backend API client**. Every backend call (fetch graph, add entity, sync Azure, etc.) is defined here. |
| `src/store/graphStore.ts` | The **Zustand store** that holds the current graph in the browser and exposes actions to mutate it. |
| `src/types/index.ts` | Shared **TypeScript types** for entities, groups, dataflow types, dataflows, mode, health, and Azure metadata. |
| `src/components/canvas/InfraCanvas.tsx` | Renders the **React Flow graph** — turns store data into nodes and edges and handles canvas interactions. |
| `src/components/canvas/MiniMapStyled.tsx` | The styled minimap overlay for navigating large graphs. |
| `src/components/nodes/SystemNode.tsx` | Renders **system/entity nodes** like CRM and F&O. |
| `src/components/nodes/ConnectionNode.tsx` | Renders the **triangle nodes** that represent **dataflow types** (Logic Apps, ODS, REST API). |
| `src/components/nodes/GroupNode.tsx` | Renders **group container** boxes. |
| `src/components/edges/ConnectorEdge.tsx` | Renders the edges connected to triangle dataflow-type nodes. |
| `src/components/edges/FlowEdge.tsx` | Renders generic flow edges between nodes. |
| `src/components/panels/AddPanel.tsx` | Lets users **add entities, groups, and dataflow types**. |
| `src/components/panels/ConnectionDrawer.tsx` | Lets users **manage dataflows inside a dataflow type**. |
| `src/components/panels/flowDetail.tsx` | Displays and **edits an individual dataflow** (including its Logic App integration config). |
| `src/components/panels/NodeDrawer.tsx` | Edit a system/entity node. |
| `src/components/panels/GroupDrawer.tsx` | Edit a group. |
| `src/components/panels/EdgeDrawer.tsx` | Inspect/edit an edge. |
| `src/components/panels/RefreshControl.tsx` | The **"Refresh now" UI** that triggers a backend Azure sync. |
| `src/components/panels/Sidebar.tsx` | Main sidebar with navigation and controls. |
| `src/hooks/useGraphState.ts` | Orchestrates loading/saving graph state between the store and the API. |
| `src/hooks/useSocketMock.ts` | Mocks realtime/socket updates for local development. |
| `src/lib/timeAgo.ts` | Formats timestamps as relative "x minutes ago" strings (used for last-run times). |
| `src/mock/data.ts` | Seed / mock graph data used for local development and demos. |

---

## 7. How the Frontend and Backend Communicate

The two tiers communicate over **plain HTTP/JSON REST**:

```text
React UI ──> graphStore (Zustand) ──> api/client.ts ──HTTP──> Express (server.js) ──> db.js ──> db.json
                                                                     │
                                                                     └──> logicAppsClient.js ──> Azure (ARM / Entra ID)
```

- The UI never talks to Azure directly. It only ever talks to **our** backend.
- `src/api/client.ts` is the single place that knows the backend URL and the shape of
  each request/response.
- The **Zustand store** (`graphStore.ts`) holds the in-browser copy of the graph. When
  the user does something (add an entity, refresh, edit a flow), the store calls the API
  client, the backend persists/updates `db.json`, and the **updated graph is returned and
  merged back into the store**, which re-renders the canvas.
- `cors` on the backend allows the Vite dev server (different port) to make these calls.

---

## 8. How the REST APIs Work

All endpoints are namespaced under `/api`. The backend reads/writes `db.json` for every
mutation and returns the resulting state so the frontend can stay in sync.

| Method & Path | Purpose |
|---|---|
| `GET /api/health` | Liveness check for the backend itself. |
| `GET /api/graph` | Returns the **entire graph** (entities, groups, dataflow types, dataflows, edges). |
| `POST /api/bootstrap` | Seeds/initializes the graph (e.g. from mock/seed data). |
| `POST /api/entities` | Creates a new **entity** (system node). |
| `PATCH /api/entities/:id` | Updates an existing entity (rename, reposition, change mode, etc.). |
| `DELETE /api/entities/:id` | Deletes an entity. |
| `POST /api/connections` | Creates a **dataflow type** (the triangle connection node) between two entities. |
| `POST /api/dataflows` | Creates a **dataflow** inside a dataflow type. |
| `PATCH /api/dataflows/:id` | Updates a dataflow (e.g. set/edit its Logic App `integration` config, change status). |
| `DELETE /api/dataflows/:id` | Deletes a dataflow. |
| `GET /api/azure/logicapps/health` | Checks connectivity/auth to Azure Logic Apps (can the backend reach Azure?). |
| `POST /api/azure/logicapps/sync-graph` | **The sync endpoint.** Scans the graph for Logic App–configured dataflows, queries Azure run history, updates each flow's mode/health/azure metadata, saves `db.json`, and returns the updated graph. |

**General pattern:** mutating endpoints (`POST`/`PATCH`/`DELETE`) modify `db.json` via
`db.js` and respond with the changed object (or the whole graph), so the frontend never
needs to guess the new state.

---

## 9. How the Graph Data Model Works

The graph is made up of **nodes** and **edges**, stored in `db.json` and described by the
shared types in `frontend/src/types/index.ts`.

There are four conceptual building blocks, arranged in a hierarchy:

```text
Group  (visual container)
  └── Entity        (a system: CRM, F&O, ODS, Docmosis, external API)
        │
        ▼  connected through
   Dataflow Type    (a triangle node: "Logic Apps", "ODS", "REST API")
        └── Dataflow (one concrete integration, e.g. CrmOnlineAddressContactIntegration)
```

- **Entities** are the systems. They are connected to each other **through a dataflow
  type** node (the triangle), not directly.
- A **dataflow type** is a category of integration between two entities. The triangle
  sits "on the wire" between two systems.
- Inside a dataflow type live one or more **dataflows** — the actual, individual
  integrations. A single dataflow is what can be wired to a real Azure Logic App.
- **Edges** connect entities to the triangle dataflow-type node (rendered by
  `ConnectorEdge.tsx`) and visually express the direction/path of data.

Every node/flow carries two key status fields — **mode** and **health** — which drive its
color and meaning on the canvas (see [section 13](#13-mode-and-health-logic)).

---

## 10. Entities, Groups, Dataflow Types, and Dataflows

| Concept | What it is | Rendered by | Example |
|---|---|---|---|
| **Entity** | A **system node** — an application or platform in the landscape. | `SystemNode.tsx` | CRM, F&O, ODS, Docmosis, an external API |
| **Group** | A **visual container / grouping box** for organizing related entities. Purely organizational. | `GroupNode.tsx` | "ERP Systems", "External Partners" |
| **Dataflow Type** | A **triangle connection node** between two entities representing a *category* of integration. | `ConnectionNode.tsx` | "Logic Apps", "ODS", "REST API" |
| **Dataflow** | A **single concrete integration** living inside a dataflow type. | `flowDetail.tsx` / `ConnectionDrawer.tsx` | `CrmOnlineAddressContactIntegration` |

In short: **Entities** are the boxes, **Groups** organize them, **Dataflow Types** are the
triangles on the connections, and **Dataflows** are the real integrations inside each
triangle.

---

## 11. How Logic Apps Are Connected

Logic Apps are configured **directly inside individual dataflows**. A dataflow stores an
`integration` config object describing which Azure Logic App it maps to:

```json
{
  "integration": {
    "type": "logicApp",
    "logicAppKind": "consumption",
    "resourceGroup": "rg-dbsintegration-uat",
    "workflowName": "CrmOnlineAddressContactIntegration"
  }
}
```

For **Standard** Logic Apps (which are hosted on a Logic App "site"), the config also
includes the site name:

```json
{
  "integration": {
    "type": "logicApp",
    "logicAppKind": "standard",
    "resourceGroup": "rg-dbsintegration-uat",
    "workflowName": "CrmOnlineAddressContactIntegration",
    "standardSiteName": "las-erp-integration-uat"
  }
}
```

Key points:

- `logicAppKind` distinguishes **Consumption** Logic Apps from **Standard** Logic Apps,
  because the Azure REST API paths and run-history shape differ between them.
- `resourceGroup` + `workflowName` (+ `standardSiteName` for Standard) are everything
  `logicAppsClient.js` needs to locate the workflow in Azure and query its run history.
- A dataflow **without** an `integration` config is purely *modeled* (mode = `mock` or
  `not_connected`) and is never touched by the Azure sync.

The config is created/edited in the UI through `flowDetail.tsx` (the single-dataflow
editor), and persisted to the backend via `PATCH /api/dataflows/:id`.

---

## 12. How Refresh / Sync Works

Refresh is the action that pulls **live status from Azure** onto the graph. The full
flow:

```text
1. User clicks "Refresh now"               (RefreshControl.tsx)
2. Frontend calls syncAzureLogicAppsToGraph()   (api/client.ts)
3. Frontend sends POST /api/azure/logicapps/sync-graph
4. Backend scans db.json for dataflows configured as Logic Apps
5. Backend calls Azure Logic Apps run-history APIs   (logicAppsClient.js)
6. Backend updates each flow's mode / status / azure metadata
7. Backend saves db.json                         (db.js)
8. Backend returns the updated graph
9. Frontend updates the graph UI                 (graphStore.ts → InfraCanvas.tsx)
```

So a single button press reconciles the modeled graph with the real world: only the
dataflows that have a Logic App `integration` config are queried, their latest run
results are interpreted into a mode + health, and the canvas re-colors accordingly.

---

## 13. Mode and Health Logic

Every flow/node carries **two orthogonal fields**:

### Mode — "is this real or only modeled?"

| Mode | Meaning |
|---|---|
| `mock` | Drawn for documentation only; not wired to anything real. |
| `connected` | Wired to a real integration (generic, non-Azure). |
| `azure` | Wired to a real Azure Logic App and synced via the Azure APIs. |
| `not_connected` | Intended to be real, but no live connection is configured yet. |

### Health — "how is it doing?"

| Health | Meaning |
|---|---|
| `healthy` | Working normally. |
| `degraded` | Working but impaired. |
| `down` | Not working. |
| `unhealthy` | Failing (e.g. last Azure run failed). |
| `unknown` | No live signal available. |

### Rules (mode → health → color)

| Condition | Health | Color |
|---|---|---|
| `mock` | `unknown` | **grey** |
| `not_connected` | `unknown` | **grey** |
| `azure` + last run `succeeded` | `healthy` | **green** |
| `azure` + last run `failed` | `unhealthy` | **red** |

The practical takeaway: **grey** means "we have no live data" (either it's mock or not
connected), **green** means "Azure says the last run succeeded", and **red** means "Azure
says it failed". This color coding is what makes the canvas instantly readable as a health
dashboard.

---

## 14. Future Architecture Direction

The `backend/integrations/` folder is deliberately structured to support **many
integration types**, not just Logic Apps. The intended layout:

```text
backend/integrations/
  ├── logicApps/      # ✅ implemented today
  │   └── logicAppsClient.js
  ├── crm/            # 🔜 future
  └── ods/            # 🔜 future
```

Each integration should eventually follow the **same two-part pattern**:

1. **Client file** — knows how to authenticate with and call the external system
   (e.g. `crmClient.js`, `odsClient.js`), mirroring how `logicAppsClient.js` talks to
   Azure.
2. **Mapper / sync logic** — maps the external system's response into the graph's data
   model (mode / health / metadata on the relevant dataflows), mirroring how the Logic
   Apps sync updates `db.json`.

This keeps the design consistent: adding a new integration type (CRM, ODS, REST API,
etc.) means dropping in a new folder under `integrations/`, implementing a client + a
mapper, and exposing a `sync-graph`-style endpoint — without changing the core graph
model or the frontend canvas. Over time the digital twin can reflect the health of the
*entire* integration estate, all on one graph.
