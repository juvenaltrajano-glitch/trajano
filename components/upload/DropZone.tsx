"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { clsx } from "clsx";

interface Props {
  onFilesAccepted: (files: File[]) => void;
  isProcessing?: boolean;
  multiple?: boolean;
}

export function DropZone({ onFilesAccepted, isProcessing, multiple = false }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted.length > 0) onFilesAccepted(accepted); },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { "video/mp4": [".mp4"], "video/quicktime": [".mov"] },
    maxSize: 500 * 1024 * 1024,
    maxFiles: multiple ? 20 : 1,
    multiple,
    disabled: isProcessing,
  });

  const errorMessage =
    fileRejections[0]?.errors[0]?.code === "file-too-large"
      ? "A file exceeds the 500 MB limit."
      : fileRejections[0]
      ? "Unsupported format. Use MP4 or MOV."
      : null;

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
        isDragActive
          ? "border-emerald-400 bg-emerald-950/20"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800/40",
        isProcessing && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3 select-none pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        {isDragActive ? (
          <p className="text-emerald-400 font-medium">Drop your clips here</p>
        ) : (
          <>
            <p className="text-zinc-300 font-medium">
              {multiple ? "Drop clips here, or " : "Drop your video, or "}
              <span className="text-emerald-400">browse</span>
            </p>
            <p className="text-zinc-500 text-sm">
              MP4 or MOV · up to 500 MB{multiple ? " · multiple files supported" : ""}
            </p>
          </>
        )}
      </div>

      {errorMessage && (
        <p className="mt-3 text-red-400 text-sm pointer-events-none">{errorMessage}</p>
      )}
    </div>
  );
}
