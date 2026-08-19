/**
 * Normalizes assessment answers to a canonical string identifier format.
 * Supports legacy formats (numeric indexes, string options) and modern AI formats (object options, letter IDs).
 * 
 * @param question The question object containing options
 * @param rawAnswer The raw answer value from the student or from the correct answer field
 * @returns A canonical string identifier for the option, or null if no answer
 */
export function normalizeAnswer(question: any, rawAnswer: any): string | null {
  if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
    return null;
  }

  const strAnswer = String(rawAnswer).trim();
  const options = question.options || [];

  // Case 1: Options are an array of objects (AI-generated or modern format)
  // e.g. [{ id: "A", text: "..." }, { id: "B", text: "..." }]
  if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'id' in options[0]) {
    // If the answer directly matches one of the IDs (e.g., "A", "B", "C", "D"), return it.
    const exactMatch = options.find((o: any) => String(o.id) === strAnswer);
    if (exactMatch) {
      return String(exactMatch.id);
    }

    // If the answer is an index (e.g., "0" -> "A"), map it to the object's ID.
    // This handles legacy student payloads (selectedOption: 0) on modern questions.
    const idx = parseInt(strAnswer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return String(options[idx].id);
    }

    // Fallback
    return strAnswer;
  }

  // Case 2: Options are an array of strings or a single string delimited by '-' (Legacy format)
  // e.g. ["10", "15", "20"] or "10-15-20"
  let parsedOptions: string[] = [];
  if (Array.isArray(options)) {
    parsedOptions = options.map(o => String(o));
  } else if (typeof options === 'string') {
    parsedOptions = options.split('-');
  }

  // If the answer is a valid numeric index string (e.g., "0", "1", "2")
  const idx = parseInt(strAnswer, 10);
  if (!isNaN(idx) && idx >= 0 && idx < parsedOptions.length) {
    // Return the canonical index string
    return String(idx);
  }

  // If the answer was somehow stored as the exact text of the option,
  // find its index and return that as the canonical identifier.
  const textIdx = parsedOptions.findIndex(o => String(o).trim() === strAnswer);
  if (textIdx !== -1) {
    return String(textIdx);
  }

  // Final fallback: return the raw string
  return strAnswer;
}
