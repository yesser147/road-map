export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" aria-hidden>
        <path d="M9 26 14 6h4l5 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M16 10v3M16 17v3" stroke="#f2b134" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
