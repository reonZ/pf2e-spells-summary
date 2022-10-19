import MODULE_ID from './module.js'

/** @param {...string} path */
export function templatePath(...path) {
    return `modules/${MODULE_ID}/templates/${path.join('/')}`
}

/**@param {string} key*/
export function getSetting(key) {
    return game.settings.get(MODULE_ID, key)
}

/**
 * @template T
 * @param {string} key
 * @param {T} value
 */
export function setSetting(key, value) {
    return game.settings.set(MODULE_ID, key, value)
}
