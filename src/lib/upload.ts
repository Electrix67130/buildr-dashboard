const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "change-me-in-production";

import { getAccessToken } from "./api";

export interface UploadResult {
  url: string;
  original_name: string;
  file_size: number;
  mime_type: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Upload failed");
  }

  return response.json();
}
