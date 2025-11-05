import { Link } from "@react-email/components";

export default function EmailButton({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <>
    <style>
      {`
        @media (prefers-color-scheme: dark) {
          .button {
            background-color: #fff;
            color: rgb(31 37 42 /60;
          }
        }
      `}
    </style>
    <Link style={button} href={href} target="" className="button">
      {label}
    </Link>
    </>
  );
}

const button = {
  backgroundColor: "rgb(31 37 42 /60)",
  borderRadius: "4px",
  color: "#fff",
  fontFamily: "'Open Sans', 'Helvetica Neue', Arial",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "210px",
  padding: "14px 7px",
};
