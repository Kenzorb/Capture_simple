export default function DashboardLoading() {
  return (
    <div role="status" className="max-w-2xl">
      <span className="sr-only">Loading your library</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="h-8 w-44 rounded-lg bg-[#dce6dd]" />
        <div className="space-y-4 rounded-xl border border-[#dde5dd] bg-white p-5">
          <div className="h-4 w-32 rounded bg-[#e4ece5]" />
          <div className="h-10 w-full rounded-lg bg-[#edf2ec]" />
        </div>
      </div>
    </div>
  );
}
