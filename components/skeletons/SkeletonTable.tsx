export default function SkeletonTable({ rows = 5, withSecondary = true }: { rows?: number; withSecondary?: boolean }) {
  return (
    <div className="skeleton-table-wrap" style={{ display: "block" }}>
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table-row" aria-hidden="true">
            <div className="skeleton skeleton-cell skeleton-cell-flex" />
            {withSecondary ? <div className="skeleton skeleton-cell skeleton-cell-w24" /> : null}
            <div className="skeleton skeleton-cell skeleton-cell-w20" />
          </div>
        ))}
      </div>
    </div>
  );
}
