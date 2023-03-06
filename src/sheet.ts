import { templatePath } from '@utils/foundry/path'
import { getSetting } from '@utils/foundry/settings'
import { MODULE_ID } from './main'

export async function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery, data: CharacterSheetData) {
    const actor = sheet.actor
    if (actor.pack || !actor.id || !game.actors.has(actor.id)) return

    const tab = getSpellcastingTab(html)

    if (getProperty(sheet, `modules.${MODULE_ID}.toggled`)) tab.addClass('toggled')

    addNavEvent(html, sheet)
    await addSummaryTab(html, data, sheet)

    if (tab.hasClass('toggled') && tab.hasClass('active')) {
        sheet._restoreScrollPositions(html)
    }
}

function addNavEvent(html: JQuery, sheet: CharacterSheetPF2e) {
    getSpellcastingNav(html).on('click', event => onSpellcastingBtnToggle(event, html, sheet))
}

async function addSummaryTab(html: JQuery, data: CharacterSheetData, sheet: CharacterSheetPF2e) {
    const tab = getSpellcastingTab(html)

    const template = await renderTemplate(templatePath('sheet.hbs'), {
        entries: getEntries(data),
        rituals: getRituals(data),
        focusPool: data.data.resources.focus,
        editable: data.editable,
    })

    tab.append(template)
    addSummaryEvents(html, sheet)
}

function onSpellcastingBtnToggle(event: JQuery.ClickEvent, html: JQuery, sheet: CharacterSheetPF2e) {
    event.preventDefault()

    const tab = getSpellcastingTab(html)

    if (tab.hasClass('active')) {
        tab.toggleClass('toggled')
        tab.scrollTop(0)
        setProperty(sheet, `modules.${MODULE_ID}.toggled`, tab.hasClass('toggled'))
    }
}

function getRituals(data: CharacterSheetData) {
    const rituals: SpellcastingLevelRitual[] = []

    data.spellcastingEntries.forEach(entry => {
        if (!entry.isRitual || !entry.hasCollection || !entry.levels.some(x => x.active.some(y => y !== null))) return

        const entryId = entry.id
        const entryName = entry.name

        entry.levels.forEach(slot => {
            if (!slot.active.length) return

            const activeSpells = slot.active.filter(active => active) as ActiveSpell[]

            rituals.push(
                ...activeSpells.flatMap((active, i) => ({
                    id: active.spell.id,
                    name: active.spell.name,
                    img: active.spell.img,
                    level: slot.level,
                    slotId: i,
                    entryId,
                    entryName,
                    time: active.spell.system.time.value,
                    secondary: active.spell.system.secondarycasters.value,
                }))
            )
        })
    })

    rituals.sort((a, b) => a.level - b.level)

    return rituals
}

function getEntries(data: CharacterSheetData) {
    const focusPool = data.data.resources.focus
    const entries: SpellcastingLevelEntry[] = []

    console.log(data.spellcastingEntries)

    data.spellcastingEntries.forEach(entry => {
        if (entry.isRitual || !entry.hasCollection || !entry.levels.some(x => x.active.some(y => y !== null))) return

        const check = entry.statistic.check
        const dc = entry.statistic.dc
        const isPrepared = !!entry.isPrepared
        const isFlexible = !!entry.isFlexible
        const isFocus = !!entry.isFocusPool
        const isSpontaneous = !!entry.isSpontaneous
        const isInnate = !!entry.isInnate
        const entryName = entry.name
        const entryId = entry.id
        const isCharge = entry.system.prepared.value === 'charge'
        const isStaff = getProperty(entry, 'flags.pf2e-staves.staveID') !== undefined
        const charges = { value: getProperty<number>(entry, 'flags.pf2e-staves.charges') ?? 0, max: 0 }

        entry.levels.forEach(slot => {
            if (!slot.active.length) return

            const activeSpells = slot.active.filter(active => active) as ActiveSpell[]

            entries[slot.level] ??= {
                level: slot.level,
                isCantrip: slot.isCantrip,
                spells: [],
            }

            entries[slot.level]!.spells.push(
                ...activeSpells.flatMap((active, i) => ({
                    id: active.spell.id,
                    name: active.spell.name,
                    img: active.spell.img,
                    uses: active.uses,
                    isVirtual: !!active.virtual,
                    icon: active.spell.system.time.value,
                    entryId,
                    entryName,
                    slotId: i,
                    range: active.spell.system.range.value,
                    isPrepared,
                    isFlexible,
                    isInnate,
                    isSpontaneous,
                    isFocus,
                    isCharge,
                    isStaff,
                    dc,
                    check,
                    parentUses: isCharge ? charges : slot.uses,
                    expended: slot.isCantrip
                        ? false
                        : isCharge
                        ? charges.value < slot.level
                        : isPrepared && !isFlexible
                        ? !!active.expended
                        : isFocus
                        ? focusPool.value <= 0
                        : isInnate && active.uses?.value != null
                        ? active.uses.value <= 0
                        : (isSpontaneous || isFlexible) && slot.uses?.value != null
                        ? slot.uses.value <= 0
                        : false,
                    order: isCharge ? 0 : isPrepared ? 1 : isFocus ? 2 : isInnate ? 3 : isSpontaneous ? 4 : 5,
                }))
            )
        })
    })

    const sort: (a: SpellcastingLevelSpell, b: SpellcastingLevelSpell) => number = getSetting('order')
        ? (a, b) => (a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order)
        : (a, b) => a.name.localeCompare(b.name)
    entries.forEach(entry => entry.spells.sort(sort))

    return entries
}

function addSummaryEvents(html: JQuery<HTMLElement>, sheet: CharacterSheetPF2e) {
    const summary = getSpellcastingSummarySection(html)

    const inputs = summary.find<HTMLInputElement>('.spell-range .uses .spell-slots-input input')
    inputs.on('change', event => onUsesInputChange(event, sheet))
    inputs.on('focus', onUsesInputFocus)
    inputs.on('blur', onUsesInputBlur)

    summary.find('.cast-spell').on('click', event => onCastSpell(event, sheet))
    summary.find('.item-toggle-prepare').on('click', event => onTogglePrepare(event, sheet))
    summary.find('.focus-pips').on('click contextmenu', event => onToggleFocusPool(event, sheet))
    summary.find('.spell-slots-increment-reset').on('click', event => onSlotsReset(event, sheet))
    summary.find('.item-image').on('click', event => onItemToChat(event, sheet))
    summary.find('.item-name > h4').on('click', event => onToggleSummary(event, sheet))
}

async function onToggleSummary(event: JQuery.ClickEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    const item = event.currentTarget.closest<HTMLElement>('.item')!
    await sheet.itemRenderer.toggleSummary(item)
}

async function onItemToChat(event: JQuery.ClickEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    const itemId = $(event.currentTarget).closest('.item').attr('data-item-id')
    const item = sheet.actor.items.get(itemId ?? '', { strict: true })
    if (!item || (item.isOfType('physical') && !item.isIdentified)) return
    await item.toMessage(event)
}

function onChargeReset(sheet: CharacterSheetPF2e, entryId: string) {
    const original = getSpellcastingOriginalSection(sheet.element)
    const entry = original.find(`.item-container.spellcasting-entry[data-item-id=${entryId}]`)
    const btn = entry.find('.spell-ability-data .statistic-values a.pf2e-staves-charge')
    btn[0]?.click()
}

function onSlotsReset(event: JQuery.ClickEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    event.preventDefault()

    const { itemId, level, staff } = $(event.currentTarget).data()
    if (!itemId) return

    if (staff) {
        onChargeReset(sheet, itemId)
        return
    }

    const item = sheet.actor.items.get(itemId)
    if (!item) return

    if (item.isOfType('spellcastingEntry')) {
        const { system } = item.toObject()
        if (!system.slots) return

        const slotLevel = (goesToEleven(level) ? `slot${level}` : 'slot0') as SlotKey
        system.slots[slotLevel].value = system.slots[slotLevel].max
        item.update({ system })
    } else if (item.isOfType('spell')) {
        const max = item.system.location.uses?.max
        if (!max) return
        item.update({ 'system.location.uses.value': max })
    }
}

function goesToEleven(value: number): value is ZeroToEleven {
    return value >= 0 && value <= 11
}

function onUsesInputChange(event: JQuery.ChangeEvent<any, any, HTMLInputElement>, sheet: CharacterSheetPF2e) {
    event.preventDefault()

    const { itemId, itemProperty } = event.currentTarget.dataset
    if (!itemId || !itemProperty) return

    const value = Math.max(event.currentTarget.valueAsNumber, 0)
    sheet.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, [itemProperty]: value }])
}

function onToggleFocusPool(event: JQuery.TriggeredEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    event.preventDefault()
    const change = event.type === 'click' ? 1 : -1
    const points = (sheet.actor.system.resources.focus?.value ?? 0) + change
    sheet.actor.update({ 'system.resources.focus.value': points })
}

function onTogglePrepare(event: JQuery.ClickEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    event.preventDefault()
    const { slotLevel, slotId, entryId, expendedState } = $(event.currentTarget).closest('.item').data()
    const collection = sheet.actor.spellcasting.collections.get(entryId)
    collection?.setSlotExpendedState(slotLevel ?? 0, slotId ?? 0, expendedState !== true)
}

function onCastSpell(event: JQuery.ClickEvent<any, any, HTMLElement>, sheet: CharacterSheetPF2e) {
    event.preventDefault()
    const { itemId, slotLevel, slotId, entryId } = $(event.currentTarget).closest('.item').data()

    const collection = sheet.actor.spellcasting.collections.get(entryId, { strict: true })
    if (!collection) return

    const spell = collection.get(itemId, { strict: true })
    if (!spell) return

    collection.entry.cast(spell, { slot: slotId, level: slotLevel })
}

function onUsesInputFocus(event: JQuery.FocusEvent<any, any, HTMLInputElement>) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.add('hover')
}

function onUsesInputBlur(event: JQuery.BlurEvent<any, any, HTMLInputElement>) {
    event.preventDefault()
    event.currentTarget.closest('.item')?.classList.remove('hover')
}

function getSpellcastingNav(html: JQuery) {
    return html.find('nav.sheet-navigation .item[data-tab=spellcasting]')
}

function getSpellcastingTab(html: JQuery) {
    return html.find('section.sheet-body .sheet-content > .tab[data-tab=spellcasting]')
}

function getSpellcastingOriginalSection(html: JQuery) {
    return getSpellcastingTab(html).find('.directory-list.spellcastingEntry-list')
}

function getSpellcastingSummarySection(html: JQuery) {
    return getSpellcastingTab(html).find('.directory-list.summary')
}
