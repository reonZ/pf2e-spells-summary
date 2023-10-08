import { MODULE_ID, getSetting, localeCompare } from './module'

export async function getData(actor) {
    const focusPool = actor.system.resources.focus ?? { value: 0, max: 0 }
    const stavesActive = game.modules.get('pf2e-staves')?.active
    const spells = []
    const focuses = []

    let hasFocusCantrips = false

    await Promise.all(
        actor.spellcasting.regular.map(async entry => {
            const entryId = entry.id
            const entryDc = entry.statistic.dc.value
            const entryName = entry.name
            const data = await entry.getSheetData()
            const isFocus = data.isFocusPool
            const isCharge = entry.system?.prepared?.value === 'charge'
            const isStaff = getProperty(entry, 'flags.pf2e-staves.staveID') !== undefined
            const charges = { value: getProperty(entry, 'flags.pf2e-staves.charges') ?? 0 }

            for (const slot of data.levels) {
                if (!slot.active.length || slot.uses?.max === 0) continue

                const slotSpells = []
                const isCantrip = slot.isCantrip
                const actives = slot.active.filter(x => x && x.uses?.max !== 0)
                const isBroken = !isCantrip && isCharge && !stavesActive

                for (let slotId = 0; slotId < actives.length; slotId++) {
                    const { spell, expended, virtual, uses, castLevel } = actives[slotId]

                    slotSpells.push({
                        name: spell.name,
                        img: spell.img,
                        range: spell.system.range.value || '-',
                        castLevel: castLevel ?? spell.level,
                        slotId,
                        entryId,
                        entryDc,
                        entryName,
                        itemId: spell.id,
                        inputId: data.isInnate ? spell.id : data.id,
                        inputPath: isCharge
                            ? 'flags.pf2e-staves.charges'
                            : data.isInnate
                            ? 'system.location.uses.value'
                            : `system.slots.slot${slot.level}.value`,
                        isCharge,
                        isActiveCharge: isCharge && stavesActive,
                        isBroken,
                        isVirtual: virtual,
                        isInnate: data.isInnate,
                        isCantrip: isCantrip,
                        isFocus,
                        isPrepared: data.isPrepared,
                        isSpontaneous: data.isSpontaneous || data.isFlexible,
                        slotLevel: slot.level,
                        uses: uses ?? (isCharge ? charges : slot.uses),
                        expended: expended ?? (isFocus && !isCantrip ? focusPool.value <= 0 : false),
                        action: spell.system.time.value,
                        type: isCharge
                            ? isStaff
                                ? `${MODULE_ID}.staff`
                                : `${MODULE_ID}.charges`
                            : data.isInnate
                            ? 'PF2E.PreparationTypeInnate'
                            : data.isSpontaneous
                            ? 'PF2E.PreparationTypeSpontaneous'
                            : data.isFlexible
                            ? 'PF2E.SpellFlexibleLabel'
                            : isFocus
                            ? 'PF2E.SpellFocusLabel'
                            : 'PF2E.SpellPreparedLabel',
                        order: isCharge ? 0 : data.isPrepared ? 1 : isFocus ? 2 : data.isInnate ? 3 : data.isSpontaneous ? 4 : 5,
                        noHover: data.isPrepared || isCantrip || isBroken || isFocus,
                    })
                }

                if (slotSpells.length) {
                    if (isFocus) {
                        if (isCantrip) hasFocusCantrips = true
                        else {
                            focuses.push(...slotSpells)
                            continue
                        }
                    }

                    spells[slot.level] ??= []
                    spells[slot.level].push(...slotSpells)
                }
            }
        })
    )

    if (spells.length) {
        const sort = getSetting('order')
            ? (a, b) => (a.order === b.order ? localeCompare(a.name, b.name) : a.order - b.order)
            : (a, b) => localeCompare(a.name, b.name)
        spells.forEach(entry => entry.sort(sort))
    }

    if (focuses.length) {
        focuses.sort((a, b) => localeCompare(a.name, b.name))
        spells[12] = focuses
        hasFocusCantrips = false
    }

    const ritualData = await actor.spellcasting.ritual?.getSheetData()
    const rituals = ritualData?.levels.flatMap((slot, slotId) =>
        slot.active
            .map(({ spell }) => ({
                name: spell.name,
                img: spell.img,
                slotId,
                itemId: spell.id,
                level: spell.level,
                time: spell.system.time.value,
            }))
            .filter(Boolean)
    )

    return {
        spells,
        rituals,
        focusPool,
        stavesActive,
        hasFocusCantrips,
        isOwner: actor.isOwner,
    }
}
