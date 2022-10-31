declare interface SpellcastingEntry {
    level: number
    isCantrip: boolean
    spells: SpellcastingLevelSpell[]
}

declare interface SpellcastingLevelSpellCore {
    id: string
    name: string
    img: string
    entryId: string
    slotId: number
    entryName: string
}

declare interface SpellcastingLevelRitual extends SpellcastingLevelSpellCore {
    level: number
    time: string
    secondary: number
}

declare interface SpellcastingLevelSpell extends SpellcastingLevelSpellCore {
    uses?: {
        value?: number | undefined
        max: number
    }
    icon: string
    isVirtual: boolean
    components: { focus: boolean; material: boolean; somatic: boolean; verbal: boolean }
    isPrepared: boolean
    isFlexible: boolean
    isInnate: boolean
    isSpontaneous: boolean
    isFocus: boolean
    dc: { value: number }
    check: { mod: number }
    parentUses?: {
        value?: number | undefined
        max: number
    }
    expended: boolean
}
