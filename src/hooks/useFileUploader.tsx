// hooks/useFileUploader.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  deleteS3Object,
  deleteS3Objects,
  uploadFile,
} from "@/lib/api/upload";

type FailedUpload = { file: File; error: string };
export type InFlightUpload = { url: string; progress: number };

/**
 * Uploads files through `POST /api/upload/s3` (multipart to the API server,
 * which pushes them to S3) and cleans them up through
 * `DELETE /api/upload/s3?key=…`.
 *
 * The S3 key layout is decided by the backend from `instanceId`/`subfolder`:
 *
 *   {instanceId}/{subfolder}/uploads/{uuid}-{filename}
 *
 * Both are optional; missing segments are dropped on the server side. The
 * caller passes them positionally:
 *
 *   useFileUploader(instanceId?, initialFiles?, subfolder?)
 *
 * Notes on parity with the previous presigned-URL flow:
 *
 *  - `updateFile` uploads a NEW object and swaps the URL in local state — the
 *    backend has no presigned-overwrite endpoint anymore.
 *
 *  - `listFiles` returns the current in-memory list; the backend exposes no
 *    generic S3 listing endpoint.
 */
export const useFileUploader = (
  instanceId?: string,
  initialFiles: string[] = [],
  subfolder?: string,
) => {
  const safeInitialFiles = Array.isArray(initialFiles) ? initialFiles : [];

  const [files, setFiles] = useState<string[]>(safeInitialFiles);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [failedFiles, setFailedFiles] = useState<FailedUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {},
  );
  // In-flight NEW uploads, shown as tiles until they land in `files`.
  const [inFlightUploads, setInFlightUploads] = useState<InFlightUpload[]>([]);

  const mountedRef = useRef(true);
  const prevInitialFilesRef = useRef<string[]>(safeInitialFiles);

  // ---------------------------------------------------------------------
  // Sync external initialFiles changes.
  // ---------------------------------------------------------------------
  // The dependency is the CONTENT SIGNATURE (a string), not the array
  // reference. A parent that computes `initialFiles` inline — e.g.
  //   useFileUploader(id, editorial?.images ?? [], ...)
  //   useFileUploader(id, product.images.map(i => i.url), ...)
  // creates a new array reference every render. Depending on the array
  // itself would fire this effect on every render and, combined with the
  // state updates below, produce "Maximum update depth exceeded".
  // Depending on the string signature only re-fires when the CONTENT
  // actually changes.
  const initialFilesSignature = JSON.stringify(
    Array.isArray(initialFiles) ? initialFiles : [],
  );

  useEffect(() => {
    const safeFiles: string[] = JSON.parse(initialFilesSignature);
    const prev = prevInitialFilesRef.current;

    const sameContent =
      safeFiles.length === prev.length &&
      safeFiles.every((url, i) => url === prev[i]);

    if (sameContent) return;

    setFiles(safeFiles);
    prevInitialFilesRef.current = safeFiles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilesSignature]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const uploadFiles = useCallback(
    async (toUpload: File[]) => {
      if (!toUpload.length) return;
      setLoading(true);
      const uploadedUrls: string[] = [];
      // Synthetic progress keys for this batch. They drive the placeholder
      // tiles and the per-file progress entries; both are cleared at the end
      // of the batch.
      const startedKeys: string[] = [];

      for (const file of toUpload) {
        if (!mountedRef.current) break;

        const progressKey = `uploading-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

        startedKeys.push(progressKey);

        if (mountedRef.current) {
          setInFlightUploads((prev) => [
            ...prev,
            { url: progressKey, progress: 0 },
          ]);
          setProgressByName((prev) => ({ ...prev, [progressKey]: 0 }));
        }

        try {
          const result = await uploadFile(file, {
            instanceId,
            subfolder,
            onProgress: (pct) => {
              if (!mountedRef.current) return;
              setProgressByName((prev) => ({
                ...prev,
                [progressKey]: pct,
              }));
              setInFlightUploads((prev) =>
                prev.map((u) =>
                  u.url === progressKey ? { ...u, progress: pct } : u,
                ),
              );
            },
          });
          uploadedUrls.push(result.url);
        } catch (error) {
          console.error("Upload error for", file.name, error);
          if (mountedRef.current) {
            // Keep failed uploads around so callers can surface / retry
            // them instead of silently dropping them.
            setFailedFiles((prev) => [
              ...prev,
              { file, error: (error as Error).message },
            ]);
          }
        } finally {
          if (mountedRef.current) {
            setProgressByName((prev) => {
              const updated = { ...prev };
              delete updated[progressKey];
              return updated;
            });
          }
        }
      }

      if (mountedRef.current) {
        // Batch the `files` addition and `inFlightUploads` cleanup together
        // so the placeholder tile is replaced by the real image in one
        // render — no flicker between 100% and "image loaded".
        if (uploadedUrls.length > 0) {
          setFiles((prev) => [...prev, ...uploadedUrls]);
        }
        if (startedKeys.length > 0) {
          setInFlightUploads((prev) =>
            prev.filter((u) => !startedKeys.includes(u.url)),
          );
        }

        setPendingFiles([]);
        setLoading(false);
      }
    },
    [instanceId, subfolder],
  );

  // Auto-upload pending files
  useEffect(() => {
    if (pendingFiles.length > 0) {
      uploadFiles(pendingFiles);
    }
  }, [pendingFiles, uploadFiles]);

  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles.length) return;
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const retryFailed = useCallback(() => {
    if (!failedFiles.length) return;
    const toRetry = failedFiles.map((f) => f.file);
    setFailedFiles([]);
    setPendingFiles((prev) => [...prev, ...toRetry]);
  }, [failedFiles]);

  const clearFailed = useCallback(() => setFailedFiles([]), []);

  const listFiles = useCallback(async () => {
    // No server-side listing endpoint — return the hook's current list.
    return files;
  }, [files]);

  const updateFile = useCallback(
    async (index: number, newFile: File) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      try {
        const result = await uploadFile(newFile, { instanceId, subfolder });
        setFiles((prev) => prev.map((u, i) => (i === index ? result.url : u)));
        return { success: true };
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    },
    [files, instanceId, subfolder],
  );

  const removeFile = useCallback(
    async (index: number, fileUrl: string) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      const url = fileUrl || files[index];
      try {
        await deleteS3Object(url);
        setFiles((prev) => prev.filter((_, i) => i !== index));
        return { success: true };
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    },
    [files],
  );

  const removeMultipleFiles = useCallback(
    async (indices: number[]) => {
      const toRemove = indices
        .filter((i) => i >= 0 && i < files.length)
        .map((i) => files[i]);
      if (!toRemove.length) {
        return { success: false, message: "No valid files to remove" };
      }
      try {
        await deleteS3Objects(toRemove);
        setFiles((prev) => prev.filter((_, i) => !indices.includes(i)));
        return { success: true, deleted: toRemove.length };
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    },
    [files],
  );

  const clearFiles = useCallback(async () => {
    if (!files.length) return;
    try {
      await deleteS3Objects(files);
      setFiles([]);
      setPendingFiles([]);
      setFailedFiles([]);
    } catch (error) {
      console.error("Clear files error:", error);
    }
  }, [files]);

  return {
    files,
    inFlightUploads,
    loading,
    progressByName,
    failedFiles,
    addFiles,
    setFiles,
    listFiles,
    updateFile,
    removeFile,
    removeMultipleFiles,
    retryFailed,
    clearFailed,
    clearFiles,
  };
};

export default useFileUploader;
