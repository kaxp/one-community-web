import { useCallback } from 'react';
import { useDropzone, type Accept, type DropzoneOptions } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  onFiles(files: File[]): void;
  accept?: Accept;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  disabled,
  label = 'Drop a file or click to upload',
  className,
}: Props) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length) onFiles(files);
    },
    [onFiles],
  );
  const options: DropzoneOptions = { onDrop, multiple };
  if (accept) options.accept = accept;
  if (disabled !== undefined) options.disabled = disabled;
  const { getRootProps, getInputProps, isDragActive } = useDropzone(options);

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface p-8 text-center transition-colors hover:border-brand/60 hover:bg-surface-muted',
        isDragActive && 'border-brand bg-brand/5',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-8 w-8 text-ink-muted" aria-hidden />
      <p className="text-sm text-ink-body">{label}</p>
    </div>
  );
}
