export function Audio({ controls, url }: { controls: boolean; url: string }) {
  return (
    <audio controls={controls}>
      <source src={url} type="audio/mpeg" />
      Your browser does not support the audio tag.
    </audio>
  );
}
