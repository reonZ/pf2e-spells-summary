import { getData } from './actor'
import { MODULE_ID, templatePath } from './module'

export async function renderCharacterSheetPF2e(sheet, html) {
    const actor = sheet.actor
    if (!actor || actor.pack || !actor.id || !actor.isOfType('character')) return

    const tab = getSpellcastingTab(html)

    if (getProperty(sheet, `modules.${MODULE_ID}.toggled`)) tab.addClass('toggled')

    getSpellcastingNav(html).on('click', event => onSpellcastingBtnToggle(event, html, sheet))
    await addSummaryTab(html, sheet, actor)

    if (tab.hasClass('toggled') && tab.hasClass('active')) {
        sheet._restoreScrollPositions(html)
    }
}

async function addSummaryTab(html, sheet, actor) {
    const tab = getSpellcastingTab(html)
    const data = await getData(actor)

    const template = await renderTemplate(templatePath('sheet'), data)

    tab.append(template)
    addSummaryEvents(html, sheet, actor)
}

function addSummaryEvents(html, sheet, actor) {
    const summary = getSpellcastingSummarySection(html)

    const inputs = summary.find('.spell-type .uses .spell-slots-input input')
    inputs.on('change', event => onUsesInputChange(event, actor))
    inputs.on('focus', onUsesInputFocus)
    inputs.on('blur', onUsesInputBlur)

    summary.find('.cast-spell').on('click', event => onCastSpell(event, actor))
    summary.find('.item-toggle-prepare').on('click', event => onTogglePrepare(event, actor))
    summary.find('.focus-pips').on('click contextmenu', event => onToggleFocusPool(event, actor))
    summary.find('.spell-slots-increment-reset').on('click', event => onSlotsReset(event, sheet, actor))
    summary.find('.item-image').on('click', event => onItemToChat(event, actor))
    summary.find('.item-name > h4').on('click', event => onToggleSummary(event, sheet))
}

async function onUsesInputChange(event, actor) {
    event.preventDefault()

    const { inputPath, entryId } = $(event.currentTarget).data()
    const value = event.currentTarget.valueAsNumber
    actor.updateEmbeddedDocuments('Item', [{ _id: entryId, [inputPath]: value }])
}

function onUsesInputFocus(event) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.add('hover')
}

function onUsesInputBlur(event) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.remove('hover')
}

function onTogglePrepare(event, actor) {
    event.preventDefault()
    const { slotLevel, slotId, entryId, expended } = $(event.currentTarget).closest('.item').data()
    const collection = actor.spellcasting.collections.get(entryId)
    collection?.setSlotExpendedState(slotLevel ?? 0, slotId ?? 0, expended !== true)
}

function onToggleFocusPool(event, actor) {
    event.preventDefault()
    const change = event.type === 'click' ? 1 : -1
    const points = (actor.system.resources.focus?.value ?? 0) + change
    actor.update({ 'system.resources.focus.value': points })
}

function onChargeReset(sheet, entryId) {
    const original = getSpellcastingOriginalSection(sheet.element)
    const entry = original.find(`.item-container.spellcasting-entry[data-item-id=${entryId}]`)
    const btn = entry.find('.spell-ability-data .statistic-values a.pf2e-staves-charge')
    btn[0]?.click()
}

function onSlotsReset(event, sheet, actor) {
    event.preventDefault()

    const { itemId, level, isCharge } = $(event.currentTarget).data()
    if (!itemId) return

    if (isCharge) {
        onChargeReset(sheet, itemId)
        return
    }

    const item = actor.items.get(itemId)
    if (!item) return

    if (item.isOfType('spellcastingEntry')) {
        const slotLevel = level >= 0 && level <= 11 ? `slot${level}` : 'slot0'
        const slot = item.system.slots?.[slotLevel]
        if (slot) item.update({ [`system.slots.${slotLevel}.value`]: slot.max })
    } else if (item.isOfType('spell')) {
        const max = item.system.location.uses?.max
        if (max) item.update({ 'system.location.uses.value': max })
    }
}

function onCastSpell(event, actor) {
    event.preventDefault()

    const target = $(event.currentTarget)
    if (target.prop('disabled')) return

    const { itemId, slotLevel, slotId, entryId } = target.closest('.item').data()
    const collection = actor.spellcasting.collections.get(entryId)
    if (!collection) return

    const spell = collection.get(itemId)
    if (!spell) return

    collection.entry.cast(spell, { slot: slotId, level: slotLevel })
}

async function onToggleSummary(event, sheet) {
    const item = event.currentTarget.closest('.item')
    await sheet.itemRenderer.toggleSummary(item)
}

async function onItemToChat(event, actor) {
    const itemId = $(event.currentTarget).closest('.item').attr('data-item-id')
    const item = actor.items.get(itemId)
    if (!item || (item.isOfType('physical') && !item.isIdentified)) return
    await item.toMessage(event)
}

function onSpellcastingBtnToggle(event, html, sheet) {
    event.preventDefault()

    const tab = getSpellcastingTab(html)

    if (tab.hasClass('active')) {
        tab.toggleClass('toggled')
        tab.scrollTop(0)
        setProperty(sheet, `modules.${MODULE_ID}.toggled`, tab.hasClass('toggled'))
    }
}

function getSpellcastingNav(html) {
    return html.find('nav.sheet-navigation .item[data-tab=spellcasting]')
}

function getSpellcastingTab(html) {
    return html.find('section.sheet-body .sheet-content > .tab[data-tab=spellcasting]')
}

function getSpellcastingOriginalSection(html) {
    return getSpellcastingTab(html).find('.directory-list.spellcastingEntry-list')
}

function getSpellcastingSummarySection(html) {
    return getSpellcastingTab(html).find('.directory-list.summary')
}
