import type { MessageAttachment } from "../types";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "File must be under 25 MB.";
  }
  const mime = file.type || guessMime(file.name);
  if (!ALLOWED_ATTACHMENT_TYPES.has(mime)) {
    return "Unsupported file type. Use images, PDF, Office docs, or ZIP.";
  }
  return null;
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
  };
  return map[ext || ""] || "application/octet-stream";
}

export function parseMessageBody(raw: string): {
  text: string;
  attachments: MessageAttachment[];
} {
  if (!raw || raw[0] !== "{") {
    return { text: raw || "", attachments: [] };
  }
  try {
    const parsed = JSON.parse(raw) as {
      infl?: number;
      text?: string;
      attachments?: MessageAttachment[];
    };
    if (parsed?.infl === 1) {
      return {
        text: parsed.text || "",
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      };
    }
  } catch {
    /* plain text */
  }
  return { text: raw, attachments: [] };
}

export function serializeMessageBody(
  text: string,
  attachments: MessageAttachment[]
): string {
  const trimmed = text.trim();
  if (!attachments.length) return trimmed;
  return JSON.stringify({ infl: 1, text: trimmed, attachments });
}

export function messagePreview(raw: string | null): string {
  if (!raw) return "";
  const { text, attachments } = parseMessageBody(raw);
  if (text) return text;
  if (attachments.length) {
    return `📎 ${attachments[0].name}${attachments.length > 1 ? ` +${attachments.length - 1}` : ""}`;
  }
  return "";
}
