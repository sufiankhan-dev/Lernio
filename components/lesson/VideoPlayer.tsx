import { Icon } from "@/components/ui/Icon";
import { getVideoEmbed } from "@/lib/video";

type VideoPlayerProps = {
  title: string;
  videoUrl: string | null;
  startSeconds: number;
};

/**
 * AGENTS.md §7 keeps playback on the site through the provider's own player, so
 * this is a plain embed iframe and never a custom player or a facade domain.
 * `getVideoEmbed` allowlists the provider host and returns `null` for anything
 * it does not recognise, which is why an unsupported URL degrades to a
 * placeholder instead of loading an arbitrary third party.
 */
export function VideoPlayer({ title, videoUrl, startSeconds }: VideoPlayerProps) {
  const embed = getVideoEmbed(videoUrl, startSeconds);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-neutral-900 shadow-sm">
      {embed ? (
        <iframe
          src={embed.src}
          title={`${title} — video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <Icon name="play-square" size={40} variant="filled" className="text-neutral-600" />
          <p className="text-body text-neutral-400">
            This lesson&rsquo;s video is not available for playback.
          </p>
        </div>
      )}
    </div>
  );
}