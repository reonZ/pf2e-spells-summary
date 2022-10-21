import { getSheetToggled, setSheetToggled } from './utils.js'
import { templatePath } from './utils/foundry.js'

/** @param {JQuery} $html */
function getSpellcastingNav($html) {
    return $html.find('nav.sheet-navigation .item[data-tab=spellcasting]')
}

/** @param {JQuery} $html */
function getSpellcastingTab($html) {
    return $html.find('section.sheet-body .sheet-content > .tab[data-tab=spellcasting]')
}

/** @param {JQuery} $html */
function getSpellcastingSummarySection($html) {
    return getSpellcastingTab($html).find('.directory-list.summary')
}

/**
 * @param {CharacterSheetPF2e} sheet
 * @param {JQuery} $html
 * @param {CharacterSheetData} data
 */
export async function onRenderCharacterSheetPF2e(sheet, $html, data) {
    const actor = sheet.actor
    if (actor.pack || !actor.id || !game.actors.has(actor.id)) return

    const $spellcastingTab = getSpellcastingTab($html)

    if (getSheetToggled(sheet)) $spellcastingTab.addClass('toggled')

    addNavEvent($html, sheet)
    await addSummaryTab($html, data, sheet)

    if ($spellcastingTab.hasClass('toggled') && $spellcastingTab.hasClass('active')) {
        sheet._restoreScrollPositions($html)
    }
}

/**
 * @param {JQuery} $html
 * @param {CharacterSheetPF2e} sheet
 */
function addNavEvent($html, sheet) {
    getSpellcastingNav($html).on('click', event => onSpellcastingBtnToggle(event, $html, sheet))
}

/**
 * @param {JQuery.ClickEvent} event
 * @param {JQuery} $html
 * @param {CharacterSheetPF2e} sheet
 */
function onSpellcastingBtnToggle(event, $html, sheet) {
    event.preventDefault()
    const $spellcasting = getSpellcastingTab($html)
    if ($spellcasting.hasClass('active')) {
        $spellcasting.toggleClass('toggled')
        $spellcasting.scrollTop(0)
        setSheetToggled(sheet, $spellcasting.hasClass('toggled'))
    }
}

/**
 * @param {JQuery} $html
 * @param {CharacterSheetData} data
 * @param {CharacterSheetPF2e} sheet
 */
async function addSummaryTab($html, data, sheet) {
    const $spellcasting = getSpellcastingTab($html)

    const template = await renderTemplate(templatePath('sheet.html'), {
        entries: getEntries(data),
        rituals: getRituals(data),
        focusPool: data.data.resources.focus,
        editable: data.editable,
    })

    $spellcasting.append(template)
    addSummaryEvents($html, sheet)
}

/** @param {CharacterSheetData} data */
function getRituals(data) {
    const rituals = /** @type {SpellcastingLevelRitual[]} */ ([])

    data.spellcastingEntries.forEach(entry => {
        if (!entry.isRitual || !entry.hasCollection || !entry.levels.some(x => x.active.some(y => y !== null))) return

        entry.levels.forEach(level => {
            if (!level.active.length) return

            rituals.push(
                ...level.active.flatMap((x, i) => ({
                    id: x.spell.id,
                    name: x.spell.name,
                    img: x.spell.img,
                    entryId: entry.id,
                    level: level.level,
                    slotId: i,
                    time: x.spell.system.time.value,
                    secondary: x.spell.system.secondarycasters.value,
                }))
            )
        })
    })

    rituals.sort((a, b) => a.level - b.level)

    return rituals
}

/** @param {CharacterSheetData} data */
function getEntries(data) {
    const focusPool = data.data.resources.focus
    const entries = /** @type {SpellcastingEntry[]} */ ([])

    data.spellcastingEntries.forEach(entry => {
        if (entry.isRitual || !entry.hasCollection || !entry.levels.some(x => x.active.some(y => y !== null))) return

        const check = entry.statistic.check
        const dc = entry.statistic.dc
        const isPrepared = !!entry.isPrepared
        const isFlexible = !!entry.isFlexible
        const isFocus = !!entry.isFocusPool
        const isSpontaneous = !!entry.isSpontaneous
        const isInnate = !!entry.isInnate

        entry.levels.forEach(level => {
            if (!level.active.length) return

            entries[level.level] = entries[level.level] || {
                label: level.label,
                level: level.level,
                isCantrip: level.isCantrip,
                spells: [],
            }

            entries[level.level].spells.push(
                ...level.active
                    .filter(x => x && x.spell)
                    .flatMap((x, i) => ({
                        id: x.spell.id,
                        name: x.spell.name,
                        img: x.spell.img,
                        uses: x.uses,
                        isVirtual: !!x.virtual,
                        icon: x.spell.system.time.value,
                        components: x.spell.components,
                        entryId: entry.id,
                        slotId: i,
                        isPrepared,
                        isFlexible,
                        isInnate,
                        isSpontaneous,
                        isFocus,
                        dc,
                        check,
                        parentUses: level.uses,
                        expended: level.isCantrip
                            ? false
                            : isPrepared && !isFlexible
                            ? !!x.expended
                            : isFocus
                            ? focusPool.value <= 0
                            : isInnate && x.uses?.value != null
                            ? x.uses.value <= 0
                            : (isSpontaneous || isFlexible) && level.uses?.value != null
                            ? level.uses.value <= 0
                            : false,
                    }))
            )
        })
    })

    entries.forEach(entry => entry.spells.sort((a, b) => a.name.localeCompare(b.name)))

    return entries
}

/**
 * @param {JQuery<HTMLElement>} $html
 * @param {CharacterSheetPF2e} sheet
 */
function addSummaryEvents($html, sheet) {
    const $summary = getSpellcastingSummarySection($html)

    const $usesInputs = /** @type {JQuery<HTMLInputElement>} */ ($summary.find('.spell-range .uses .spell-slots-input input'))
    $usesInputs.on('change', event => onUsesInputChange(event, sheet))
    $usesInputs.on('focus', onUsesInputFocus)
    $usesInputs.on('blur', onUsesInputBlur)

    $summary.find('.cast-spell').on('click', event => onCastSpell(event, sheet))
    $summary.find('.item-toggle-prepare').on('click', event => onTogglePrepare(event, sheet))
    $summary.find('.focus-pips').on('click contextmenu', event => onToggleFocusPool(event, sheet))
    $summary.find('.spell-slots-increment-reset').on('click', event => onSlotsReset(event, sheet))
    $summary.find('.item-image').on('click', event => onItemToChat(event, sheet))
    $summary.find('.item-name > h4').on('click', event => onToggleSummary(event, sheet))
}

/**
 * @param {JQuery.ClickEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
async function onToggleSummary(event, sheet) {
    const $item = $(event.currentTarget).closest('.item')
    sheet.itemRenderer.toggleSummary($item)
}

/**
 * @param {JQuery.ClickEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
async function onItemToChat(event, sheet) {
    const itemId = $(event.currentTarget).closest('.item').attr('data-item-id')
    const item = sheet.actor.items.get(itemId ?? '', { strict: true })
    if (!item || (item.isOfType('physical') && !item.isIdentified)) return
    await item.toChat(event)
}

/**
 * @param {JQuery.ClickEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
function onSlotsReset(event, sheet) {
    event.preventDefault()

    const { itemId, level } = $(event.currentTarget).data()
    if (!itemId) return

    const item = sheet.actor.items.get(itemId)
    if (!item) return

    if (item.isOfType('spellcastingEntry')) {
        const { system } = item.toObject()
        if (!system.slots) return
        const slotLevel = goesToEleven(level) ? `slot${level}` : 'slot0'
        system.slots[slotLevel].value = system.slots[slotLevel].max
        item.update({ system })
    } else if (item.isOfType('spell')) {
        const max = item.system.location.uses?.max
        if (!max) return
        item.update({ 'system.location.uses.value': max })
    }
}

/**
 * @param {number} value
 * @returns {value is ZeroToEleven}
 */
function goesToEleven(value) {
    return value >= 0 && value <= 11
}

/**
 * @param {JQuery.ChangeEvent<any, any, HTMLInputElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
function onUsesInputChange(event, sheet) {
    event.preventDefault()

    const { itemId, itemProperty } = event.currentTarget.dataset
    if (!itemId || !itemProperty) return

    const value = event.currentTarget.valueAsNumber
    sheet.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, [itemProperty]: value }])
}

/**
 * @param {JQuery.TriggeredEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
function onToggleFocusPool(event, sheet) {
    event.preventDefault()
    const change = event.type === 'click' ? 1 : -1
    const points = (sheet.actor.system.resources.focus?.value ?? 0) + change
    sheet.actor.update({ 'system.resources.focus.value': points })
}

/**
 * @param {JQuery.ClickEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
function onTogglePrepare(event, sheet) {
    event.preventDefault()
    const { slotLevel, slotId, entryId, expendedState } = $(event.currentTarget).closest('.item').data()
    const collection = sheet.actor.spellcasting.collections.get(entryId)
    collection?.setSlotExpendedState(slotLevel ?? 0, slotId ?? 0, expendedState !== true)
}

/**
 * @param {JQuery.ClickEvent<any, any, HTMLElement>} event
 * @param {CharacterSheetPF2e} sheet
 */
function onCastSpell(event, sheet) {
    event.preventDefault()
    const { itemId, slotLevel, slotId, entryId } = $(event.currentTarget).closest('.item').data()

    const collection = sheet.actor.spellcasting.collections.get(entryId, { strict: true })
    if (!collection) return

    const spell = collection.get(itemId, { strict: true })
    if (!spell) return

    collection.entry.cast(spell, { slot: slotId, level: slotLevel })
}

/** @param {JQuery.FocusEvent<any, any, HTMLInputElement>} event */
function onUsesInputFocus(event) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.add('hover')
}

/** @param {JQuery.BlurEvent<any, any, HTMLInputElement>} event */
function onUsesInputBlur(event) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.remove('hover')
}
