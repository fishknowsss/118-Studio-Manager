export const SQUID_PERSON_NAME = '全舒怡'

export type SquidVariant = 'lavender' | 'mint'

export function hasSquidPersonName(name: string | undefined | null) {
  return Boolean(name?.includes(SQUID_PERSON_NAME))
}

export function hasSquidAssignee(names: Array<string | undefined | null>) {
  return names.some(hasSquidPersonName)
}

export function getSquidVariant(seed: string | undefined | null): SquidVariant {
  const source = seed || SQUID_PERSON_NAME
  const score = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return score % 2 === 0 ? 'mint' : 'lavender'
}
