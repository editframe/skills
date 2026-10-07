import { Solo, SUCCESS } from "../src/primitives";

export const duration = 2.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <svg
          width={200}
          height={200}
          viewBox="0 0 48 48"
          style={{ animation: "check-pop 180ms 320ms cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <circle cx="24" cy="24" r="20" fill={SUCCESS} />
          <path
            d="M15 24.5 l7 7 l12 -14"
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Solo>
  );
}
