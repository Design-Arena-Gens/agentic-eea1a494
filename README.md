## Video Library Agent

A full-stack Next.js dashboard for uploading, managing, and sharing videos. Files are stored in [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob), making the app production-ready for deployment on Vercel.

### ✨ Features

- Drag-and-drop–friendly uploader with title, description, and tag metadata.
- Video preview player, size and format badges, and clipboard share links.
- Inline metadata editing with optimistic UI updates.
- Library search, usage metrics, and on-demand refresh.
- REST API (`/api/videos`) for integrating uploads into external workflows.

### 🧱 Tech Stack

- [Next.js 16 App Router](https://nextjs.org/docs/app)
- React 19 with Server + Client Components
- Tailwind CSS v4 (utility classes via `@tailwindcss/postcss`)
- [`@vercel/blob`](https://vercel.com/docs/storage/vercel-blob/sdk) for file persistence
- TypeScript-first implementation and ESLint (Core Web Vitals ruleset)

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate a local Vercel Blob token and add it to `.env.local`:

   ```bash
   npx vercel blob token
   ```

   Create `.env.local` with:

   ```bash
   BLOB_READ_WRITE_TOKEN=your-token-here
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The dashboard is available at [http://localhost:3000](http://localhost:3000).

> **Note:** Uploads and metadata are stored in your Vercel Blob store. Files persist between deployments unless you manually remove them.

## Available Scripts

- `npm run dev` – start the local dev server.
- `npm run build` – create an optimized production build.
- `npm start` – serve the production build.
- `npm run lint` – run ESLint over the project.

## API Overview

All endpoints live under `/api/videos` and require the `BLOB_READ_WRITE_TOKEN` secret to interact with Vercel Blob locally.

| Method | Endpoint           | Description                                      |
| ------ | ------------------ | ------------------------------------------------ |
| GET    | `/api/videos`      | List all uploaded videos and their metadata.     |
| POST   | `/api/videos`      | Upload a new video (multipart form data).        |
| PATCH  | `/api/videos/:id` | Update title, description, or tags for a video.  |
| DELETE | `/api/videos/:id` | Remove the video and its metadata from storage.  |

When uploading through the API, send a multipart request with the fields `file`, `title?`, `description?`, and `tags?` (comma-separated).

## Deployment

1. Ensure the `BLOB_READ_WRITE_TOKEN` secret is configured in your Vercel project (`vercel env pull` / `vercel env add`).
2. Build locally to verify:

   ```bash
   npm run build
   ```

3. Deploy:

   ```bash
   vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-eea1a494
   ```

4. Confirm the deployment responds:

   ```bash
   curl https://agentic-eea1a494.vercel.app
   ```

## License

MIT © 2025 Video Library Agent Contributors
