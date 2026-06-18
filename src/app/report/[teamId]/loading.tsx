// Growth report loader.
export default function ReportLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <i className="ti ti-loader-2 text-[28px] text-primary animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Building your report…</span>
        <span className="sr-only" role="status">Loading report</span>
      </div>
    </div>
  )
}
