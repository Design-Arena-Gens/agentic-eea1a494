export type VideoRecord = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  fileName: string;
  fileUrl: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  storagePath: string;
  metadataPath: string;
  metadataUrl?: string;
};

export type UpdateVideoPayload = Partial<
  Pick<VideoRecord, "title" | "description" | "tags">
>;

export type PersistedVideoRecord = Omit<VideoRecord, "metadataUrl">;
