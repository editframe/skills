/** The hotspot is always (0, 0). Keep the pointer rigid during contact. */
export function CursorGlyph({
  color = "#20252d",
  kind = "arrow",
}: {
  color?: string;
  kind?: "arrow" | "grab";
}) {
  return (
    <g aria-hidden="true" style={{ filter: "drop-shadow(0px 1px 1px #10182838)" }}>
      {kind === "arrow" ? (
        <path
          d="M0 0 0 21.7 5.5 17 10 27 14 25.2 9.6 15.5 17.2 15.5Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M-8 1V-5Q-8-8-5-8Q-2-8-2-5V-7Q-2-10 1-10Q4-10 4-7V-5Q4-8 7-8Q10-8 10-5V-2Q10-5 13-4Q15-4 15-1V6Q15 11 11 15L10 19H-3L-5 14Q-8 11-11 6L-14 2Q-16-1-13-3Q-11-4-8 1Z"
          fill="#fff"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}
