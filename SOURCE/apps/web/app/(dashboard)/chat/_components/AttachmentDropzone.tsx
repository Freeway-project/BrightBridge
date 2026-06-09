"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILES = 5;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

interface Attachment {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export function AttachmentDropzone({
  onAttach,
}: {
  onAttach: (attachments: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";

    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files per message.`);
      return;
    }
    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      alert(`File "${oversized.name}" exceeds 25 MB limit.`);
      return;
    }

    try {
      const results: Attachment[] = await Promise.all(
        files.map(async (file) => {
          const res = await fetch("/api/chat/attachments/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
            }),
          });
          if (!res.ok) throw new Error(`Upload init failed for ${file.name}`);
          const { storageKey, uploadUrl } = (await res.json()) as {
            storageKey: string;
            uploadUrl: string;
          };
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          return { storageKey, filename: file.name, mimeType: file.type, sizeBytes: file.size };
        }),
      );
      onAttach(results);
    } catch (err) {
      console.error("Attachment upload failed:", err);
      alert("Upload failed — please try again.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Attach files"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
