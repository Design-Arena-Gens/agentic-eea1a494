import { NextResponse } from "next/server";
import { createVideoRecord, listVideoRecords } from "@/lib/video-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const videos = await listVideoRecords();
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Failed to list videos", error);
    return NextResponse.json(
      { error: "Unable to list uploaded videos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A valid video file must be provided." },
        { status: 400 }
      );
    }

    const video = await createVideoRecord({
      file,
      title: formData.get("title")?.toString(),
      description: formData.get("description")?.toString(),
      tags: formData.get("tags")?.toString(),
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Failed to upload video", error);
    return NextResponse.json(
      { error: "Unable to upload the video." },
      { status: 500 }
    );
  }
}
