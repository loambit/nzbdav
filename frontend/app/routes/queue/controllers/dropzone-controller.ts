import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { UploadingFile } from "../route";

export function useQueueDropzone(
    setUploadingFiles: (value: React.SetStateAction<UploadingFile[]>) => void,
    uploadQueueRef: React.RefObject<UploadingFile[]>,
    manualCategoryRef: React.RefObject<string>,
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const dragDepthRef = useRef(0);
    const [isDragActive, setIsDragActive] = useState(false);

    const enqueueFiles = useCallback((acceptedFiles: File[]) => {
        const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
            file,
            queueSlot: {
                isUploading: true,
                nzo_id: `upload-${Date.now()}-${Math.random()}`,
                priority: 'Normal',
                filename: file.name,
                cat: manualCategoryRef.current,
                percentage: "0",
                true_percentage: "0",
                status: "pending",
                mb: (file.size / (1024 * 1024)).toFixed(2),
                mbleft: (file.size / (1024 * 1024)).toFixed(2),
            }
        }));

        setUploadingFiles(files => [...files, ...newFiles]);
        uploadQueueRef.current = [...uploadQueueRef.current, ...newFiles];
    }, [manualCategoryRef, setUploadingFiles, uploadQueueRef]);

    const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragActive(true);
    }, []);

    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    }, []);

    const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragActive(false);
    }, []);

    const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragActive(false);
        enqueueFiles(
            Array.from(event.dataTransfer.files)
                .filter(file => file.name.toLowerCase().endsWith(".nzb"))
        );
    }, [enqueueFiles]);

    const onInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        enqueueFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
    }, [enqueueFiles]);

    return {
        isDragActive,
        open: () => inputRef.current?.click(),
        getRootProps: () => ({
            onDragEnter,
            onDragOver,
            onDragLeave,
            onDrop,
        }),
        getInputProps: () => ({
            ref: inputRef,
            type: "file",
            accept: ".nzb,application/x-nzb",
            multiple: true,
            hidden: true,
            onChange: onInputChange,
        }),
    };
}