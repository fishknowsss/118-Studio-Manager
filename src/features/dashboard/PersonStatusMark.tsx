export function PersonStatusMark({
  kind,
}: {
  kind: 'present' | 'leave'
}) {
  if (kind === 'leave') {
    return (
      <span className="person-status-mark person-status-mark--leave" title="请假" aria-label="请假">
        请假
      </span>
    )
  }

  return (
    <span className="person-status-mark person-status-mark--present" title="在岗" aria-label="在岗">
      <svg className="person-status-mark-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 17H5C3.895 17 3 16.105 3 15V7C3 5.895 3.895 5 5 5H19C20.105 5 21 5.895 21 7V15C21 16.105 20.105 17 19 17H18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 20L12 15L16 20H8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
