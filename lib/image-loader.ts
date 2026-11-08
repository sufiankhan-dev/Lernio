import type { ImageLoaderProps } from "next/image";

/**
 * Sanity CDN image loader.
 *
 * Production runs in Vercel Services mode, where the platform does not expose the
 * Next.js optimizer under `/_next/image`, so every optimized request 404s. Sanity's
 * CDN already resizes and negotiates a format, so `next/image` points straight at it
 * through this loader instead of the Next optimizer.
 *
 * Call sites bake `w` and `h` into the URL (square card crops, a 4:5 cover) with
 * `fit=crop`, so the existing height/width ratio is preserved while the requested
 * width replaces the baked one. Non-Sanity sources pass through untouched.
 */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.hostname !== "cdn.sanity.io") return src;

  const sourceWidth = Number(url.searchParams.get("w"));
  const sourceHeight = Number(url.searchParams.get("h"));
  const aspect = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : null;

  url.searchParams.set("w", String(width));
  if (aspect) {
    url.searchParams.set("h", String(Math.round(width * aspect)));
  } else {
    url.searchParams.delete("h");
  }
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");

  return url.toString();
}
