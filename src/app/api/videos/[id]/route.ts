import { NextRequest, NextResponse } from "next/server";
import {
  deleteVideoRecord,
  updateVideoRecord,
} from "@/lib/video-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const payload = await request.json();
    const { id } = await context.params;
    const updated = await updateVideoRecord(id, payload);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update video metadata", error);
    return NextResponse.json(
      { error: "Unable to update the video metadata." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteVideoRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete video", error);
    return NextResponse.json(
      { error: "Unable to delete the requested video." },
      { status: 500 }
    );
  }
}
