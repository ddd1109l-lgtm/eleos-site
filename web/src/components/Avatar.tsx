import Image from "next/image";

// Dr. Fawn, the app's guide. While reading aloud, sound bars bounce beside him.
export default function Avatar({ size = 72, talking = false, className = "" }: { size?: number; talking?: boolean; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/avatar/head.jpg"
        alt=""
        width={size * 2}
        height={size * 2}
        className={`size-full rounded-full border-[3px] border-ink bg-sky-soft object-cover ${talking ? "reading-ring" : ""}`}
        priority
      />
      {talking && (
        <span className="absolute -right-1 bottom-1 flex h-5 items-end gap-[3px] rounded-full border-2 border-ink bg-sun px-1.5 py-1" aria-hidden>
          {[0, 120, 240].map((d) => (
            <span key={d} className="talk-bar h-full w-[3px] rounded-full bg-ink" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
      )}
    </span>
  );
}
