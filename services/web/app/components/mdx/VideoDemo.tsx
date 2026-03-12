interface VideoDemoProps {
  src: string;
  poster?: string;
  caption?: string;
}

export function VideoDemo({ src, poster, caption }: VideoDemoProps) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          className="w-full"
          preload="metadata"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
