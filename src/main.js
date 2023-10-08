import { MODULE_ID } from './module'
import { renderCharacterSheetPF2e } from './sheet'

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

Hooks.once('ready', () => {
    game.settings.register(MODULE_ID, 'order', {
        name: `${MODULE_ID}.settings.order.name`,
        hint: `${MODULE_ID}.settings.order.hint`,
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
