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

    renderForPortal = ($target: JQuery, missionId: number, portalIndex: number): void => {
        const state = this.stateManager.getState()
        const objective = state.missions[missionId].portals[portalIndex].objective

        const container = document.createElement('div')
        container.setAttribute('class', 'umm-inline-waypoint')

        // Action select
        const actionSelect = document.createElement('select')
        actionSelect.setAttribute('class', 'umm-inline-action-select')
        for (const action of POSSIBLE_ACTIONS) {
            const option = document.createElement('option')
            option.setAttribute('value', action.action)
            option.appendChild(document.createTextNode(action.label))
            if (objective.type === action.action) {
                option.setAttribute('selected', 'selected')
            }
            actionSelect.appendChild(option)
        }
        container.appendChild(actionSelect)

        // Passphrase container
        const passphraseContainer = document.createElement('div')
        passphraseContainer.setAttribute('class', 'umm-inline-passphrase')
        if (objective.type !== 'PASSPHRASE') {
            passphraseContainer.style.display = 'none'
        }

        const questionLabel = document.createElement('span')
        questionLabel.appendChild(document.createTextNode('Question'))
        passphraseContainer.appendChild(questionLabel)

        const questionInput = document.createElement('textarea')
        questionInput.setAttribute('rows', '1')
        questionInput.appendChild(document.createTextNode(objective.passphrase_params.question ?? ''))
        passphraseContainer.appendChild(questionInput)

        const passphraseLabel = document.createElement('span')
        passphraseLabel.appendChild(document.createTextNode('Passphrase'))
        passphraseContainer.appendChild(passphraseLabel)

        const passphraseInput = document.createElement('input')
        passphraseInput.setAttribute('type', 'text')
        passphraseInput.setAttribute('value', objective.passphrase_params._single_passphrase ?? '')
        passphraseContainer.appendChild(passphraseInput)

        container.appendChild(passphraseContainer)

        const savePassphrase = (): void => {
            const currentState = this.stateManager.getState()
            currentState.missions[missionId].portals[portalIndex].objective.passphrase_params = {
                question: questionInput.value,
                _single_passphrase: passphraseInput.value,
            }
            this.stateManager.saveState(currentState)
            this.notification.show('Passphrase saved')
        }

        questionInput.addEventListener('blur', savePassphrase)
        passphraseInput.addEventListener('blur', savePassphrase)

        actionSelect.addEventListener('change', () => {
            const action = actionSelect.value as PortalObjectiveType
            passphraseContainer.style.display = action === 'PASSPHRASE' ? 'flex' : 'none'
            const currentState = this.stateManager.getState()
            currentState.missions[missionId].portals[portalIndex].objective.type = action
            this.stateManager.saveState(currentState)
            this.notification.show('Portal action saved')
            $target.closest('li.umm-portal-item').find('.umm-badge').text(action.replace('_', ' '))
        })

        $target.empty().append(container)
    }
}
