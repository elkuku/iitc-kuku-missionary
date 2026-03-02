
export interface HelperHandlebars {
    compile: (templateString: any) => Handlebars.TemplateDelegate
    registerHelper: (name: Handlebars.HelperDeclareSpec) => void
}

export interface UmmPlugin {
    missionModeActive: boolean
    notificationTimer: number | undefined
    ummMissionPaths: L.FeatureGroup<L.ILayer>
    ummMissionNumbers: L.FeatureGroup<L.ILayer>
}

declare global {
    interface Window {
        plugin: {
            HelperHandlebars: HelperHandlebars
            umm: UmmPlugin
        }
        saveFile?: (data: string, filename: string, mimeType: string) => void
    }
}
