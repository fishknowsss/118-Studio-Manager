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

export function SquidMark({
  className = '',
  variant = 'mint',
}: {
  className?: string
  variant?: SquidVariant
}) {
  return (
    <span className={`squid-mark squid-mark--${variant} ${className}`.trim()} aria-hidden="true">
      <svg className="squid-mark-svg" viewBox="0 0 42 46" focusable="false">
        <SquidShape />
      </svg>
    </span>
  )
}

export function SquidMarkSvg({
  variant = 'mint',
  x,
  y,
}: {
  variant?: SquidVariant
  x: number
  y: number
}) {
  return (
    <g className={`graph-squid-mark squid-mark--${variant}`} transform={`translate(${x} ${y})`} aria-hidden="true">
      <SquidShape />
    </g>
  )
}

function SquidShape() {
  return (
    <>
      <path
        className="graph-squid-body"
        d="M21 6.4 C29.2 6.7 36.2 15.2 37 25.5 C37.4 30.9 34.3 34.5 30 32.1 C30.8 37.7 28 41.4 24.9 36.9 C23.8 42.4 21.6 42.8 20.8 37.1 C19.8 42.8 17.6 42.4 16.5 36.9 C13.4 41.4 10.6 37.7 11.4 32.1 C7.1 34.5 3.8 30.9 4.2 25.5 C5 15.2 12.8 6.7 21 6.4 Z"
      />
      <path
        className="graph-squid-gloss"
        d="M24.4 10.1 C29.1 11.8 32.4 17 33.2 23"
      />
      <path
        className="graph-squid-eye-bridge"
        d="M11.3 22.7 C11.3 17.1 15.1 14.1 20.9 17.3 C26.8 14.1 30.7 17.1 30.7 22.7 C30.7 28 27.5 31.2 22 29 C21.3 28.7 20.7 28.7 20 29 C14.5 31.2 11.3 28 11.3 22.7 Z"
      />
      <ellipse className="graph-squid-eye" cx={17.2} cy={22.3} rx={5.4} ry={6.1} />
      <ellipse className="graph-squid-eye" cx={24.8} cy={22.3} rx={5.4} ry={6.1} />
      <circle className="graph-squid-pupil" cx={17.2} cy={22.3} r={2.9} />
      <circle className="graph-squid-pupil" cx={24.8} cy={22.3} r={2.9} />
      <circle className="graph-squid-catchlight" cx={16.2} cy={20.5} r={1.1} />
      <circle className="graph-squid-catchlight" cx={23.8} cy={20.5} r={1.1} />
    </>
  )
}
