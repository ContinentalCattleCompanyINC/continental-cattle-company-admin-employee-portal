export default function SectionHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h1 className="font-bebas text-3xl text-foreground tracking-wide">{title}</h1>
        {badge && (
          <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      <div className="h-px bg-gradient-to-r from-primary/40 to-transparent mt-3" />
    </div>
  );
}