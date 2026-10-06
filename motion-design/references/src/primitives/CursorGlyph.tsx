/** The hotspot is always (0, 0). Keep the pointer rigid during contact. */
export function CursorGlyph({ color = "#20252d" }: { color?: string }) {
  return (
    <g aria-hidden="true" style={{ filter: "drop-shadow(0px 1px 1px #10182838)" }}>
      <path
        d="M0 0 0 21.7 5.5 17 10 27 14 25.2 9.6 15.5 17.2 15.5Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </g>
  );
}
