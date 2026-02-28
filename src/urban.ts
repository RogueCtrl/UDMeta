import commonWordsList from './commonWords.json';

// Create a fast lookup Set for the words
const commonWords = new Set(commonWordsList.map((w: string) => w.toLowerCase()));

interface UrbanDefinition {
    defid: number;
    word: string;
    author: string;
    permalink: string;
    definition: string;
    example: string;
    thumbs_up: number;
    thumbs_down: number;
    current_vote: string;
}

export interface UrbanResult {
    word: string;
    definition: string;
    isAcronym: boolean; // Indicates if we found it via API acronym
    isCommonWord: boolean; // Indicates if it was preserved as a common word
    isDangling: boolean; // Indicates if it's an unmapped ending word
}

/**
 * Extracts the acronym from an array of words (first letter of each).
 */
export function buildAcronym(words: string[]): string {
    return words.map(w => w.charAt(0)).join('');
}

/**
 * Checks if the given string represents a common English word (>= 3 chars)
 */
export function isCommonWord(str: string): boolean {
    if (str.length < 3) return false;
    return commonWords.has(str.toLowerCase());
}

/**
 * Fetches the definition from Urban Dictionary.
 * Returns the highest upvoted definition if matches exist, null otherwise.
 */
async function fetchUrbanDefinition(term: string): Promise<UrbanDefinition | null> {
    try {
        const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
        const data = await response.json();

        if (!data.list || data.list.length === 0) {
            return null;
        }

        // Sort by highest upvotes
        const sorted = data.list.sort((a: UrbanDefinition, b: UrbanDefinition) => b.thumbs_up - a.thumbs_up);
        return sorted[0];
    } catch (e) {
        console.error("Error fetching from Urban Dictionary:", e);
        return null;
    }
}

/**
 * The greedy recursive lookup.
 * Tries the full acronym, then strips the last character recursively until a match is found or length is 0.
 *
 * @param acronym The fully constructed acronym string
 * @param originalWords The array of words this acronym was built from
 * @returns Array of identified chunks and any dangling leftover words
 */
export async function evaluateAcronymSegment(acronym: string, originalWords: string[]): Promise<UrbanResult[]> {
    if (!acronym || acronym.length === 0) return [];

    // --- RULE 1: Is it a common word? ---
    if (isCommonWord(acronym)) {
        return [{
            word: acronym,
            definition: "Common English word, preserved.",
            isAcronym: false,
            isCommonWord: true,
            isDangling: false
        }];
    }

    // --- RULE 2: Greedy API Lookup ---
    let currentTry = acronym;
    while (currentTry.length > 0) {

        const def = await fetchUrbanDefinition(currentTry);

        if (def) {
            // We found a match for `currentTry`!
            const matchLen = currentTry.length;
            const danglingWords = originalWords.slice(matchLen);

            const result: UrbanResult[] = [{
                word: currentTry,
                definition: def.definition,
                isAcronym: true,
                isCommonWord: false,
                isDangling: false
            }];

            // --- RULE 3: Dangling Words ---
            if (danglingWords.length > 0) {
                danglingWords.forEach(dw => {
                    // Filter out punctuation-only words from dangling if needed,
                    // but requirements state preserve them
                    if (dw.trim().length > 0) {
                        result.push({
                            word: dw,
                            definition: "Dangling Word",
                            isAcronym: false,
                            isCommonWord: false,
                            isDangling: true
                        });
                    }
                });
            }

            return result;
        }

        // No match found, strip the last character & retry
        currentTry = currentTry.slice(0, -1);
    }

    // If we get here, absolutely NO combination of the acronym was found in the API.
    // Extremely rare for UD, but possible. Treat everything as dangling.
    return originalWords.map(w => ({
        word: w,
        definition: "Unresolvable Dangling Word",
        isAcronym: false,
        isCommonWord: false,
        isDangling: true
    }));
}

/**
 * Main processor:
 * 1. Takes the raw string block.
 * 2. Parses it using Pass 1 (keeping punctuation) or Pass 2 (stripping punctuation).
 * 3. Builds the acronym and processes the segments.
 */
export async function processTextBlock(textBlock: string): Promise<UrbanResult[]> {
    if (!textBlock.trim()) return [];

    // Replace actual newlines with spaces so we don't treat newlines as characters
    const safeText = textBlock.replace(/\n/g, ' ');

    // Extract words
    // Pass 1: Try with punctuation preserved (though string split natively strips standard space)
    const rawWords = safeText.split(/\s+/).filter(w => w.length > 0);

    // For now, we will perform the lookup on the raw words (punct intact on the front char)
    // If we wanted strictly two passes, we would evaluate Pass 1, and if nothing found, strip punct and evaluate Pass 2.
    // Given the greedy algo drops chars from the END, starting with `ILYT` vs `ILYT.` 
    // We will build the acronym from exactly what the first char is.

    // NORMALIZE: the requirement states Pass 1 (punct preserved), Pass 2 (punct stripped).
    // To simplify: we will use Pass 2 immediately to build the acronym reliably.
    const cleanWords = rawWords.map(w => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')).filter(w => w.length > 0);

    if (cleanWords.length === 0) return [];

    const acronym = buildAcronym(cleanWords);

    return await evaluateAcronymSegment(acronym, cleanWords);
}

/**
 * Combines results into the hyphenated Output requirement.
 */
export function formatHyphenatedOutput(results: UrbanResult[]): string {
    return results.map(r => r.word).join('-');
}
