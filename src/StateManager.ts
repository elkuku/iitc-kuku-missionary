import {UmmState} from './types/UmmTypes'

export class StateManager {

    static readonly STORAGE_KEY = 'ultimate-mission-maker'
    static readonly FILE_FORMAT_VERSION = 2

    getState = (): UmmState => {
        const raw = localStorage.getItem(StateManager.STORAGE_KEY)
        if (!raw) {
            this.clearMissionData()
            return this.getState()
        }
        return JSON.parse(raw) as UmmState
    }

    saveState = (state: UmmState): void => {
        localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(state))
    }

    clearMissionData = (): void => {
        const emptyState: UmmState = {
            missionSetName: '',
            missionSetDescription: '',
            currentMission: 0,
            plannedBannerLength: 0,
            titleFormat: 'T NN-M',
            fileFormatVersion: StateManager.FILE_FORMAT_VERSION,
            missions: [
                {
                    missionTitle: '',
                    missionDescription: '',
                    portals: [],
                },
            ],
        }
        localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(emptyState))
    }

    migrateState = (state: UmmState): UmmState => {
        const migrated = state

        if (migrated.fileFormatVersion === undefined || (migrated.fileFormatVersion as unknown) === '') {
            const legacy = migrated as unknown as Record<string, unknown>

            if (!migrated.missionSetName) {
                migrated.missionSetName = (legacy.missionName as string | undefined) ?? ''
                delete legacy.missionName
            }

            if (!migrated.missionSetDescription) {
                migrated.missionSetDescription = (legacy.missionDescription as string | undefined) ?? ''
                delete legacy.missionDescription
            }

            if (!migrated.titleFormat) {
                migrated.titleFormat = 'T NN-M'
            }

            if (legacy.numberOfMissions === undefined) {
                migrated.plannedBannerLength = Object.keys(migrated.missions).length
            } else {
                migrated.plannedBannerLength = legacy.numberOfMissions as number
                delete legacy.numberOfMissions
            }

            if (!Object.keys(migrated.missions[0]).includes('portals')) {
                const oldMissions = migrated.missions as unknown as Record<string, unknown>[]
                if ((oldMissions[0][0] as Record<string, unknown> | undefined)?.guid) {
                    const newMissions = []
                    for (const [missionIndex] of migrated.missions.entries()) {
                        const missionTitle = this.generateTitle(
                            missionIndex + 1,
                            migrated.plannedBannerLength > 0 ? migrated.plannedBannerLength : migrated.missions.length,
                            migrated.missionSetName,
                            migrated.titleFormat,
                        )
                        newMissions.push({
                            missionTitle,
                            missionDescription: migrated.missionSetDescription,
                            portals: oldMissions[missionIndex] as unknown as never,
                        })
                    }
                    migrated.missions = newMissions
                } else {
                    migrated.missions = [{ missionTitle: '', missionDescription: '', portals: [] }]
                }
            }

            migrated.fileFormatVersion = 1
        }

        if (migrated.fileFormatVersion === 1) {
            for (const mission of migrated.missions) {
                for (const portal of mission.portals) {
                    portal.objective = {
                        type: 'HACK_PORTAL',
                        passphrase_params: { question: '', _single_passphrase: '' },
                    }
                }
            }
            migrated.fileFormatVersion = 2
        }

        if (migrated.fileFormatVersion === 2) {
            for (const mission of migrated.missions) {
                for (const portal of mission.portals) {
                    if ((portal.objective.type as string) === 'HACK') {
                        portal.objective.type = 'HACK_PORTAL'
                    }
                }
            }
        }

        return migrated
    }

    isInitialized = (): boolean => localStorage.getItem(StateManager.STORAGE_KEY) !== null

    private generateTitle = (
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
                    '0'.repeat(String(plannedLength).length - String(missionNumber).length) + String(missionNumber)
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
}
