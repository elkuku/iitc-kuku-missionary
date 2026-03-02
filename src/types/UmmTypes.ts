export type PortalObjectiveType =
    | 'HACK_PORTAL'
    | 'INSTALL_MOD'
    | 'CAPTURE_PORTAL'
    | 'CREATE_LINK'
    | 'CREATE_FIELD'
    | 'PASSPHRASE'

export interface PassphraseParameters {
    question: string
    _single_passphrase: string
}

export interface PortalObjective {
    type: PortalObjectiveType
    passphrase_params: PassphraseParameters
}

export interface PortalLocation {
    latitude: number
    longitude: number
}

export interface UmmPortal {
    description: string
    guid: string
    imageUrl: string
    isOrnamented: boolean
    isStartPoint: boolean
    location: PortalLocation
    title: string
    type: string
    objective: PortalObjective
}

export interface UmmMission {
    missionTitle: string
    missionDescription: string
    portals: UmmPortal[]
}

export interface UmmState {
    missionSetName: string
    missionSetDescription: string
    currentMission: number
    plannedBannerLength: number
    titleFormat: string
    fileFormatVersion: number
    missions: UmmMission[]
}
