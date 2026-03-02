import * as Plugin from 'iitcpluginkit'

import {StateManager} from './StateManager'
import {MissionManager} from './MissionManager'
import {PortalManager} from './PortalManager'
import {MapRenderer} from './MapRenderer'
import {Notification} from './Notification'
import {WaypointEditor} from './WaypointEditor'
import {MainDialog} from './MainDialog'

// @ts-expect-error we don't want to import JSON files :(
import plugin from '../plugin.json'

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const PLUGIN_NAME = plugin.name.replace('IITC plugin: ', '') as string

class Main implements Plugin.Class {

    init() {
        console.log(`${PLUGIN_NAME} - ${VERSION}`)

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./styles.css')

        $('body').append("<div class='umm-notification' style='display:none'></div>")

        const stateManager = new StateManager()
        const notification = new Notification()

        if (!stateManager.isInitialized()) {
            stateManager.clearMissionData()
        }

        const state = stateManager.getState()
        if (state.fileFormatVersion > StateManager.FILE_FORMAT_VERSION) {
            alert('UMM: Your version is too old for the loaded data. Please update UMM.')
            return
        }

        const migrated = stateManager.migrateState(state)
        stateManager.saveState(migrated)

        const mapRenderer = new MapRenderer(stateManager)
        const missionManager = new MissionManager(stateManager)
        const portalManager = new PortalManager(stateManager, missionManager, mapRenderer, notification)
        const waypointEditor = new WaypointEditor(stateManager, notification)
        const mainDialog = new MainDialog(
            stateManager,
            missionManager,
            portalManager,
            mapRenderer,
            notification,
            waypointEditor,
        )

        portalManager.onStateChange = () => { mainDialog.refresh() }

        window.plugin.umm = {
            missionModeActive: false,
            notificationTimer: undefined,
            ummMissionPaths: mapRenderer.missionPaths,
            ummMissionNumbers: mapRenderer.missionNumbers,
        }

        window.addLayerGroup('UMM: Mission Paths', mapRenderer.missionPaths, true)
        window.addLayerGroup('UMM: Mission Numbers', mapRenderer.missionNumbers, true)

        mapRenderer.drawMissions()
        mapRenderer.refreshMissionNumbers()

        window.map.on('layeradd', (event) => {
            const layerEvent = event as unknown as L.LeafletLayerEvent
            if (layerEvent.layer === mapRenderer.missionNumbers) {
                mapRenderer.addMissionNumbers()
            }
            mainDialog.syncLayerCheckboxes()
        })

        window.map.on('layerremove', (event) => {
            const layerEvent = event as unknown as L.LeafletLayerEvent
            if (layerEvent.layer === mapRenderer.missionNumbers) {
                mapRenderer.missionNumbers.clearLayers()
            }
            mainDialog.syncLayerCheckboxes()
        })

        window.addHook('portalSelected', (event) => { portalManager.addPortalToCurrentMission(event) })
        window.addHook('portalDetailsUpdated', (event) => { portalManager.updateMissionPortalsDetails(event) })
        window.addHook('mapDataRefreshEnd', () => { portalManager.storeMissingData() })

        IITC.toolbox.addButton({
            label: 'UMM',
            title: 'Ultimate Mission Maker',
            accessKey: 'm',
            id: `btn-${PLUGIN_NAME}`,
            action: mainDialog.showDialog,
        })
    }
}

Plugin.Register(new Main, PLUGIN_NAME)
