import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export type StoredImage = { url: string; storageKey: string; width: number; height: number };

export class UploadError extends Error {}

/**
 * Validates an upload by decoding it (never trusting the extension or MIME
 * type), re-encodes it to WebP at a sensible size, strips metadata, and stores
 * it with Cloudinary when configured, otherwise under public/uploads.
 */
export async function storeImage(file: File, folder: string): Promise<StoredImage> {
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 10 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new UploadError("That file is not a readable image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new UploadError("Use a JPG, PNG, WebP or AVIF image.");
  }
  if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 300) {
    throw new UploadError("Images must be at least 400 by 300 pixels.");
  }

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";

  if (cloudinaryConfigured()) {
    return uploadToCloudinary(data, safeFolder, info.width, info.height);
  }
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.webp`;
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
  const rel = `/uploads/${safeFolder}/${name}`;
  return { url: rel, storageKey: `local:${rel}`, width: info.width, height: info.height };
}

export async function deleteStoredImage(storageKey: string | null | undefined) {
  if (!storageKey) return;
  try {
    if (storageKey.startsWith("local:/uploads/")) {
      const rel = storageKey.slice("local:".length);
      const root = path.join(process.cwd(), "public", "uploads");
      const full = path.join(process.cwd(), "public", rel);
      if (full.startsWith(root)) await unlink(full);
    } else if (storageKey.startsWith("cloudinary:") && cloudinaryConfigured()) {
      const publicId = storageKey.slice("cloudinary:".length);
      const timestamp = Math.floor(Date.now() / 1000);
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: process.env.CLOUDINARY_API_KEY!,
        signature: sign({ public_id: publicId, timestamp }),
      });
      await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body });
    }
  } catch (error) {
    console.warn("[storage] could not delete", storageKey, error instanceof Error ? error.message : error);
  }
}

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function sign(params: Record<string, string | number>) {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(payload + process.env.CLOUDINARY_API_SECRET).digest("hex");
}

async function uploadToCloudinary(data: Buffer, folder: string, width: number, height: number): Promise<StoredImage> {
  const timestamp = Math.floor(Date.now() / 1000);
  const fullFolder = `${process.env.CLOUDINARY_FOLDER || "meilleur"}/${folder}`;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: "image/webp" }));
  form.append("folder", fullFolder);
  form.append("timestamp", String(timestamp));
  form.append("api_key", process.env.CLOUDINARY_API_KEY!);
  form.append("signature", sign({ folder: fullFolder, timestamp }));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new UploadError("The image service rejected the upload. Try again.");
  const json = (await res.json()) as { secure_url: string; public_id: string; width?: number; height?: number };
  return { url: json.secure_url, storageKey: `cloudinary:${json.public_id}`, width: json.width ?? width, height: json.height ?? height };
}
