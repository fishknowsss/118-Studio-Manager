import type { DashboardHeaderModel } from '../../legacy/selectors'
import { QuoteBlock } from './QuoteBlock'

export function DashboardHeader({
  model,
}: {
  model: DashboardHeaderModel
}) {
  return (
    <div className="dash-header">
      <div className="dash-date-block">
        <div className="dash-date-big">{model.dateText}</div>
        <div className="dash-date-weekday">{model.weekdayText}</div>
      </div>
      <QuoteBlock />
    </div>
  )
}
