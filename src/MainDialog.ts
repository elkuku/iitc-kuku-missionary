import {StateManager} from './StateManager'
import {MissionManager} from './MissionManager'
import {PortalManager} from './PortalManager'
import {MapRenderer} from './MapRenderer'
import {Notification} from './Notification'

const DIALOG_ID = 'umm-main'

export class MainDialog {

    constructor(
        private readonly stateManager: StateManager,
        private readonly missionManager: MissionManager,
        private readonly portalManager: PortalManager,
        private readonly mapRenderer: MapRenderer,
        private readonly notification: Notification,
    ) {}

    showDialog = (): void => {
        if ($(`#dialog-${DIALOG_ID}`).length > 0) {
            $(`#dialog-${DIALOG_ID}`).dialog('open')
            this.refresh()
            return
        }

        const html = this.buildDialogHtml()
        window.dialog({
            id: DIALOG_ID,
            title: `Ultimate Mission Maker`,
            html,
            width: 420,
        })

        $('#umm-tabs').tabs()
        this.renderBannerTab()
        this.renderMissionsTab()
        this.renderPortalsTab()
        this.renderToolsTab()
        this.bindDialogEvents()
    }

    isOpen = (): boolean => {
        const $dialog = $(`#dialog-${DIALOG_ID}`)
        return $dialog.length > 0 && $dialog.dialog('isOpen')
    }

    refresh = (): void => {
        if (!this.isOpen()) return
        this.renderMissionsTab()
        this.renderPortalsTab()
        this.updateMissionModeButton()
    }

    private buildDialogHtml = (): string =>
        `<div id="umm-tabs">
            <ul>
                <li><a href="#umm-tab-banner">Banner</a></li>
                <li><a href="#umm-tab-missions">Missions</a></li>
                <li><a href="#umm-tab-portals">Portals</a></li>
                <li><a href="#umm-tab-tools">Tools</a></li>
            </ul>
            <div id="umm-tab-banner"></div>
            <div id="umm-tab-missions"></div>
            <div id="umm-tab-portals"></div>
            <div id="umm-tab-tools"></div>
        </div>`

    private renderBannerTab = (): void => {
        const state = this.stateManager.getState()
        const minLength = Math.max(1, state.missions.length)
        const currentLength =
            state.plannedBannerLength > 0 ? state.plannedBannerLength : minLength

        const html = `<div class="umm-tab-content umm-edit-mission-set-details">
            <label for="umm-mission-set-name"><b>Banner name</b> (max. 50)</label>
            <span class="umm-error" id="umm-mission-set-name-error"><b>Error:</b> Enter a valid banner name</span>
            <input id="umm-mission-set-name" type="text" placeholder="Enter banner name" maxlength="50"
                value="${state.missionSetName ?? ''}">

            <label for="umm-mission-set-description"><b>Banner description</b> (max. 200)</label>
            <span class="umm-error" id="umm-mission-set-description-error"><b>Error:</b> Enter a valid description</span>
            <textarea id="umm-mission-set-description" placeholder="Enter banner description" maxlength="200"
                rows="3">${state.missionSetDescription ?? ''}</textarea>

            <label for="umm-banner-length"><b>Planned banner length</b> (min. ${minLength})</label>
            <span class="umm-error" id="umm-mission-planned-banner-length-error"><b>Error:</b> Enter a valid banner length</span>
            <input id="umm-banner-length" type="number" min="${minLength}" value="${currentLength}">

            <label for="umm-title-format"><b>Title format</b></label>
            <span class="umm-error" id="umm-mission-title-format-error"><b>Error:</b> Enter a valid title format</span>
            <p style="font-size:11px;margin:2px 0">N=number, NN=padded number, M=total, T=name. Example: T NN-M</p>
            <input id="umm-title-format" type="text" placeholder="Title format" value="${state.titleFormat ?? 'T NN-M'}">
            <p><b>Preview:</b> <span id="umm-mission-title-preview"></span></p>

            <button id="umm-save-banner-btn" class="umm-dialog-button">Save</button>
        </div>`

        $('#umm-tab-banner').html(html)
        this.updateTitlePreview()

        $('#umm-mission-set-name, #umm-mission-set-description, #umm-banner-length, #umm-title-format').on(
            'input',
            () => { this.updateTitlePreview() },
        )

        $('#umm-save-banner-btn').on('click', () => {
            const saved = this.missionManager.saveBannerDetails(
                String($('#umm-mission-set-name').val()),
                String($('#umm-mission-set-description').val()),
                parseInt(String($('#umm-banner-length').val())),
                String($('#umm-title-format').val()),
            )
            if (saved) {
                const updated = this.stateManager.getState()
                this.notification.show(`${updated.missionSetName}\nMission details saved`)
                this.renderMissionsTab()
            }
        })
    }

    private updateTitlePreview = (): void => {
        const name = String($('#umm-mission-set-name').val())
        const format = String($('#umm-title-format').val())
        const length = parseInt(String($('#umm-banner-length').val()))

        if (name && format && !isNaN(length)) {
            const preview = this.missionManager.generateTitle(1, length, name, format)
            $('#umm-mission-title-preview').text(preview)
        } else {
            $('#umm-mission-title-preview').text('Fill in all required fields')
        }
    }

    private renderMissionsTab = (): void => {
        const state = this.stateManager.getState()
        const isActive = this.portalManager.missionModeActive

        let missionItems = ''
        for (const [index, mission] of state.missions.entries()) {
            const isCurrentMission = index === state.currentMission
            const activeClass = isCurrentMission ? ' umm-mission-active' : ''
            missionItems += `<li class="umm-sortable-item${activeClass}" data-mission-id="${index}">
                <span class="umm-drag-handle">&#9776;</span>
                <span class="umm-mission-label">${index + 1}. ${mission.missionTitle || '(no title)'}</span>
                <span class="umm-badge">${mission.portals.length}p</span>
            </li>`
        }

        const html = `<div class="umm-tab-content">
            <div class="umm-mission-controls">
                <button id="umm-mission-mode-btn" class="umm-dialog-button ${isActive ? 'umm-mission-mode-active' : ''}">
                    ${isActive ? 'Mission Mode: ON' : 'Mission Mode: OFF'}
                </button>
                <button id="umm-undo-btn" class="umm-dialog-button">Undo Portal</button>
            </div>
            <ul id="umm-missions-list" class="umm-sortable-list">
                ${missionItems}
            </ul>
            <div class="umm-mission-nav">
                <button id="umm-prev-mission-btn" class="umm-dialog-button">&#9664; Prev</button>
                <span id="umm-active-mission-info">
                    Mission ${state.currentMission + 1}/${state.missions.length}
                    &mdash; ${state.missions[state.currentMission].portals.length} portals
                </span>
                <button id="umm-next-mission-btn" class="umm-dialog-button">Next &#9654;</button>
            </div>
        </div>`

        $('#umm-tab-missions').html(html)

        $('#umm-missions-list').sortable({
            handle: '.umm-drag-handle',
            stop: () => {
                const newOrder = $('#umm-missions-list').sortable('toArray', {
                    attribute: 'data-mission-id',
                })
                this.missionManager.reorderAll(newOrder)
                this.mapRenderer.drawMissions()
                this.mapRenderer.refreshMissionNumbers()
                this.renderMissionsTab()
                this.renderPortalsTab()
            },
        })

        $('#umm-missions-list li').on('click', (event) => {
            const $item = $(event.currentTarget)
            const missionId = parseInt(String($item.data('mission-id')))
            this.missionManager.setCurrentMission(missionId)
            this.mapRenderer.drawMissions()
            this.mapRenderer.refreshMissionNumbers()
            this.renderMissionsTab()
            this.renderPortalsTab()
        })

        $('#umm-mission-mode-btn').on('click', () => {
            this.portalManager.toggleMissionMode()
            this.renderMissionsTab()
        })

        $('#umm-undo-btn').on('click', () => {
            this.portalManager.undoPortal()
        })

        $('#umm-next-mission-btn').on('click', () => {
            const result = this.missionManager.nextMission()
            this.notification.show(result.message)
            if (result.created) {
                this.mapRenderer.drawMissions()
                this.mapRenderer.refreshMissionNumbers()
                this.renderMissionsTab()
                this.renderPortalsTab()
            }
        })

        $('#umm-prev-mission-btn').on('click', () => {
            const result = this.missionManager.previousMission()
            this.notification.show(result.message)
            if (result.changed) {
                this.mapRenderer.drawMissions()
                this.mapRenderer.refreshMissionNumbers()
                this.renderMissionsTab()
                this.renderPortalsTab()
            }
        })
    }

    private renderPortalsTab = (): void => {
        const state = this.stateManager.getState()
        const mission = state.missions[state.currentMission]

        let portalItems = ''
        if (mission.portals.length === 0) {
            portalItems = '<li class="umm-empty-state">No portals in this mission yet.</li>'
        } else {
            for (const [portalIndex, portal] of mission.portals.entries()) {
                const typeBadge = portal.objective?.type ?? 'HACK_PORTAL'
                portalItems += `<li class="umm-sortable-item" data-portal-index="${portalIndex}">
                    <span class="umm-drag-handle">&#9776;</span>
                    <span class="umm-portal-label">${portalIndex + 1}. ${portal.title}</span>
                    <span class="umm-badge">${typeBadge.replace('_', ' ')}</span>
                </li>`
            }
        }

        const html = `<div class="umm-tab-content">
            <p class="umm-portals-header">
                <b>Mission ${state.currentMission + 1}:</b> ${mission.missionTitle || '(no title)'}
            </p>
            <ul id="umm-portals-list" class="umm-sortable-list">
                ${portalItems}
            </ul>
        </div>`

        $('#umm-tab-portals').html(html)

        if (mission.portals.length > 0) {
            $('#umm-portals-list').sortable({
                handle: '.umm-drag-handle',
                stop: () => {
                    const newOrder = $('#umm-portals-list').sortable('toArray', {
                        attribute: 'data-portal-index',
                    })
                    this.portalManager.reorderInMission(state.currentMission, newOrder)
                    this.mapRenderer.drawMissions()
                    this.mapRenderer.refreshMissionNumbers()
                    this.renderPortalsTab()
                },
            })
        }
    }

    private renderToolsTab = (): void => {
        const state = this.stateManager.getState()
        const pathsChecked = window.map.hasLayer(this.mapRenderer.missionPaths) ? 'checked' : ''
        const numbersChecked = window.map.hasLayer(this.mapRenderer.missionNumbers) ? 'checked' : ''

        const html = `<div class="umm-tab-content">
            <p><b>Layers:</b>
                <label class="umm-layer-label">
                    <input type="checkbox" id="umm-layercheckbox-paths" ${pathsChecked}> Mission Paths
                </label>
                <label class="umm-layer-label">
                    <input type="checkbox" id="umm-layercheckbox-numbers" ${numbersChecked}> Mission Numbers
                </label>
            </p>
            <p><a href="#" id="umm-zoom-all-link">Zoom to view all missions</a></p>

            <hr>
            <p><b>Mission operations</b></p>
            <div class="umm-button-row">
                <button id="umm-split-btn" class="umm-dialog-button">Split</button>
                <button id="umm-merge-btn" class="umm-dialog-button">Merge</button>
                <button id="umm-reverse-btn" class="umm-dialog-button">Reverse</button>
            </div>

            <hr>
            <p><b>Data management</b></p>
            <div class="umm-button-row">
                <button id="umm-export-btn" class="umm-dialog-button">Export JSON</button>
                <button id="umm-clear-btn" class="umm-dialog-button">Clear All Data</button>
            </div>
            <p><b>Import from file:</b><br>
                <input type="file" id="umm-import-file" accept=".json">
            </p>

            <hr>
            <p><b>About</b></p>
            <p>UMM v${VERSION} &mdash;
                <a href="https://umm.8bitnoise.rocks/" target="_blank">Documentation</a>
            </p>
            <p>Supported file format version: ${StateManager.FILE_FORMAT_VERSION} and below</p>
            <p>Missions: ${state.missions.length} &mdash; Total portals: ${state.missions.reduce((sum, mission) => sum + mission.portals.length, 0)}</p>
        </div>`

        $('#umm-tab-tools').html(html)
        this.bindToolsEvents()
    }

    private bindToolsEvents = (): void => {
        $('#umm-layercheckbox-paths').on('change', function () {
            const show = $(this).is(':checked')
            if (show) {
                window.map.addLayer(window.plugin.umm.ummMissionPaths)
            } else {
                window.map.removeLayer(window.plugin.umm.ummMissionPaths)
            }
        })

        $('#umm-layercheckbox-numbers').on('change', function () {
            const show = $(this).is(':checked')
            if (show) {
                window.map.addLayer(window.plugin.umm.ummMissionNumbers)
            } else {
                window.map.removeLayer(window.plugin.umm.ummMissionNumbers)
            }
        })

        $('#umm-zoom-all-link').on('click', (event) => {
            event.preventDefault()
            this.mapRenderer.zoomAllMissions()
        })

        $('#umm-split-btn').on('click', () => { this.showSplitDialog() })

        $('#umm-merge-btn').on('click', () => {
            if (this.missionManager.mergeMissions(true)) {
                this.mapRenderer.drawMissions()
                this.mapRenderer.refreshMissionNumbers()
                this.refresh()
                this.notification.show('Missions merged')
            }
        })

        $('#umm-reverse-btn').on('click', () => {
            const state = this.stateManager.getState()
            const input = prompt(
                `Which mission to reverse (1-${state.missions.length})?`,
                String(state.currentMission + 1),
            )
            if (input === null) return
            const index = parseInt(input) - 1
            if (isNaN(index) || index < 0 || index >= state.missions.length) {
                alert(`Invalid input. Enter a number between 1 and ${state.missions.length}.`)
                return
            }
            this.missionManager.reverseMission(index)
            this.mapRenderer.drawMissions()
            this.mapRenderer.refreshMissionNumbers()
            this.refresh()
            this.notification.show(`Mission ${index + 1} reversed`)
        })

        $('#umm-export-btn').on('click', () => { this.missionManager.exportData() })

        $('#umm-clear-btn').on('click', () => {
            if (confirm('Are you sure you want to clear ALL mission data?')) {
                this.stateManager.clearMissionData()
                if (this.portalManager.missionModeActive) {
                    this.portalManager.toggleMissionMode()
                }
                this.mapRenderer.missionPaths.clearLayers()
                this.mapRenderer.refreshMissionNumbers()
                this.refresh()
                this.notification.show('All mission data cleared')
            }
        })

        $('#umm-import-file').on('change', (event) => {
            if (!confirm('Are you sure you want to overwrite current mission data?')) {
                $(event.target).val('')
                return
            }
            const files = (event.target as HTMLInputElement).files
            if (!files || files.length === 0) {
                alert('No file selected.')
                return
            }
            if (files[0].type !== 'application/json') {
                alert(`${files[0].name} is not a JSON file.`)
                $(event.target).val('')
                return
            }

            void files[0].text().then((text) => {
                const result = this.missionManager.importFromJson(text)
                if (result.success) {
                    this.portalManager.storeMissingData()
                    this.mapRenderer.drawMissions()
                    this.mapRenderer.refreshMissionNumbers()
                    this.mapRenderer.zoomAllMissions()
                    this.refresh()
                    renderPortalDetails(window.selectedPortal)
                }
                this.notification.show(result.message)
            })
        })
    }

    private showSplitDialog = (): void => {
        const state = this.stateManager.getState()

        const numMissionsStr = prompt(
            `Split into how many missions (1-${state.missions[0].portals.length})?\nRecommended: multiple of 6.`,
            String(state.plannedBannerLength > 0 && state.plannedBannerLength <= state.missions[0].portals.length
                ? state.plannedBannerLength
                : state.missions[0].portals.length),
        )

        if (numMissionsStr === null) return

        const numMissions = parseInt(numMissionsStr)
        if (isNaN(numMissions) || numMissions < 1 || numMissions > state.missions[0].portals.length) {
            alert(`Invalid input. Enter a number between 1 and ${state.missions[0].portals.length}.`)
            return
        }

        const useBalanced = confirm(
            `Split into ${numMissions} missions.\n\nOK = Balanced (leftover portals distributed across first missions)\nCancel = Remainder at end`,
        )

        const doSplit = useBalanced
            ? this.missionManager.splitBalanced(numMissions)
            : this.missionManager.splitRemainderAtEnd(numMissions)

        void doSplit.then(() => {
            this.mapRenderer.drawMissions()
            this.mapRenderer.refreshMissionNumbers()
            this.refresh()
            this.notification.show(`Split into ${numMissions} missions`)
        })
    }

    private bindDialogEvents = (): void => {
        // Sync layer checkboxes when layers are added/removed externally
        window.map.on('layeradd', (event) => {
            const layerEvent = event as unknown as L.LeafletLayerEvent
            if (layerEvent.layer === this.mapRenderer.missionPaths) {
                $('#umm-layercheckbox-paths').prop('checked', true)
            }
            if (layerEvent.layer === this.mapRenderer.missionNumbers) {
                $('#umm-layercheckbox-numbers').prop('checked', true)
            }
        })
        window.map.on('layerremove', (event) => {
            const layerEvent = event as unknown as L.LeafletLayerEvent
            if (layerEvent.layer === this.mapRenderer.missionPaths) {
                $('#umm-layercheckbox-paths').prop('checked', false)
            }
            if (layerEvent.layer === this.mapRenderer.missionNumbers) {
                $('#umm-layercheckbox-numbers').prop('checked', false)
            }
        })
    }

    private updateMissionModeButton = (): void => {
        const isActive = this.portalManager.missionModeActive
        const $button = $('#umm-mission-mode-btn')
        if ($button.length > 0) {
            $button.text(isActive ? 'Mission Mode: ON' : 'Mission Mode: OFF')
            if (isActive) {
                $button.addClass('umm-mission-mode-active')
            } else {
                $button.removeClass('umm-mission-mode-active')
            }
        }
    }

    syncLayerCheckboxes = (): void => {
        if (!this.isOpen()) return
        $('#umm-layercheckbox-paths').prop('checked', window.map.hasLayer(this.mapRenderer.missionPaths))
        $('#umm-layercheckbox-numbers').prop('checked', window.map.hasLayer(this.mapRenderer.missionNumbers))
    }
}
