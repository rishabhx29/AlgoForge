/**
 * AlgoForge mark — Pattern Studio.
 *
 * Deliberately flat. The previous version used a purple→cyan gradient, a
 * Gaussian-blur glow, and an infinitely pulsing core: three named slop markers
 * on the single most visible element in the product.
 *
 * The plate/cube construction is kept (it reads as the "forge" of stacked
 * plates) but rendered in two flat tones from the Pattern Studio palette so the
 * mark sits correctly on the graphite ground.
 *
 * No animation. A logo is seen on every screen, hundreds of times a day —
 * by the frequency test it should be completely static.
 */
export function Logo({
  className = '',
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AlgoForge"
    >
      {/* Plate 1 — left, full amber */}
      <path
        d="M30 20 L50 30 L50 70 L30 80 L10 70 V30 L30 20 Z"
        fill="#f0997d"
      />
      {/* Plate 2 — upper right, amber at reduced weight */}
      <path
        d="M70 20 L90 30 V50 L70 60 L50 50 V30 L70 20 Z"
        fill="#f0997d"
        fillOpacity="0.55"
      />
      {/* Plate 3 — lower right, amber at lowest weight */}
      <path
        d="M70 60 L90 70 V90 L70 80 L50 90 V70 L70 60 Z"
        fill="#f0997d"
        fillOpacity="0.28"
      />

      {/* Plate edges — thin dark strokes separate the three plates */}
      <path
        d="M30 20 L50 30 L50 70 L30 80 L10 70 V30 L30 20 Z"
        stroke="#19191b"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M70 20 L90 30 V50 L70 60 L50 50 V30 L70 20 Z"
        stroke="#19191b"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M70 60 L90 70 V90 L70 80 L50 90 V70 L70 60 Z"
        stroke="#19191b"
        strokeWidth="2"
        fill="none"
      />

      {/* Seam lines where the plates meet — structural, not decorative */}
      <path d="M50 30 L50 70" stroke="#19191b" strokeWidth="2" />
      <path d="M50 50 L70 60" stroke="#19191b" strokeWidth="2" />
      <path d="M50 50 L30 40" stroke="#19191b" strokeWidth="2" />
    </svg>
  );
}
