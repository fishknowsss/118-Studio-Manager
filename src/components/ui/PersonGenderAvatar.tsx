import { getPersonGenderSymbol, getPersonGenderTone } from '../../legacy/utils'

export function PersonGenderAvatar({
  className,
  gender,
  inactive = false,
}: {
  className?: string
  gender?: string | null
  inactive?: boolean
}) {
  const tone = getPersonGenderTone(gender)

  return (
    <span
      aria-hidden="true"
      className={[
        'person-gender-avatar',
        tone,
        inactive ? 'inactive' : '',
        className || '',
      ].filter(Boolean).join(' ')}
    >
      {getPersonGenderSymbol(gender)}
    </span>
  )
}