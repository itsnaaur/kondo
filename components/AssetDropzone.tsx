"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

export function AssetDropzone({ label, name }: { label: string; name: string }) {
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
      <label className="mb-1 block text-sm font-medium text-neutral-300">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center text-sm transition ${
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
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFileNames(e.target.files)}
      />
    </div>
  );
}
