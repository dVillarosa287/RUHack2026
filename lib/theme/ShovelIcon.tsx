/** The delete tool. A plain line drawing that takes the surrounding text color. */
export function ShovelIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Shovel" role="img">
      {/* Drawn pointing straight down, then turned 45 degrees: grip, handle, blade. */}
      <g transform="rotate(45 12 12)">
        <path d="M9 2.5 H15" />
        <path d="M12 2.5 V11" />
        <path d="M8 11 H16 V15 C16 18.5 12 21.5 12 21.5 C12 21.5 8 18.5 8 15 Z" />
      </g>
    </svg>
  );
}
