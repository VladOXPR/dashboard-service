export default function PerformanceSkeletons() {
  return (
    <div className="performance-skeletons" style={{ display: "block" }}>
      <div className="skeleton-card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-amount-row" />
        <div className="skeleton skeleton-subtitle" />
        <div className="skeleton skeleton-chart" />
      </div>
      <div className="skeleton-stats-row">
        <div className="skeleton-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-amount" />
        </div>
        <div className="skeleton-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-amount" />
        </div>
      </div>
    </div>
  );
}
