"use client";

import { type FormEvent, useMemo, useState } from "react";
import type { VideoRecord } from "@/lib/types";

type UploadFormState = {
  title: string;
  description: string;
  tags: string;
};

const toHumanSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
};

const formatDate = (isoString: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));

const defaultForm: UploadFormState = {
  title: "",
  description: "",
  tags: "",
};

const toDraft = (video: VideoRecord): UploadFormState => ({
  title: video.title,
  description: video.description,
  tags: video.tags.join(", "),
});

type Props = {
  initialVideos: VideoRecord[];
};

export const VideoManager = ({ initialVideos }: Props) => {
  const [videos, setVideos] = useState<VideoRecord[]>(initialVideos);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<UploadFormState>(defaultForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, UploadFormState>>(
    () =>
      Object.fromEntries(initialVideos.map((video) => [video.id, toDraft(video)]))
  );
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const totalSize = useMemo(
    () => videos.reduce((sum, video) => sum + video.size, 0),
    [videos]
  );

  const filteredVideos = useMemo(() => {
    if (!searchTerm) return videos;
    const term = searchTerm.toLowerCase();
    return videos.filter((video) => {
      return (
        video.title.toLowerCase().includes(term) ||
        video.description.toLowerCase().includes(term) ||
        video.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [videos, searchTerm]);

  const updateDraft = (id: string, patch: Partial<UploadFormState>) => {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a video to upload first.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const data = new FormData();
      data.append("file", selectedFile);
      if (form.title) data.append("title", form.title);
      if (form.description) data.append("description", form.description);
      if (form.tags) data.append("tags", form.tags);

      const response = await fetch("/api/videos", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Upload failed");
      }

      const created: VideoRecord = await response.json();
      setVideos((prev) => [created, ...prev]);
      setEditDrafts((prev) => ({ ...prev, [created.id]: toDraft(created) }));
      setForm(defaultForm);
      setSelectedFile(null);
      const fileInput = document.getElementById(
        "video-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unexpected upload error"
      );
    } finally {
      setUploading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/videos", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Refresh failed");
      }
      const latest: VideoRecord[] = await response.json();
      setVideos(latest);
      setEditDrafts(
        Object.fromEntries(latest.map((video) => [video.id, toDraft(video)]))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const triggerDelete = async (id: string) => {
    setPendingDelete(id);
    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Delete failed");
      }
      setVideos((prev) => prev.filter((video) => video.id !== id));
      setEditDrafts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete the selected video."
      );
    } finally {
      setPendingDelete(null);
    }
  };

  const saveEdits = async (id: string) => {
    const draft = editDrafts[id];
    if (!draft) return;

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          tags: draft.tags,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Update failed");
      }

      const updated: VideoRecord = await response.json();
      setVideos((prev) =>
        prev.map((video) => (video.id === id ? updated : video))
      );
      setEditDrafts((prev) => ({ ...prev, [id]: toDraft(updated) }));
      setEditingId(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to update the video metadata."
      );
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-16">
      <section className="rounded-3xl border border-neutral-200 bg-white/60 p-8 shadow-sm backdrop-blur-sm">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Video Library
          </h1>
          <p className="text-sm text-neutral-600">
            Upload new videos, update metadata, and manage your library in one
            place.
          </p>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-3 sm:items-start">
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-blue-50 to-indigo-100 p-5">
            <p className="text-sm uppercase tracking-wide text-indigo-600">
              Total Videos
            </p>
            <p className="mt-2 text-3xl font-semibold text-indigo-900">
              {videos.length}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <p className="text-sm uppercase tracking-wide text-slate-600">
              Storage Used
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {toHumanSize(totalSize)}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="group flex h-full items-center justify-center rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:shadow"
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh Library"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-neutral-900">
          Upload a new video
        </h2>
        <form
          className="mt-6 grid gap-5 md:grid-cols-2"
          onSubmit={handleUpload}
        >
          <label className="md:col-span-2 flex flex-col gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 p-6 text-neutral-700 hover:border-neutral-400">
            <span className="text-sm font-medium text-neutral-800">
              Choose a video file
            </span>
            <input
              id="video-file-input"
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
              className="text-sm"
            />
            {selectedFile && (
              <span className="text-xs text-neutral-500">
                {selectedFile.name} · {toHumanSize(selectedFile.size)}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-800">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Example: Product launch teaser"
              className="rounded-xl border border-neutral-300 px-4 py-3 text-sm text-neutral-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-800">Tags</span>
            <input
              type="text"
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
              placeholder="marketing, launch, 2024"
              className="rounded-xl border border-neutral-300 px-4 py-3 text-sm text-neutral-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

  <label className="md:col-span-2 flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-800">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Add context for collaborators and viewers."
              rows={4}
              className="rounded-xl border border-neutral-300 px-4 py-3 text-sm text-neutral-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          {uploadError && (
            <p className="md:col-span-2 text-sm font-medium text-red-600">
              {uploadError}
            </p>
          )}

          <button
            type="submit"
            className="md:col-span-2 h-12 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload Video"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Manage uploads
            </h2>
            <p className="text-sm text-neutral-600">
              Filter, edit, and share your uploaded videos.
            </p>
          </div>
          <input
            type="search"
            placeholder="Search by title, tag, or description"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full md:w-80 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {filteredVideos.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-sm text-neutral-600">
            {videos.length === 0
              ? "No videos uploaded yet. Start by uploading your first video above."
              : "No matches found. Adjust your search query to see more videos."}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {filteredVideos.map((video) => {
              const draft = editDrafts[video.id] ?? toDraft(video);
              const isEditing = editingId === video.id;
              return (
                <article
                  key={video.id}
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                    <video
                      controls
                      className="h-full w-full object-cover"
                      src={video.fileUrl}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {video.contentType} · {toHumanSize(video.size)}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Updated {formatDate(video.updatedAt)}
                    </p>
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          updateDraft(video.id, { title: event.target.value })
                        }
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          updateDraft(video.id, {
                            description: event.target.value,
                          })
                        }
                        rows={3}
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <input
                        value={draft.tags}
                        onChange={(event) =>
                          updateDraft(video.id, { tags: event.target.value })
                        }
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-neutral-600">
                          {video.description}
                        </p>
                      )}
                      {video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {video.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdits(video.id)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(video.id);
                            setEditDrafts((prev) => ({
                              ...prev,
                              [video.id]: toDraft(video),
                            }));
                          }}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard
                              .writeText(video.fileUrl)
                              .catch(() =>
                                alert(
                                  "Copy to clipboard is not available in this browser."
                                )
                              );
                          }}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                          type="button"
                        >
                          Copy Share Link
                        </button>
                        <button
                          onClick={() => triggerDelete(video.id)}
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                          type="button"
                          disabled={pendingDelete === video.id}
                        >
                          {pendingDelete === video.id ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
