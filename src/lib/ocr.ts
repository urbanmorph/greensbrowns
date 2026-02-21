import Tesseract from "tesseract.js";

const INDIAN_REG_PATTERN = /[A-Z]{2}\s*\d{2}\s*[A-Z]{1,3}\s*\d{4}/g;

export async function extractRegistrationNumber(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  const result = await Tesseract.recognize(imageFile, "eng", {
    logger: (info) => {
      if (info.status === "recognizing text" && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  const text = result.data.text.toUpperCase();
  const matches = text.match(INDIAN_REG_PATTERN);

  if (!matches || matches.length === 0) return null;

  // Return the first match, cleaned up (remove extra spaces)
  return matches[0].replace(/\s+/g, "");
}
