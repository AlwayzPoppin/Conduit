# Conduit Changelog

All notable changes to the Conduit extension are documented here.

---

## [0.6.1] - 2025-12-30

### ✨ Final Branding Overhaul
- **Universal Rebranding**: "TiskTask" and "Trinity" completely removed project-wide.
- **Nomenclature Standardization**:
  - `tisks` -> `contributions`
  - `tasks` -> `handoffs`
  - `Walk Flow` -> `Nexus Flow`
- **UI Modernization**:
  - Implemented "Leadin Cards" across all sidebars (Launchpad, Conduit, ExtensionLens).
  - High-performance gradient headers with pulsing status indicators.
- **Directory Migration**: `.tisktask/` -> `.conduit/`
- **Internal API**: Updated `logTisk` to `logContribution` and `logTask` to `logHandoff` across all suite services.

---

## [0.42.4] - 2025-12-29

### ✨ Nomenclature Standardization
- **Universal Rebranding**: "TiskTask" renamed to "Conduit" project-wide.
- **Data Model Migration**: 
  - `tisks` -> `contributions`
  - `tasks` -> `handoffs`
- **Command Update**:
  - `conduit.logTisk` -> `conduit.logContribution`
  - `conduit.logTask` -> `conduit.logHandoff`
- **Directory Migration**: `.tisktask/` -> `.conduit/`

---

## [0.39.0] - 2025-12-28

### ✨ New Features - Human-in-the-Loop (HITL) Command Approval
- **`--approve <id>` Command**: Approve pending commands that require user confirmation
- **Pending Commands Queue**: Display in HUD tab showing commands awaiting approval
- **Approve Buttons**: One-click approval UI for commands marked `requiresApproval: true`
- **Context Sync**: `pendingCommands` array automatically synced to context.json for UI consumption

### 🔧 Improvements
- Enhanced command approval workflow with visual indicators (orange border for pending)
- Separated pending queue from results in HUD for better clarity
- Added "⏳ Pending Queue" and "🏁 Recent Results" section headers

### 📝 Documentation
- Updated help text with `--approve` flag
- Agent bridge now exposes pending commands to UI layer

---

## [0.38.0] - 2025-12-28

### ✨ New Features
- **Clean Backups Button**: UI button to remove old context backup files
- **Dependencies Column**: Plans grid now shows `dependsOn` field for task dependencies
- **Copy to Clipboard**: Helper function with visual feedback indicator
- **`--sweep` Command**: Automated cleanup (archives done plans, unignores .conduit, truncates logs)
- **`--unignore` Command**: Surgically removes `.conduit` from `.gitignore`
- **`--clean-backups` Command**: Deletes context backup files (context.json.1 through .5)

### 🐛 Fixes
- Fixed syntax errors in `agent_bridge.js` (stray 'f' characters)
- Fixed syntax errors in `nexus_panel.html` (stray 'into' characters)
- Consolidated version references across all documentation

### 📝 Documentation
- All version numbers synchronized to v0.38.0
- Updated help text with new command flags

---

## [0.36.0] - 2025-12-28

### 🐛 Critical Fixes
- **`captureState` Command**: Implemented missing command that was registered but never functional
  - Creates `snapshot.json` with UI state, visible editors, and workspace info
  - Now actually responds to keyboard shortcut `Ctrl+Shift+S`
- **`retryCommand()` Function**: Fixed undefined JavaScript function error in Nexus panel
  - Retry button in Command HUD now works correctly
  - Sends `--retry <commandId>` via agent_bridge

### ✨ Features Added
- **`archivePlans()` Method**: Archives completed plans to history
  - Moves `done` plans to `historySummary`
  - Removes clutter from active plans list
- **`runBridge` Message Handler**: Enables webview-to-extension communication
  - Processes `--summary` and `--archive` commands from UI
  - Fixes non-functional Refresh and Archive Done buttons

### 🔧 Improvements
- **Dynamic Version Detection**: Auto-generated docs now read version from `package.json`
  - `ABOUT.md`, workflow files always reflect current version
  - Added `getVersion()` helper in `WorkflowBootstrap.ts`
- **Extended Context Interface**: Added `historySummary` field to `ConduitContext`

### 📝 Documentation
- Conducted comprehensive feature audit
- Identified 2 critical bugs (now fixed)
- Documented 3 partially implemented features for future releases

### 🧹 Code Quality
- All changes compile successfully with no TypeScript errors
- Maintains backward compatibility with existing workflows

---

## [0.35.0] - 2025-12-27

### Added
- Real-time UI synchronization with 4-second polling
- LIVE indicator in Nexus panel
- Sync toggle for auto-refresh control

---

## [0.34.0] - Previous Release

*See git history for earlier versions*

---

## Version Format

[Major.Minor.Patch]
- **Major**: Breaking changes or major rewrites
- **Minor**: New features, backward-compatible
- **Patch**: Bug fixes, minor improvements

---

**Conduit v0.6.1** | Michael Watkins | 2025
