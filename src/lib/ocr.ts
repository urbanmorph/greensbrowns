import Tesseract from "tesseract.js";

const INDIAN_REG_PATTERN = /[A-Z]{2}\s*\d{2}\s*[A-Z]{1,3}\s*\d{4}/g;

// Indian driving license: state code (2 letters) + RTO code (2 digits) + year (4 digits) + sequence (7 digits)
// e.g. KA0120210012345, DL0520190054321
const INDIAN_DL_PATTERN = /[A-Z]{2}\s*\d{2}\s*\d{4}\s*\d{7}/g;

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

export interface DLExtractResult {
  licenseNumber: string | null;
  name: string | null;
  /** ISO date string YYYY-MM-DD, or null if not found */
  validTill: string | null;
}

/**
 * Extract the holder's name from Indian DL OCR text.
 *
 * Tesseract produces noisy output from DL images, e.g.:
 *   "5 NAME © SATHYANARAYANAN SANKARAN SS Ten"
 *   "Name : RAJAN KUMAR"
 *   "NAME\n\nRAJAN KUMAR"
 *
 * Known OCR quirks we handle:
 *   - Leading garbage characters/digits before "NAME"
 *   - Colon ":" misread as "©" or other symbols
 *   - Trailing short garbage tokens (e.g. "SS", "Ten")
 *   - Name on the same line or on the next non-empty line
 */
function extractNameFromText(text: string): string | null {
  const lines = text.split(/\n/).map((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    // Find any line containing a standalone "NAME" word (allow leading garbage)
    if (!/\bNAME\b/i.test(lines[i])) continue;
    // Skip lines like "Father's Name", "S/W/D of Name", "Sign. Of Holder"
    if (/father|mother|husband|guardian|s\/w\/d|sign/i.test(lines[i])) continue;

    // Strip everything up to and including "NAME" + any separator
    // Separators: ":", "©" (common OCR misread of ":"), "-", ".", whitespace
    const afterLabel = lines[i]
      .replace(/^.*?\bNAME\b\s*[:\-©.\s]*/i, "")
      .trim();

    let raw: string | null = null;

    if (afterLabel.length >= 3 && /[A-Za-z]{2,}/.test(afterLabel)) {
      raw = afterLabel;
    } else {
      // Name is on one of the next non-empty lines
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        // Stop if we hit the next known label
        if (/\b(s\/w\/d|s\/o|d\/o|w\/o|blood|dob|d\.o\.b|date|addr|valid|issue|badge|b\.?g)/i.test(candidate)) break;
        if (candidate.length >= 3 && /[A-Za-z]{2,}/.test(candidate)) {
          raw = candidate;
          break;
        }
      }
    }

    if (!raw) return null;

    // Clean up the raw name:
    // 1. Strip known trailing label fragments
    raw = raw.replace(/\b(s\/w\/d|s\/o|d\/o|w\/o|blood|dob|d\.o\.b|date|addr|b\.?g\.?).*$/i, "");
    // 2. Keep only letters, spaces, dots, hyphens, apostrophes
    raw = raw.replace(/[^A-Za-z .'-]/g, "");
    // 3. Remove short trailing garbage tokens (≤3 char words at the end,
    //    typically OCR noise from adjacent DL fields like "B.G.: A+")
    raw = raw.replace(/(\s+[A-Za-z]{1,3})+\s*$/, "");
    // 4. Normalize whitespace
    raw = raw.replace(/\s+/g, " ").trim();

    if (raw.length < 3) return null;

    // Title-case
    return raw
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return null;
}

/**
 * Extract the "VALID TILL" date from Indian DL OCR text.
 *
 * Tesseract output examples:
 *   "SS VALID TILL : 10-10-2034(NT)"
 *   "VALID TILL: 10-10-2034"
 *   "VALID TILL © 10/10/2034(NT)"
 *
 * Returns an ISO date string (YYYY-MM-DD) or null.
 */
function extractValidTillFromText(text: string): string | null {
  const lines = text.split(/\n/).map((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    if (!/VALID\s*TILL/i.test(lines[i])) continue;

    // Grab everything after "VALID TILL" + separator
    const afterLabel = lines[i]
      .replace(/^.*?VALID\s*TILL\s*[:\-©.\s]*/i, "")
      .trim();

    let dateStr: string | null = null;

    // Try to find a date on this line (DD-MM-YYYY or DD/MM/YYYY)
    const dateMatch = afterLabel.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/);
    if (dateMatch) {
      dateStr = afterLabel;
    } else {
      // Check next non-empty lines
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        const m = candidate.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/);
        if (m) {
          dateStr = candidate;
          break;
        }
      }
    }

    if (!dateStr) return null;

    // Extract DD, MM, YYYY
    const m = dateStr.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/);
    if (!m) return null;

    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];

    // Validate
    const parsed = new Date(`${year}-${month}-${day}`);
    if (isNaN(parsed.getTime())) return null;

    return `${year}-${month}-${day}`;
  }

  return null;
}

export async function extractLicenseDetails(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<DLExtractResult> {
  const result = await Tesseract.recognize(imageFile, "eng", {
    logger: (info) => {
      if (info.status === "recognizing text" && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  const text = result.data.text;
  const upperText = text.toUpperCase();

  // Extract license number
  const dlMatches = upperText.match(INDIAN_DL_PATTERN);
  const licenseNumber = dlMatches ? dlMatches[0].replace(/\s+/g, "") : null;

  // Extract name
  const name = extractNameFromText(text);

  // Extract valid till date
  const validTill = extractValidTillFromText(text);

  return { licenseNumber, name, validTill };
}
