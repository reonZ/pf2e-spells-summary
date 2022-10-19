import MODULE_ID from './utils/module.js'

/** @param {CharacterSheetPF2e} sheet */
export function getSheetToggled(sheet) {
    return getProperty(sheet, `modules.${MODULE_ID}.toggled`)
}

/**
 * @param {CharacterSheetPF2e} sheet
 * @param {boolean} toggled
 */
export function setSheetToggled(sheet, toggled) {
    setProperty(sheet, `modules.${MODULE_ID}.toggled`, toggled)
}
