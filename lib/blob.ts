export function blobToken() {
  const token =
    process.env.JIBON_PUBLIC_READ_WRITE_TOKEN?.trim() ||
    process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("Profile uploads require Vercel Blob configuration.");
  }
  return token;
}
