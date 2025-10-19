/**
 * Text utility functions for cleaning and formatting text
 */

/**
 * Clean description text for display in UI
 * - Removes text inside parentheses ()
 * - Removes text inside brackets []
 * - Removes all asterisks **
 * - Removes URLs
 * - Normalizes whitespace
 */
export function cleanDescriptionForDisplay(text: string): string {
  return (
    text
      // Remove text inside parentheses (including the parentheses)
      .replace(/\([^)]*\)/g, "")
      // Remove text inside brackets (including the brackets)
      .replace(/\[[^\]]*\]/g, "")
      // Remove all asterisks (markdown bold)
      .replace(/\*+/g, "")
      // Remove URLs in various formats
      .replace(/https?:\/\/[^\s]+/g, "")
      // Remove citation numbers [1], [2], etc (if any remain)
      .replace(/\[\d+\]/g, "")
      // Normalize multiple spaces to single space
      .replace(/\s+/g, " ")
      // Trim leading/trailing whitespace
      .trim()
  );
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength).trim()}...`;
}

/**
 * Clean and truncate description for display
 */
export function cleanAndTruncateDescription(
  text: string,
  maxLength = 150,
): string {
  const cleaned = cleanDescriptionForDisplay(text);
  return truncateText(cleaned, maxLength);
}
