declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e
declare const CONFIG: ConfigPF2e

interface SpellcastingLevelRitual extends SpellcastingLevelSpellCore {
    level: number
    time: string
    secondary: string
}

interface SpellcastingLevelSpellCore {
    id: string
    name: string
    img: string
    entryId: string
    slotId: number
    entryName: string
}

interface SpellcastingLevelEntry {
    level: number
    isCantrip: boolean
    spells: SpellcastingLevelSpell[]
}

interface SpellcastingLevelSpell extends SpellcastingLevelSpellCore {
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
    order: number
}
