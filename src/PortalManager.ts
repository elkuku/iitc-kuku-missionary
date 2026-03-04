import {StateManager} from './StateManager'
import {MissionManager} from './MissionManager'
import {MapRenderer} from './MapRenderer'
import {Notification} from './Notification'
import {UmmPortal} from './types/UmmTypes'

export class PortalManager {

    missionModeActive = false
    private missionModeResuming = false
    private lastPortal: string | undefined = undefined

    onStateChange: (() => void) | undefined = undefined

    constructor(
        private readonly stateManager: StateManager,
        private readonly missionManager: MissionManager,
        private readonly mapRenderer: MapRenderer,
        private readonly notification: Notification,
    ) {}

    toggleMissionMode = (): void => {
        if (this.missionModeActive) {
            this.missionModeActive = false
            $('#umm-mission-mode-btn').removeClass('umm-mission-mode-active')
        } else {
            const state = this.stateManager.getState()
            if (!state.missionSetName || !state.missionSetDescription || state.plannedBannerLength === 0) {
                this.notification.show('Mission mode inactive\nPlease enter mission data\nAnd try again.')
                return
            }

            this.missionModeActive = true
            this.resumeOrStartNewMission()
            $('#umm-mission-mode-btn').addClass('umm-mission-mode-active')
        }

        this.onStateChange?.()
    }

    resumeOrStartNewMission = (): void => {
        const state = this.stateManager.getState()

        if (state.missions[state.currentMission].portals.length > 0) {
            this.missionModeResuming = true
            const lastPortal = state.missions[state.currentMission].portals.at(-1)!
            window.map.setView([lastPortal.location.latitude, lastPortal.location.longitude])
            renderPortalDetails(state.missions[state.currentMission].portals.at(-1)!.guid)
            this.notification.show(
                `Mission mode active.\n${state.missionSetName}\nResuming mission #${state.currentMission + 1}\nSelect next portal`,
            )
        } else if (window.selectedPortal === null) {
            this.notification.show(
                `Mission mode active.\n${state.missionSetName}\nSelect start portal for mission #${state.currentMission + 1}`,
            )
        } else {
            window.map.setView(window.portals[window.selectedPortal].getLatLng())
            renderPortalDetails(window.selectedPortal)
            this.notification.show(
                `Mission mode active.\n${state.missionSetName}\nPortal added as start for mission #${state.currentMission + 1}`,
            )
        }
    }

    addPortalToCurrentMission = (data: EventPortalSelected): void => {
        if (!this.missionModeActive || this.missionModeResuming) {
            this.missionModeResuming = false
            return
        }

        if (this.lastPortal === data.selectedPortalGuid) return
        this.lastPortal = data.selectedPortalGuid

        const state = this.stateManager.getState()
        const portalData = window.portals[data.selectedPortalGuid].options.data
        const guid = data.selectedPortalGuid

        const portalToAdd: UmmPortal = {
            description: '',
            guid,
            imageUrl: portalData.image ?? '',
            isOrnamented: false,
            isStartPoint: false,
            location: {
                latitude: portalData.latE6 / 1_000_000,
                longitude: portalData.lngE6 / 1_000_000,
            },
            title: (portalData.title as string | undefined) ?? '[undefined]',
            type: 'PORTAL',
            objective: {
                type: 'HACK_PORTAL',
                passphrase_params: { question: '', _single_passphrase: '' },
            },
        }

        if (state.missions[state.currentMission].portals.length === 0) {
            this.pushPortal(portalToAdd)
        } else {
            const alreadyInMission = state.missions[state.currentMission].portals.some(
                (portal) => portal.guid === portalToAdd.guid,
            )
            const isLastPortal =
                state.missions[state.currentMission].portals.at(-1)?.guid === portalToAdd.guid

            if (!alreadyInMission) {
                this.pushPortal(portalToAdd)
            } else if (!isLastPortal) {
                this.notification.show(
                    `${state.missionSetName}\nPortal already in mission #${state.currentMission + 1}`,
                )
            }
        }
    }

    private pushPortal = (portal: UmmPortal): void => {
        const state = this.stateManager.getState()
        state.missions[state.currentMission].portals.push(portal)
        this.stateManager.saveState(state)

        const portals = state.missions[state.currentMission].portals
        if (portals.length > 1) {
            const previous = portals.at(-2)!
            this.mapRenderer.drawLineToPortal(
                previous.location.latitude,
                previous.location.longitude,
                portal.location.latitude,
                portal.location.longitude,
            )
        } else {
            this.mapRenderer.refreshMissionNumbers()
        }

        this.notification.show(`${state.missionSetName}\nAdded to mission #${state.currentMission + 1}`)
        this.onStateChange?.()
    }

    removePortal = (missionId: number, portalIndex: number): void => {
        const state = this.stateManager.getState()
        state.missions[missionId].portals.splice(portalIndex, 1)
        this.stateManager.saveState(state)
        this.onStateChange?.()
    }

    reorderInMission = (missionId: number, newOrder: string[]): void => {
        const state = this.stateManager.getState()
        const mission = state.missions[missionId]
        const reordered = newOrder.map((indexStr) => mission.portals[parseInt(indexStr)])
        mission.portals = reordered
        this.stateManager.saveState(state)
    }

    updateMissionPortalsDetails = (data: EventPortalDetailsUpdated): void => {
        const state = this.stateManager.getState()
        if (!('missions' in state)) return

        let updated = false
        for (const mission of state.missions) {
            for (const portal of mission.portals) {
                if (portal.guid === data.guid) {
                    if (portal.imageUrl !== data.portalDetails.image && data.portalDetails.image) {
                        portal.imageUrl = data.portalDetails.image as string
                        updated = true
                    }
                    if (portal.title !== data.portalDetails.title) {
                        portal.title = data.portalDetails.title as string
                        updated = true
                    }
                }
            }
        }

        if (updated) {
            this.stateManager.saveState(state)
        }
    }

    storeMissingData = (): void => {
        const state = this.stateManager.getState()
        let updated = false

        for (const mission of state.missions) {
            for (const portal of mission.portals) {
                const mapPortal = window.portals[portal.guid]
                if (!mapPortal?.options?.data?.image?.length) continue

                const options = mapPortal.options
                if (portal.imageUrl !== options.data.image) {
                    portal.imageUrl = options.data.image
                    updated = true
                }
                if (portal.title !== options.data.title) {
                    portal.title = options.data.title
                    updated = true
                }
            }
        }

        if (updated) {
            this.stateManager.saveState(state)
        }
    }
}
