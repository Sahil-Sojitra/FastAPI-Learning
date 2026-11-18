import type { SVGProps } from "react";

const paths = {
  board: "M3 5h18v14H3z M9 5v14m6-14v14",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  sparkle: "M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  logout: "M10 17l5-5-5-5m5 5H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7",
  chevron: "m6 9 6 6 6-6",
  close: "m6 6 12 12M18 6 6 18",
  trash: "M3 6h18m-2 0-1 14H6L5 6m4 0V3h6v3m-5 4v6m4-6v6",
  check: "m5 12 4 4L19 6",
  circle: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  progress: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-9v9h9",
  refresh:
    "M20 7v5h-5M4 17v-5h5m-4.5-3a8 8 0 0 1 13.2-4L20 8M4 16l2.3 3A8 8 0 0 0 19.5 15",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  eyeOff:
    "m3 3 18 18M10 6a10 10 0 0 1 2 0c6.5 0 10 6 10 6a15 15 0 0 1-3 3m-3 2a10 10 0 0 1-4 1C5.5 18 2 12 2 12a15 15 0 0 1 4-4",
  lock: "M6 10h12v11H6z M8 10V7a4 4 0 1 1 8 0v3m-4 4v3",
} as const;

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
