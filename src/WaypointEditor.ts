/* eslint-disable no-underscore-dangle */
import {StateManager} from './StateManager'
import {Notification} from './Notification'
import {PortalObjectiveType} from './types/UmmTypes'

const POSSIBLE_ACTIONS: { action: PortalObjectiveType; label: string }[] = [
    { action: 'HACK_PORTAL', label: 'Hack portal' },
    { action: 'INSTALL_MOD', label: 'Install mod' },
    { action: 'CAPTURE_PORTAL', label: 'Capture portal' },
    { action: 'CREATE_LINK', label: 'Create link' },
    { action: 'CREATE_FIELD', label: 'Create field' },
    { action: 'PASSPHRASE', label: 'Enter passphrase' },
]

export class WaypointEditor {

    constructor(
        private readonly stateManager: StateManager,
        private readonly notification: Notification,
    ) {}

    addWaypointEditorToPortal = (): void => {
        const state = this.stateManager.getState()

        const missionIds = this.getMissionIdsForGuid(window.selectedPortal ?? '', state)
        if (missionIds.length === 0) return

        const container = document.createElement('div')
        container.setAttribute('id', 'umm-waypoint-editor')

        const title = document.createElement('span')
        title.appendChild(document.createTextNode('UMM Waypoint Editor'))
        title.setAttribute('class', 'umm-waypoint-editor-title')
        container.appendChild(title)

        const selectContainer = document.createElement('div')
        selectContainer.setAttribute('class', 'umm-waypoint-select-container')

        const missionSelect = this.buildMissionSelect(missionIds)
        selectContainer.appendChild(missionSelect)

        const actionPlaceholder = document.createElement('select')
        actionPlaceholder.setAttribute('id', 'umm-action-select')
        selectContainer.appendChild(actionPlaceholder)

        container.appendChild(selectContainer)

        const passphrasePlaceholder = document.createElement('div')
        passphrasePlaceholder.setAttribute('id', 'umm-passphrase-container')
        container.appendChild(passphrasePlaceholder)

        const details = document.getElementById('portaldetails')
        const randDetails = document.getElementById('randdetails')
        if (details && randDetails) {
            randDetails.before(container)
        }

        $('#umm-mission-select').on('change', () => {
            if ($('#umm-mission-select').val() === '#') {
                $('#umm-action-select').prop('disabled', true)
                $('#umm-passphrase-container').hide()
            } else {
                this.updateActionSelect()
                this.updatePassphraseContent()
            }
        })

        this.updateActionSelect()
        this.updatePassphraseContent()
    }

    private getMissionIdsForGuid = (
        guid: string,
        state: ReturnType<StateManager['getState']>,
    ): string[] => {
        const ids: string[] = []
        for (const [index, mission] of state.missions.entries()) {
            for (const portal of mission.portals) {
                const idStr = String(index)
                if (portal.guid === guid && !ids.includes(idStr)) {
                    ids.push(idStr)
                }
            }
        }
        return ids
    }

    private buildMissionSelect = (missionIds: string[]): HTMLSelectElement => {
        const select = document.createElement('select')
        select.setAttribute('id', 'umm-mission-select')

        const defaultOption = document.createElement('option')
        defaultOption.setAttribute('value', '#')
        defaultOption.appendChild(document.createTextNode('Select mission'))
        select.appendChild(defaultOption)

        for (const missionId of missionIds) {
            const option = document.createElement('option')
            option.dataset.missionId = missionId
            option.setAttribute('value', missionId)
            option.appendChild(document.createTextNode(String(parseInt(missionId) + 1)))
            select.appendChild(option)
        }

        const options = select.getElementsByTagName('option')
        if (options.length > 1) {
            options[1].setAttribute('selected', 'selected')
        }

        return select
    }

    private findWaypointIdForPortal = (missionId: string): number => {
        const state = this.stateManager.getState()
        const guid = window.selectedPortal ?? ''
        const missionIndex = parseInt(missionId)
        for (const [portalIndex, portal] of state.missions[missionIndex].portals.entries()) {
            if (portal.guid === guid) {
                return portalIndex
            }
        }
        return 0
    }

    private buildActionSelect = (missionId: string): HTMLSelectElement => {
        const state = this.stateManager.getState()
        const select = document.createElement('select')
        select.setAttribute('id', 'umm-action-select')
        select.setAttribute('name', 'umm-action-select')

        const portalId = this.findWaypointIdForPortal(missionId)
        const missionIndex = parseInt(missionId)
        const currentType = state.missions[missionIndex].portals[portalId].objective.type

        for (const action of POSSIBLE_ACTIONS) {
            const option = document.createElement('option')
            option.setAttribute('value', action.action)
            option.appendChild(document.createTextNode(action.label))
            if (currentType === action.action) {
                option.setAttribute('selected', 'selected')
            }
            select.appendChild(option)
        }

        return select
    }

    private buildPassphraseBox = (missionId: string): HTMLDivElement => {
        const state = this.stateManager.getState()
        const portalId = this.findWaypointIdForPortal(missionId)
        const missionIndex = parseInt(missionId)
        const objective = state.missions[missionIndex].portals[portalId].objective

        const container = document.createElement('div')
        container.setAttribute('id', 'umm-passphrase-container')

        const questionLabel = document.createElement('span')
        questionLabel.appendChild(document.createTextNode('Question'))
        container.appendChild(questionLabel)

        const questionInput = document.createElement('textarea')
        questionInput.setAttribute('type', 'text')
        questionInput.setAttribute('id', 'umm-passphrase-question')
        questionInput.setAttribute('rows', '1')
        questionInput.appendChild(
            document.createTextNode(objective.passphrase_params.question ?? ''),
        )
        questionInput.addEventListener('blur', () => { this.savePassphrase() })
        container.appendChild(questionInput)

        const passphraseLabel = document.createElement('span')
        passphraseLabel.appendChild(document.createTextNode('Passphrase'))
        container.appendChild(passphraseLabel)

        const passphraseInput = document.createElement('input')
        passphraseInput.setAttribute('type', 'text')
        passphraseInput.setAttribute('id', 'umm-passphrase-passphrase')
        passphraseInput.setAttribute('value', objective.passphrase_params._single_passphrase ?? '')
        passphraseInput.addEventListener('blur', () => { this.savePassphrase() })
        container.appendChild(passphraseInput)

        return container
    }

    private savePassphrase = (): void => {
        const state = this.stateManager.getState()
        const missionId = String($('#umm-mission-select').val())
        const missionIndex = parseInt(missionId)
        const portalId = this.findWaypointIdForPortal(missionId)
        state.missions[missionIndex].portals[portalId].objective.passphrase_params = {
            question: String($('#umm-passphrase-question').val()),
            _single_passphrase: String($('#umm-passphrase-passphrase').val()),
        }
        this.stateManager.saveState(state)
        this.notification.show('Question and passphrase saved')
    }

    private updatePassphraseContent = (): void => {
        const missionId = String($('#umm-mission-select').val())
        $('#umm-passphrase-container').replaceWith(this.buildPassphraseBox(missionId))

        $('#umm-passphrase-container').children('textarea').each(function () {
            this.setAttribute('style', `height:${this.scrollHeight}px;overflow-y:hidden;`)
        }).on('input', function () {
            this.style.height = 'auto'
            this.style.height = `${this.scrollHeight}px`
        })

        if ($('#umm-action-select').val() === 'PASSPHRASE') {
            $('#umm-passphrase-container').css('display', 'flex')
        }
    }

    private updateActionSelect = (): void => {
        const missionId = String($('#umm-mission-select').val())
        $('#umm-action-select').replaceWith(this.buildActionSelect(missionId))

        $('#umm-action-select').on('change', () => {
            const action = String($('#umm-action-select').val())
            if (action === 'PASSPHRASE') {
                this.updatePassphraseContent()
            } else {
                $('#umm-passphrase-container').hide()
            }

            const state = this.stateManager.getState()
            const selectedMissionId = String($('#umm-mission-select').val())
            const selectedMissionIndex = parseInt(selectedMissionId)
            const portalId = this.findWaypointIdForPortal(selectedMissionId)
            state.missions[selectedMissionIndex].portals[portalId].objective.type =
                action as PortalObjectiveType
            this.stateManager.saveState(state)
            this.notification.show('Portal action saved')
        })
    }
}
