"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

// Single-file only — its one call site (ContentReviewForm's flagged-image replacement)
// always replaces exactly one image, and replaceContentImage (lib/actions/content.ts)
// only ever reads a single "file" field, so a multi-file variant would silently accept
// several files and use just the first.
export function AssetDropzone({ label, name }: { label: string; name: string }) {
  const id = `dropzone-${name}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function updateFileNames(files: FileList | null) {
    setFileNames(files ? Array.from(files).map((f) => f.name) : []);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (inputRef.current && files.length > 0) {
      inputRef.current.files = files;
      updateFileNames(files);
    }
  }

  return (
    <div>
      {/* The input comes first in the DOM (not after the label) specifically so the box
          below can react to its focus state via Tailwind's peer-focus-visible — sr-only
          keeps the real control invisible but still in the tab order and keyboard-
          operable, and without a visible focus ring on the box, a sighted keyboard user
          tabbing here would have no visual indication of where focus actually is. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        name={name}
        className="peer sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFileNames(e.target.files)}
      />
      {/* One <label> wrapping both the caption and the box, rather than a <div onClick>
          triggering inputRef.current.click() — that div was invisible to keyboard users
          entirely: the input it targeted was display:none (Tailwind "hidden"), which
          removes a control from the tab order, and the div itself had no
          role/tabIndex/onKeyDown standing in for it. A <label> wrapping a real (just
          visually hidden via sr-only, not display:none) input gets both native
          click-anywhere-in-the-label behavior and native Enter/Space-opens-the-picker
          keyboard behavior for free — no custom key handling needed. Deliberately one
          label, not two (caption + box each their own <label htmlFor>) — multiple labels
          for the same control are valid HTML but get concatenated into one accessible
          name, which would announce the caption text twice. */}
      <label htmlFor={id} className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-300">{label}</span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center text-sm transition peer-focus-visible:border-yellow-400 peer-focus-visible:ring-2 peer-focus-visible:ring-yellow-400/50 ${
            isDragging
              ? "border-yellow-400 bg-neutral-900 text-neutral-200"
              : "border-neutral-700 bg-neutral-950 text-neutral-500"
          }`}
        >
          {fileNames.length > 0 ? (
            <ul className="space-y-0.5 text-neutral-300">
              {fileNames.map((n) => (
                <li key={n} className="truncate">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <span>Drop files here or click to browse</span>
          )}
        </div>
      </label>
    </div>
  );
}
