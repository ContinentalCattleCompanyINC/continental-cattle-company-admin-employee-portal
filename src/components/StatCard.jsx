export default function StatCard({ title, value, sub, trend, color = 'primary', icon: Icon }) {
  const colors = {
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-success/20 bg-success/5',
    danger: 'border-danger/20 bg-danger/5',
    warning: 'border-warning/20 bg-warning/5',
  };
  const textColors = {
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };

  return (
    <div className={`rounded-lg border ${colors[color]} p-4 card-glow`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{title}</span>
        {Icon && <Icon className={`w-4 h-4 ${textColors[color]}`} />}
      </div>
      <div className={`text-2xl font-bebas ${textColors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {trend && (
        <div className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-success' : 'text-danger'}`}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}