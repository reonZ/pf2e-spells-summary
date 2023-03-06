import { setModuleID } from '@utils/module'
import { registerSetting } from '@utils/foundry/settings'
import { onRenderCharacterSheetPF2e } from './sheet'

export const MODULE_ID = 'pf2e-spells-summary'
setModuleID(MODULE_ID)

Hooks.on('renderCharacterSheetPF2e', onRenderCharacterSheetPF2e)

Hooks.once('ready', () => {
    registerSetting({
        name: 'order',
        type: Boolean,
        default: false,
        config: true,
        scope: 'client',
        onChange: refreshSheets,
    })
})

function refreshSheets() {
    Object.values(ui.windows).forEach(win => win instanceof ActorSheet && win.actor.type === 'character' && win.render())
}
