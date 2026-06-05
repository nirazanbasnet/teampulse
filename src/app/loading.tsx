// Global route-transition loader (shown while a server component streams in).
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-tertiary">
      <div className="flex flex-col items-center gap-3">
        <i className="ti ti-loader-2 text-[28px] text-primary animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading…</span>
        <span className="sr-only" role="status">Loading</span>
      </div>
    </div>
  )
}
