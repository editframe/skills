export default function Logo() {
  return (
    <svg
      viewBox="0 0 512 512"
      height="36"
      width="36"
      style={{ margin: "0 auto", display: "block" }}
    >
      <path
        d="M144 48v272a48 48 0 0048 48h272"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M368 304V192a48
               48 0 00-48-48H208M368 368v96M144 144H48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </svg>
  );
}
