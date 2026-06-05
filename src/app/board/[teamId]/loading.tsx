// Board loader — shown while the board's data is fetched server-side.
export default function BoardLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <i className="ti ti-loader-2 text-[28px] text-primary animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading your board…</span>
        <span className="sr-only" role="status">Loading board</span>
      </div>
    </div>
  )
}
