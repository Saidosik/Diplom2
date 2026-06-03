// components/ui/VideoBlockClient.tsx
'use client';

export function VideoBlockClient({ url, title }: { url: string; title?: string }) {
  const embedUrl = url.includes('youtube.com') ? url.replace('watch?v=', 'embed/') : url;
  return (
    <div className="aspect-video">
      <iframe src={embedUrl} title={title || 'Video'} allowFullScreen className="w-full h-full rounded-lg" />
    </div>
  );
}