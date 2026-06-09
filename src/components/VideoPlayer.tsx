type VideoMeta =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo";   embedUrl: string }
  | { kind: "file";    src: string }
  | { kind: "link";    href: string };

function parse(url: string): VideoMeta {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (yt) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${yt[1]}` };

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };

  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes("blob.vercel-storage.com")) {
    return { kind: "file", src: url };
  }

  return { kind: "link", href: url };
}

export default function VideoPlayer({ url, label = "Watch" }: { url: string; label?: string }) {
  if (!url) return null;
  const meta = parse(url);

  if (meta.kind === "youtube" || meta.kind === "vimeo") {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={meta.embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (meta.kind === "file") {
    return (
      <video
        src={meta.src}
        controls
        playsInline
        className="w-full rounded-lg bg-black"
        style={{ maxHeight: "360px" }}
      />
    );
  }

  return (
    <a
      href={meta.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-400 hover:text-blue-300 transition"
    >
      ▶ {label}
    </a>
  );
}
