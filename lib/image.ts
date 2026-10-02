import sharp from "sharp";
export async function validateImage(bytes: Buffer) {
  if (bytes.length > 100000) throw new Error("Photo must be at most 100 KB.");
  const image = sharp(bytes, { limitInputPixels: 4000000, animated: true });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages || 1) > 1 ||
    !meta.width ||
    !meta.height ||
    meta.width > 2048 ||
    meta.height > 2048
  )
    throw new Error(
      "Choose a static JPEG, PNG or WebP image up to 2048 pixels.",
    );
  const clean = await image
    .rotate()
    .resize(512, 512, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (clean.length > 100000)
    throw new Error("Photo is too large after processing.");
  return clean;
}
