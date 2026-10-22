import { getPersonGenderTone } from '../../legacy/utils'

export function PersonGenderGlyph({ gender }: { gender?: string | null }) {
  const tone = getPersonGenderTone(gender)
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      {tone === 'male' ? <><circle cx="8" cy="12" r="4.5" /><path d="m11.5 8.5 5-5m-4.5 0h4.5V8" /></>
        : tone === 'female' ? <><circle cx="10" cy="7" r="4.5" /><path d="M10 11.5V18m-3-3h6" /></>
          : <><circle cx="10" cy="6" r="3" /><path d="M5.5 17v-2.5a4.5 4.5 0 0 1 9 0V17" /></>}
    </svg>
  )
}
