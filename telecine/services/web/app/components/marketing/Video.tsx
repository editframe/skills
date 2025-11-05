export function Video({
  controls = true,
  url,
}: {
  controls: boolean;
  url: string;
}) {
  return (
    <video
      height="auto"
      style={{ aspectRatio: "16 / 9", maxWidth: "100%" }}
      src={url}
      controls={controls}
    />
  );
}
