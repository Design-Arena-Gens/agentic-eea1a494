import { Suspense } from "react";
import { VideoManager } from "@/components/video-manager";
import { listVideoRecords } from "@/lib/video-store";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Home() {
  const videos = await listVideoRecords().catch(() => []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-100 px-6 py-12 text-neutral-900 md:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading video manager…</p>}>
          <VideoManager initialVideos={videos} />
        </Suspense>
      </div>
    </main>
  );
}
