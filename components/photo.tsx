"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
export async function compressPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10000000
  )
    throw new Error("Choose a static JPEG, PNG or WebP under 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = new TextDecoder("latin1").decode(bytes);
  if (
    (file.type === "image/png" && ascii.includes("acTL")) ||
    (file.type === "image/webp" && ascii.includes("ANIM"))
  )
    throw new Error("Animated images are not supported.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 40000000) {
    bitmap.close();
    throw new Error("Choose a smaller image (under 40 megapixels).");
  }
  try {
    for (let size = 512; size >= 128; size = Math.floor(size * 0.75)) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      for (const quality of [0.85, 0.7, 0.55, 0.4]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob && blob.size <= 100000) return blob;
      }
    }
    throw new Error(
      "Could not compress this photo under 100 KB. Try a different image or skip it.",
    );
  } finally {
    bitmap.close();
  }
}
export function PhotoEditor({ hasPhoto }: { hasPhoto: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(remove = false) {
    setBusy(true);
    try {
      const form = new FormData();
      if (blob) form.set("photo", blob, "profile.webp");
      const r = await fetch("/api/photo", {
        method: remove ? "DELETE" : "POST",
        body: remove ? undefined : form,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(remove ? "Photo removed." : "Photo saved.");
      setBlob(null);
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="photo-editor">
      <h3>Profile photo (optional)</h3>
      <p className="muted">
        Your photo is public when your listing is visible. Images are cropped to
        a centered square and compressed to at most 100 KB.
      </p>
      <label htmlFor="photo">Choose a static JPEG, PNG or WebP</label>
      <input
        id="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const compressed = await compressPhoto(file);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(compressed));
            setBlob(compressed);
            setMessage(
              "Preview ready. " + Math.ceil(compressed.size / 1000) + " KB",
            );
          } catch (e) {
            setMessage((e as Error).message);
            setBlob(null);
          } finally {
            setBusy(false);
          }
        }}
      />
      {preview && (
        <Image
          unoptimized
          width={128}
          height={128}
          className="photo-preview"
          src={preview}
          alt="Compressed profile photo preview"
        />
      )}
      <div className="actions">
        {blob && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => upload()}
          >
            Save photo
          </button>
        )}
        {hasPhoto && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => upload(true)}
          >
            Remove photo
          </button>
        )}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setBlob(null);
            setPreview("");
            setMessage(
              "Photo skipped. Initials will be shown if no photo is saved.",
            );
          }}
        >
          Skip photo
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
