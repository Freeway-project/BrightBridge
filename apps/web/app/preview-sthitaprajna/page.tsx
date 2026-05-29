"use client";

import { SthitaprajnaModal } from "@/components/shared/sthitaprajna-modal";
import { useState } from "react";

export default function PreviewPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <h1 className="mb-4 text-2xl">Preview Mode</h1>
        <p className="mb-4">The modal should be visible.</p>
        <button 
          onClick={() => setIsOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
        >
          Re-open Modal
        </button>
        <SthitaprajnaModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
