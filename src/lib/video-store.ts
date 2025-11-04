import { del, list, put } from "@vercel/blob";
import type {
  PersistedVideoRecord,
  UpdateVideoPayload,
  VideoRecord,
} from "./types";

const VIDEO_FILE_PREFIX = "videos/files/";
const VIDEO_METADATA_PREFIX = "videos/meta/";

const getBlobAuth = () =>
  process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};

const sanitizeFileName = (fileName: string) =>
  fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-]/g, "");

const ensureBlobToken = () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required when running locally. Generate one with `npx vercel blob token`."
    );
  }
};

const parseTags = (tags: unknown): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => `${tag}`.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 20);
  }
  return `${tags}`
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
};

type CreateVideoOptions = {
  file: File;
  title?: string;
  description?: string;
  tags?: string[] | string;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch blob json (${response.status})`);
  }
  return (await response.json()) as T;
};

const getMetadataBlobForId = async (id: string) => {
  ensureBlobToken();
  const metadataPath = `${VIDEO_METADATA_PREFIX}${id}.json`;
  const { blobs } = await list({
    prefix: metadataPath,
    ...getBlobAuth(),
  });
  const metadataBlob = blobs.at(0);
  if (!metadataBlob) {
    throw new Error("Video not found");
  }
  const record = await fetchJson<PersistedVideoRecord>(metadataBlob.url);
  return {
    record,
    metadataBlob,
  };
};

export const createVideoRecord = async ({
  file,
  title,
  description,
  tags,
}: CreateVideoOptions): Promise<VideoRecord> => {
  ensureBlobToken();
  if (!file || file.size === 0) {
    throw new Error("A non-empty video file is required.");
  }

  const id = crypto.randomUUID();
  const cleanedName = sanitizeFileName(file.name) || `${id}.mp4`;
  const storagePath = `${VIDEO_FILE_PREFIX}${id}-${cleanedName}`;
  const now = new Date().toISOString();
  const normalizedTags = parseTags(tags);

  const fileBlob = await put(storagePath, file, {
    access: "public",
    contentType: file.type || "video/mp4",
    ...getBlobAuth(),
  });

  const persistedRecord: PersistedVideoRecord = {
    id,
    title: title?.trim() || file.name,
    description: description?.trim() || "",
    tags: normalizedTags,
    fileName: file.name,
    fileUrl: fileBlob.url,
    contentType: file.type || "video/mp4",
    size: file.size,
    createdAt: now,
    updatedAt: now,
    storagePath,
    metadataPath: `${VIDEO_METADATA_PREFIX}${id}.json`,
  };

  const metadataBlob = await put(
    persistedRecord.metadataPath,
    JSON.stringify(persistedRecord),
    {
      access: "public",
      contentType: "application/json",
      ...getBlobAuth(),
    }
  );

  return {
    ...persistedRecord,
    metadataUrl: metadataBlob.url,
  };
};

export const listVideoRecords = async (): Promise<VideoRecord[]> => {
  ensureBlobToken();
  const { blobs } = await list({
    prefix: VIDEO_METADATA_PREFIX,
    ...getBlobAuth(),
  });

  const records = await Promise.all(
    blobs.map(async (blob) => {
      const metadata = await fetchJson<PersistedVideoRecord>(blob.url);
      return {
        ...metadata,
        metadataUrl: blob.url,
      } satisfies VideoRecord;
    })
  );

  return records.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

export const updateVideoRecord = async (
  id: string,
  payload: UpdateVideoPayload
): Promise<VideoRecord> => {
  const { record, metadataBlob } = await getMetadataBlobForId(id);
  const normalizedTags = payload.tags ? parseTags(payload.tags) : record.tags;

  const updatedRecord: PersistedVideoRecord = {
    ...record,
    title: payload.title?.trim() || record.title,
    description: payload.description?.trim() ?? record.description,
    tags: normalizedTags,
    updatedAt: new Date().toISOString(),
  };

  await put(
    updatedRecord.metadataPath,
    JSON.stringify(updatedRecord),
    {
      access: "public",
      contentType: "application/json",
      ...getBlobAuth(),
    }
  );

  return {
    ...updatedRecord,
    metadataUrl: metadataBlob.url,
  };
};

export const deleteVideoRecord = async (id: string): Promise<void> => {
  const { record, metadataBlob } = await getMetadataBlobForId(id);
  await del([record.fileUrl, metadataBlob.url], getBlobAuth());
};
