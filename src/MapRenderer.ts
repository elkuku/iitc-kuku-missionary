import {StateManager} from './StateManager'

const generateMarker = (type: string, markerNumber: number): string =>
    `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 49" class="umm-mission-marker"><defs><style>.cls-2{fill:#fff;}</style></defs><path class="${type}" d="M33,18c0,8.84-12,31-16,31S1,26.84,1,18,8.16,1,17,1,33,9.16,33,18Z" transform="translate(-0.5 -0.5)"/><circle class="cls-2" cx="16.5" cy="16.5" r="13"/><foreignObject x="0" y="0" width="34px" height="34px"><span class="umm-mission-number">${markerNumber}</span></foreignObject></svg>`

export class MapRenderer {

    readonly missionPaths: L.FeatureGroup<L.ILayer>
    readonly missionNumbers: L.FeatureGroup<L.ILayer>

    constructor(private readonly stateManager: StateManager) {
        this.missionPaths = new window.L.FeatureGroup()
        this.missionNumbers = new window.L.FeatureGroup()
    }

    drawMissions = (): void => {
        this.missionPaths.clearLayers()
        const state = this.stateManager.getState()
        for (const [index] of state.missions.entries()) {
            if (state.missions[index].portals.length > 1) {
                this.drawMission(state, index)
            }
        }
    }

    drawMission = (state: ReturnType<StateManager['getState']>, missionId: number): void => {
        const coordinates: L.LatLng[] = []
        for (const portal of state.missions[missionId].portals) {
            coordinates.push(new L.LatLng(portal.location.latitude, portal.location.longitude))
        }
        const polyline = L.geodesicPolyline(coordinates, {
            color: missionId === state.currentMission ? '#ff9a00' : 'crimson',
            weight: 5,
            smoothFactor: 1,
        })
        this.missionPaths.addLayer(polyline)
    }

    refreshMissionNumbers = (): void => {
        if (window.map.hasLayer(this.missionNumbers)) {
            this.missionNumbers.clearLayers()
            this.addMissionNumbers()
        }
    }

    addMissionNumbers = (): void => {
        const state = this.stateManager.getState()

        for (const [index, mission] of state.missions.entries()) {
            if (mission.portals.length > 0) {
                const portal = mission.portals[0]
                const markerType = index === state.currentMission ? 'active' : 'start'

                const marker = L.marker(
                    { lat: portal.location.latitude, lng: portal.location.longitude },
                    {
                        icon: L.divIcon({
                            className: 'umm-mission-icon',
                            iconSize: [34, 50],
                            iconAnchor: [17, 50],
                            html: generateMarker(markerType, index + 1),
                        }),
                        interactive: false,
                    },
                )
                this.missionNumbers.addLayer(marker)
            }
        }
    }

    zoomAllMissions = (): void => {
        const pathBounds = this.missionPaths.getBounds()
        if (
            Object.prototype.hasOwnProperty.call(pathBounds, '_southWest') &&
            Object.prototype.hasOwnProperty.call(pathBounds, '_northEast')
        ) {
            window.map.fitBounds(pathBounds)
        } else {
            window.map.fitBounds(this.missionNumbers.getBounds())
        }
    }

    togglePaths = (show: boolean): void => {
        if (show) {
            window.map.addLayer(this.missionPaths)
        } else {
            window.map.removeLayer(this.missionPaths)
        }
    }

    toggleNumbers = (show: boolean): void => {
        if (show) {
            window.map.addLayer(this.missionNumbers)
        } else {
            window.map.removeLayer(this.missionNumbers)
        }
    }

    drawLineToPortal = (fromLat: number, fromLng: number, toLat: number, toLng: number): void => {
        const coordinates = [new L.LatLng(fromLat, fromLng), new L.LatLng(toLat, toLng)]
        const polyline = L.geodesicPolyline(coordinates, {
            color: '#ff9a00',
            weight: 5,
            smoothFactor: 1,
        })
        this.missionPaths.addLayer(polyline)
    }
}
