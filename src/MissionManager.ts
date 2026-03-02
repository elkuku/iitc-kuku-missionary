import {StateManager} from './StateManager'

export class MissionManager {

    constructor(private readonly stateManager: StateManager) {}

    generateTitle = (
        missionNumber: number,
        plannedLength: number,
        setName: string,
        format: string,
    ): string => {
        let title = format
        if (!format) return title

        if (plannedLength >= 1) {
            title = title.replace(/(M+)/g, String(plannedLength))
        }

        if (missionNumber >= 0) {
            const formatMatch = format.match(/(N+)/g)
            const numberFormat = formatMatch ? formatMatch[0] : ''
            if (numberFormat.length > 1) {
                const padded =
                    '0'.repeat(String(plannedLength).length - String(missionNumber).length) +
                    String(missionNumber)
                title = title.replace(/(N+)/g, padded)
            } else if (numberFormat.length === 1) {
                title = title.replace(/(N)/, String(missionNumber))
            }
        }

        if (setName) {
            title = title.replace('T', setName)
        }

        return title
    }

    syncTitles = (): void => {
        const state = this.stateManager.getState()
        for (const [index, mission] of state.missions.entries()) {
            mission.missionTitle = this.generateTitle(
                index + 1,
                state.plannedBannerLength,
                state.missionSetName,
                state.titleFormat,
            )
        }
        this.stateManager.saveState(state)
    }

    syncDescriptions = (): void => {
        const state = this.stateManager.getState()
        for (const mission of state.missions) {
            mission.missionDescription = state.missionSetDescription
        }
        this.stateManager.saveState(state)
    }

    setCurrentMission = (missionId: number): void => {
        const state = this.stateManager.getState()
        state.currentMission = missionId
        this.stateManager.saveState(state)
    }

    nextMission = (): { created: boolean; message: string } => {
        const state = this.stateManager.getState()

        if (state.missions[state.currentMission].portals.length === 0) {
            return { created: false, message: `${state.missionSetName}\nCan't start new mission.\nCurrent mission is empty.` }
        }

        if (state.currentMission + 1 === state.missions.length) {
            if (state.plannedBannerLength === 0) {
                return { created: false, message: "Can't start new mission.\nPlease enter a valid banner length first" }
            }

            if (state.currentMission < state.plannedBannerLength - 1) {
                state.missions[state.currentMission + 1] = {
                    missionTitle: this.generateTitle(
                        state.currentMission + 2,
                        state.plannedBannerLength,
                        state.missionSetName,
                        state.titleFormat,
                    ),
                    missionDescription: state.missionSetDescription,
                    portals: [],
                }
                state.currentMission = state.currentMission + 1
                this.stateManager.saveState(state)
                return { created: true, message: `${state.missionSetName}\nStart of mission #${state.currentMission + 1}\nSelect start portal.` }
            }

            return {
                created: false,
                message: `Can't start new mission.\nBanner length (${state.plannedBannerLength}) reached.`,
            }
        }

        state.currentMission = state.currentMission + 1
        this.stateManager.saveState(state)
        return { created: true, message: `${state.missionSetName}\nCurrent active mission set to #${state.currentMission + 1}` }
    }

    previousMission = (): { changed: boolean; message: string } => {
        const state = this.stateManager.getState()

        if (state.missions[state.currentMission].portals.length === 0) {
            return { changed: false, message: `${state.missionSetName}\nCan't change mission.\nCurrent mission is empty.` }
        }

        if (state.currentMission - 1 < 0) {
            return { changed: false, message: "Can't go to previous mission.\nFirst mission in set" }
        }

        state.currentMission = state.currentMission - 1
        this.stateManager.saveState(state)
        return { changed: true, message: `${state.missionSetName}\nCurrent active mission set to #${state.currentMission + 1}` }
    }

    reorderAll = (newOrder: string[]): void => {
        const state = this.stateManager.getState()
        const reordered = newOrder.map((id) => state.missions[parseInt(id)])
        const activeGuid = state.missions[state.currentMission]
        state.missions = reordered
        state.currentMission = reordered.indexOf(activeGuid)
        if (state.currentMission < 0) state.currentMission = 0
        this.stateManager.saveState(state)
    }

    splitRemainderAtEnd = async (numMissions: number): Promise<void> => {
        let state = this.stateManager.getState()

        if (state.missions.length > 1) {
            this.mergeMissions(false)
            state = this.stateManager.getState()
            await new Promise<void>((resolve) => { window.setTimeout(resolve, 250) })
        }

        const numPortals = state.missions[0].portals.length
        const portalsPerMission = Math.floor(numPortals / numMissions)
        const newMissions = []

        for (let index = 0; index < numMissions; index++) {
            const start = index * portalsPerMission
            const end = index < numMissions - 1 ? start + portalsPerMission : numPortals
            newMissions.push({
                missionTitle: this.generateTitle(index + 1, numMissions, state.missionSetName, state.titleFormat),
                missionDescription: state.missionSetDescription,
                portals: state.missions[0].portals.slice(start, end),
            })
        }

        state.missions = newMissions
        state.currentMission = numMissions - 1
        state.plannedBannerLength = numMissions
        this.stateManager.saveState(state)
    }

    splitBalanced = async (numMissions: number): Promise<void> => {
        let state = this.stateManager.getState()

        if (state.missions.length > 1) {
            this.mergeMissions(false)
            state = this.stateManager.getState()
            await new Promise<void>((resolve) => { window.setTimeout(resolve, 250) })
        }

        const numPortals = state.missions[0].portals.length
        const portalsPerMission = Math.floor(numPortals / numMissions)
        const remainder = numPortals % numMissions
        const newMissions = []
        let start = 0

        for (let index = 0; index < numMissions; index++) {
            const extra = index < remainder ? 1 : 0
            const end = start + portalsPerMission + extra
            newMissions.push({
                missionTitle: this.generateTitle(index + 1, numMissions, state.missionSetName, state.titleFormat),
                missionDescription: state.missionSetDescription,
                portals: state.missions[0].portals.slice(start, end),
            })
            start = end
        }

        state.missions = newMissions
        state.currentMission = numMissions - 1
        state.plannedBannerLength = numMissions
        this.stateManager.saveState(state)
    }

    mergeMissions = (withConfirm = true): boolean => {
        if (withConfirm && !confirm('Are you sure you want to merge all your missions into 1?\r\n\r\nThis can\'t be undone.')) {
            return false
        }

        const state = this.stateManager.getState()
        const merged = { ...state.missions[0], portals: [] as typeof state.missions[0]['portals'] }
        for (const mission of state.missions) {
            merged.portals = [...merged.portals, ...mission.portals]
        }
        state.missions = [merged]
        state.currentMission = 0
        this.stateManager.saveState(state)
        return true
    }

    reverseMission = (missionIndex: number): void => {
        const state = this.stateManager.getState()
        // eslint-disable-next-line unicorn/no-array-reverse
        state.missions[missionIndex].portals = [...state.missions[missionIndex].portals].reverse()
        this.stateManager.saveState(state)
    }

    saveBannerDetails = (
        name: string,
        description: string,
        plannedLength: number,
        format: string,
    ): boolean => {
        const state = this.stateManager.getState()
        let valid = true

        if (name) {
            state.missionSetName = name
            $('#umm-mission-set-name-error').css('display', 'none')
        } else {
            valid = false
            $('#umm-mission-set-name-error').css('display', 'block')
        }

        if (description) {
            state.missionSetDescription = description
            $('#umm-mission-set-description-error').css('display', 'none')
        } else {
            valid = false
            $('#umm-mission-set-description-error').css('display', 'block')
        }

        if (plannedLength && !isNaN(plannedLength) && plannedLength >= state.missions.length) {
            state.plannedBannerLength = plannedLength
            $('#umm-mission-planned-banner-length-error').css('display', 'none')
        } else {
            valid = false
            $('#umm-mission-planned-banner-length-error').css('display', 'block')
        }

        if (format) {
            state.titleFormat = format
            $('#umm-mission-title-format-error').css('display', 'none')
        } else {
            valid = false
            $('#umm-mission-title-format-error').css('display', 'block')
        }

        if (valid) {
            this.stateManager.saveState(state)
            this.syncTitles()
            this.syncDescriptions()
        }

        return valid
    }

    exportData = (): void => {
        const state = this.stateManager.getState()
        const data = JSON.stringify(state)
        const sanitized = state.missionSetName.replace(/[\W_]+/g, ' ')
        const filename = `${sanitized}-mission-data.json`

        if (typeof window.saveFile === 'function') {
            window.saveFile(data, filename, 'application/json')
        } else if (window.isSmartphone()) {
            alert(`Copy the following data:\n\n${data}`)
        } else {
            const link = document.createElement('a')
            link.href = `data:text/json;charset=utf-8,${encodeURIComponent(data)}`
            link.download = filename
            link.click()
        }
    }

    importFromJson = (jsonString: string): { success: boolean; message: string } => {
        let imported: ReturnType<StateManager['getState']>
        try {
            imported = JSON.parse(jsonString) as ReturnType<StateManager['getState']>
        } catch {
            return { success: false, message: 'Invalid JSON file' }
        }

        if (imported.fileFormatVersion > StateManager.FILE_FORMAT_VERSION) {
            return {
                success: false,
                message: "You've attempted to load data that's newer than what's supported. Please update UMM.",
            }
        }

        imported = this.stateManager.migrateState(imported)

        let errorsDetected = false

        if (imported.currentMission > imported.missions.length - 1) {
            imported.currentMission = imported.missions.length - 1
            errorsDetected = true
        }

        if (imported.missions.length > imported.plannedBannerLength) {
            imported.plannedBannerLength = imported.missions.length
            errorsDetected = true
        }

        this.stateManager.saveState(imported)

        if (errorsDetected) {
            this.syncTitles()
        }

        const message = errorsDetected
            ? `Incorrect data corrected.\nBanner data loaded:\n${imported.missionSetName}`
            : `Banner data loaded:\n${imported.missionSetName}`

        return { success: true, message }
    }
}
