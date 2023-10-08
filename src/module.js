export const MODULE_ID = 'pf2e-spells-summary'

export function templatePath(template) {
    return `modules/${MODULE_ID}/templates/${template}.hbs`
}

export function getSetting(setting) {
    return game.settings.get(MODULE_ID, setting)
}

export function localeCompare(a, b) {
    return a.localeCompare(b, game.i18n.lang)
}
