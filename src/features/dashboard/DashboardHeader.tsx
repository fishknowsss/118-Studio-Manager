import type { DashboardHeaderModel } from '../../legacy/selectors'

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
      <div className="dash-quote-block">
        <div className="dash-quote-text">"{model.quoteText}"</div>
        <div className="dash-quote-src">— {model.quoteSource}</div>
        <div className="dash-motivation">{model.motivation}</div>
      </div>
    </div>
  )
}
