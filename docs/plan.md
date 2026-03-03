# Refactor: UMM to Focused TypeScript Classes + jQuery Tabs Dialog

## Context

`iitc-ultimate-mission-maker.user.js` is a 2,076-line monolithic JavaScript file mixing state management, map drawing, IITC hooks, and UI across three execution contexts (shared utilities, IITC plugin, Mission Editor). The project already has a modern TypeScript `src/` skeleton using `iitcpluginkit`.

**Goals:**
- Decompose into focused TypeScript classes in `src/`
- Replace all Leaflet sidebar buttons with a single jQuery UI tabs dialog
- Add sortable mission list and sortable portal list with live updates
- Entry point: toolbox button (via `IITC.toolbox.addButton`)
- Scope: IITC map plugin only (missions.ingress.com wrapper is a future phase)

---

## New Class Structure

| File | Class | Responsibility |
|------|-------|---------------|
| `src/types/UmmTypes.ts` | interfaces | TypeScript types for Portal, Mission, UmmState |
| `src/StateManager.ts` | `StateManager` | localStorage read/write + version migration |
| `src/MissionManager.ts` | `MissionManager` | Mission CRUD, split/merge/reverse/navigate |
| `src/PortalManager.ts` | `PortalManager` | Add/undo/update portals, hook handlers |
| `src/MapRenderer.ts` | `MapRenderer` | Leaflet path drawing + mission number markers |
| `src/Notification.ts` | `Notification` | Toast notification system |
| `src/WaypointEditor.ts` | `WaypointEditor` | Portal details panel waypoint editor |
| `src/MainDialog.ts` | `MainDialog` | jQuery UI tabs dialog + all UI logic |
| `src/tpl/main-dialog.hbs` | — | Handlebars template for 4-tab dialog |
| `src/Main.ts` | `Main` | Plugin entry point, wires all classes |

---

## Dialog Design (4 Tabs)

Opened via `IITC.toolbox.addButton`. Dialog id: `umm-main`.

### Tab 1 — Banner
- Banner name (text, max 50)
- Banner description (textarea, max 200)
- Planned banner length (number)
- Title format (text, with format help)
- Live title preview
- Save button (validates + persists)

### Tab 2 — Missions
- **Mission mode toggle button** (red when active)
- **Undo last portal button**
- Sortable `<ul>` list of all missions:
  - Each `<li>`: mission number, title, portal count badge
  - Dragging reorders missions → saves state → redraws map
  - Clicking a mission sets it as active (bold/highlighted)
- Next / Previous mission navigation buttons
- Active mission info (number, title, portal count)

### Tab 3 — Portals
- Header: current mission title
- Sortable `<ul>` list of portals in active mission:
  - Each `<li>`: position number, portal name, objective type badge
  - Dragging reorders portals → saves state → redraws map
  - Live-updates when a portal is added in mission mode
- Empty state message when no portals

### Tab 4 — Tools + Data
- **Layer toggles**: Mission Paths checkbox, Mission Numbers checkbox
- **Zoom to all missions** link
- **Mission operations**: Split, Merge, Reverse buttons
- **Data management**: Clear all data (with confirm)
- **Export**: Export to JSON file button
- **Import**: File input (`<input type="file">`)
- **About**: Plugin version + changelog link

---

## Implementation Plan

### Step 1 — Types (`src/types/UmmTypes.ts`)
Define interfaces:
- `PortalObjective` → `type`, `passphrase_params`
- `PortalLocation` → `latitude`, `longitude`
- `UmmPortal` → all portal fields + `objective`
- `UmmMission` → `missionTitle`, `missionDescription`, `portals`
- `UmmState` → all top-level state fields
- Extend `types/Types.ts`: add `window.plugin.umm` namespace

### Step 2 — StateManager (`src/StateManager.ts`)
Extract from `.user.js`:
- `get()` → `getUmmState()`
- `save(state)` → `saveUmmState()`
- `clear()` → `clearMissionData()`
- `migrate(state)` → `convertUmmVersion()`
- Static constant: `STORAGE_KEY = 'ultimate-mission-maker'`

### Step 3 — MissionManager (`src/MissionManager.ts`)
Extract from `.user.js`:
- `setActive(id)` → `setCurrentMission()`
- `next()` / `previous()` → `nextMission()` / `previousMission()`
- `split(mode, count)` → `splitMissionRemainderAtEnd()` / `splitMissionBalanced()`
- `merge()` → `mergeMissions()`
- `reverse(id)` → `reverseMission()`
- `reorder(fromIndex, toIndex)` → **new** for sortable
- `generateTitle(num, total, name, format)` → `generateMissionTitle()`
- `syncTitles()` / `syncDescriptions()`
- Depends on: `StateManager`

### Step 4 — PortalManager (`src/PortalManager.ts`)
Extract from `.user.js`:
- `addToCurrentMission(data)` → `addPortalToCurrentMission()` (IITC hook handler)
- `undo()` → `undoPortal()`
- `updateDetails(data)` → `updateMissionPortalsDetails()` (hook handler)
- `storeMissing()` → `storeMissingData()` (hook handler)
- `reorderInMission(missionId, fromIndex, toIndex)` → **new** for sortable
- `toggleMissionMode()` → `toggleMissionMode()`
- `resumeOrStartNew(state)` → `resumeOrStartNewMission()`
- Emits events to refresh dialog lists after changes
- Depends on: `StateManager`, `MissionManager`, `MapRenderer`, `Notification`

### Step 5 — MapRenderer (`src/MapRenderer.ts`)
Extract from `.user.js`:
- `drawAll()` → `drawMissions()`
- `drawOne(state, id)` → `drawMission()`
- `refreshNumbers()` → `refreshMissionNumbers()`
- `addNumbers()` → `addMissionNumbers()`
- `togglePaths(show)` / `toggleNumbers(show)`
- `zoomAll()` → `zoomAllMissions()`
- Owns Leaflet `FeatureGroup` instances
- Depends on: `StateManager`

### Step 6 — Notification (`src/Notification.ts`)
Extract from `.user.js`:
- `show(text, persistent?)` → `notification()`
- Manages the `.umm-notification` DOM element and timeout

### Step 7 — WaypointEditor (`src/WaypointEditor.ts`)
Extract from `.user.js`:
- `addToPortal()` → `addWaypointEditorToPortal()` (hook handler)
- All inner functions (mission select, action select, passphrase box, save)
- Depends on: `StateManager`

### Step 8 — MainDialog (`src/MainDialog.ts` + `src/tpl/main-dialog.hbs`)
**New class** replacing all sidebar button logic and `showUmmOptions()`:
- Opens via `IITC.toolbox.addButton` → `showDialog()`
- Uses `window.dialog()` with jQuery UI tabs
- Tab 2 (Missions): renders sortable list, wires `$.sortable` → `MissionManager.reorder()`
- Tab 3 (Portals): renders sortable list, wires `$.sortable` → `PortalManager.reorderInMission()`
- `refresh()` method: called by PortalManager/MissionManager after state changes to re-render lists
- `isOpen()` check to skip refresh when closed (replaces `reloadSettingsWindowIfNeeded`)
- Depends on: `StateManager`, `MissionManager`, `PortalManager`, `MapRenderer`, `Notification`

### Step 9 — Update `src/Main.ts`
- Remove placeholder `DialogHelper` code
- Instantiate all classes with dependency injection
- Register toolbox button: `IITC.toolbox.addButton({ label: 'UMM', ... })`
- Register IITC hooks via `window.addHook()`
- Register Leaflet layer groups
- Wire map layer events (`layeradd`/`layerremove`) to dialog checkbox sync
- Initialize state on boot (version check + migration)

### Step 10 — Update `src/styles.css`
Move all CSS from the inline `ummCSS` string in `setup()` into `src/styles.css`. Add new styles for:
- `.umm-tabs` — jQuery UI tab overrides for IITC dark theme
- `.umm-sortable-list` — mission/portal list styles
- `.umm-sortable-list li` — list item with drag handle
- `.umm-mission-active` — highlight for active mission
- `.umm-badge` — portal count / objective type badge

---

## Sortable List Behavior

```
Missions tab:
  $list.sortable({
    stop: (event, ui) => {
      const newOrder = $list.sortable('toArray', { attribute: 'data-mission-id' })
      missionManager.reorderAll(newOrder)  // saves + redraws
      dialog.refreshMissionsList()
    }
  })

Portals tab:
  $list.sortable({
    stop: (event, ui) => {
      const newOrder = $list.sortable('toArray', { attribute: 'data-portal-index' })
      portalManager.reorderInMission(activeMissionId, newOrder)  // saves + redraws
      dialog.refreshPortalsList()
    }
  })
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/Main.ts` | Full rewrite — wire all classes |
| `src/styles.css` | Move inline CSS here + add new tab/list styles |
| `types/Types.ts` | Add `window.plugin.umm` type declarations |
| `src/Helper/Dialog.ts` | Keep as-is (not used in new flow) or remove |
| `src/tpl/dialog.hbs` | Keep or remove (replaced by main-dialog.hbs) |

## Files to Create

- `src/types/UmmTypes.ts`
- `src/StateManager.ts`
- `src/MissionManager.ts`
- `src/PortalManager.ts`
- `src/MapRenderer.ts`
- `src/Notification.ts`
- `src/WaypointEditor.ts`
- `src/MainDialog.ts`
- `src/tpl/main-dialog.hbs`

The legacy `iitc-ultimate-mission-maker.user.js` stays on disk until the new build is verified working, then can be removed.

---

## Verification

1. `yarn build:dev` — must succeed with no TypeScript errors
2. `npx eslint src/` — must pass
3. Load plugin in IITC (local file server via `yarn start`)
4. Click "UMM" toolbox button → dialog opens with 4 tabs
5. **Banner tab**: fill in details, save → notification confirms, titles update
6. **Missions tab**: toggle mission mode (button turns red) → select a portal on map → portal count in list increments live; drag mission to reorder → map paths redraw
7. **Portals tab**: shows portals for active mission; drag to reorder → paths redraw
8. **Tools + Data tab**: split/merge/reverse work; export produces valid JSON; import loads and redraws
9. Undo removes last portal, list updates
10. Layer checkboxes toggle map layers

---

## Notes

- The `missionEditorPluginWrapper` (missions.ingress.com) is **out of scope** for this phase — leave it unchanged in the `.user.js` file.
- All jQuery UI features (tabs, sortable, dialog) are already available via IITC's bundled jQuery UI.
- No new npm dependencies needed.
- Follow existing ESLint rules: arrow functions, PascalCase files, no underscore prefixes.
