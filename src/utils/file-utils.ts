import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from "@/constants/formats";

export function getFileExtension(filename: string): string {
  return "." + (filename.toLowerCase().split(".").pop() ?? "");
}

export function isFileSupported(file: File): boolean {
  const ext = getFileExtension(file.name);
  return SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number]);
}

export function validateFile(file: File): string | null {
  if (!isFileSupported(file)) {
    return `Unsupported format: ${getFileExtension(file.name)}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}
