import { PageTitle, Card, Button, EmptyState, ErrorState } from '../components/ui'
import { useWeeklyReviews, useGenerateWeeklyReview, weekStart } from '../hooks/useWeeklyReview'
import { printReview } from '../lib/exportPdf'

const fmtWeek = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function Review() {
  const { data: reviews = [], isLoading, isError, refetch } = useWeeklyReviews()
  const generate = useGenerateWeeklyReview()

  const thisWeekDone = reviews.some((r) => r.week_start === weekStart())

  return (
    <>
      <PageTitle
        title="Weekly review"
        subtitle="Your AI deep-dive: what happened, what it means, what to adjust."
        action={
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? 'Analyzing…' : thisWeekDone ? 'Regenerate this week' : 'Generate this week'}
          </Button>
        }
      />

      {generate.isError && (
        <p className="mb-4 text-sm text-danger">{String(generate.error.message || generate.error)}</p>
      )}

      {isError ? (
        <ErrorState title="Couldn’t load your reviews" onRetry={refetch} />
      ) : isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="❧"
          title="No reviews yet"
          hint="Generate your first weekly deep-dive once you've logged a few days."
          action={
            <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="mt-2">
              {generate.isPending ? 'Analyzing…' : 'Generate now'}
            </Button>
          }
        />
      ) : (
        <div className="max-w-2xl space-y-6">
          {reviews.map((r, idx) => (
            <ReviewCard key={r.id} review={r} latest={idx === 0} />
          ))}
        </div>
      )}
    </>
  )
}

function ReviewCard({ review, latest }) {
  const adjustments = review.score_snapshot?.adjustments || []
  const score = review.score_snapshot?.score
  return (
    <Card className={latest ? 'border-accent/30' : ''}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-lg">Week of {fmtWeek(review.week_start)}</p>
        <div className="flex items-center gap-2">
          {typeof score === 'number' && (
            <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-xs text-muted">
              Life Score {score}
            </span>
          )}
          <button
            onClick={() => printReview(review)}
            title="Export PDF"
            className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface2 hover:text-fg"
          >
            ⬇ PDF
          </button>
        </div>
      </div>

      {review.summary && <p className="text-sm leading-relaxed text-fg">{review.summary}</p>}

      {review.ai_insights && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-faint">Pattern</p>
          <p className="text-sm leading-relaxed text-muted">{review.ai_insights}</p>
        </div>
      )}

      {adjustments.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-faint">Adjust next week</p>
          <ul className="space-y-2">
            {adjustments.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-accent">→</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
