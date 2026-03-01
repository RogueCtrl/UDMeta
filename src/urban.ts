import commonWordsList from './commonWords.json';
import { getCachedDefinition, setCachedDefinition } from './idb';

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

import { policeCodes } from './codes';

/**
 * Extracts the acronym from an array of words (first letter of each).
 * If a word is a continuous string of numbers, it extracts the numbers, zero-pads single digits,
 * and passes them through as exact numeric definitions so they can be looked up.
 */
export function buildAcronymObj(words: string[]): { char: string, isNumeric: boolean, originalWord: string }[] {
    return words.map(w => {
        // If it's a number string
        if (/^\d+$/.test(w)) {
            // Zero pad single digits
            if (w.length === 1) w = `0${w}`;
            return { char: w, isNumeric: true, originalWord: w };
        }
        return { char: w.charAt(0), isNumeric: false, originalWord: w };
    });
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
        // IDB Read-Through Cache Check
        const cached = await getCachedDefinition(term);
        if (cached !== null) {
            return cached.data;
        }

        const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
        const data = await response.json();

        if (!data.list || data.list.length === 0) {
            await setCachedDefinition(term, null); // Cache the empty miss
            return null;
        }

        // Sort by highest upvotes
        const sorted = data.list.sort((a: UrbanDefinition, b: UrbanDefinition) => b.thumbs_up - a.thumbs_up);
        const bestDef = sorted[0];

        await setCachedDefinition(term, bestDef);
        return bestDef;
    } catch (e) {
        console.error("Error fetching from Urban Dictionary:", e);
        return null;
    }
}

export async function evaluateAcronymSegment(acronymObjs: { char: string, isNumeric: boolean, originalWord: string }[]): Promise<UrbanResult[]> {
    if (!acronymObjs || acronymObjs.length === 0) return [];

    // Convert objects to a continuous array of final tokens to evaluate
    // For numbers, we will expand them directly to their 10 code meaning
    const results: UrbanResult[] = [];

    // We will chunk non-numeric characters together to form acronyms to query
    let currentAcronymChunk = '';
    let currentWordsChunk: string[] = [];

    for (let i = 0; i < acronymObjs.length; i++) {
        const obj = acronymObjs[i];

        if (obj.isNumeric) {
            // First, if we had a pending text acronym chunk, evaluate it and push results
            if (currentAcronymChunk.length > 0) {
                const textResults = await evaluateTextAcronym(currentAcronymChunk, currentWordsChunk);
                results.push(...textResults);
                currentAcronymChunk = '';
                currentWordsChunk = [];
            }

            // Now resolve the number greedily using our engine logic
            // E.g. "20" -> "10-20" Your Location
            const numbers = obj.char;
            let j = 0;
            while (j < numbers.length) {
                // we want exactly 2 digits, or 1 if it's the very last dangling char
                const pair = numbers.substring(j, j + 2);

                let codeStr = pair;
                let meaning = policeCodes[pair];

                if (!meaning && pair.startsWith('0') && pair.length > 1) {
                    const stripped = pair.replace(/^0+/, '');
                    if (policeCodes[stripped]) {
                        codeStr = stripped;
                        meaning = policeCodes[stripped];
                    }
                }

                // Add the numeric resolution directly as an UrbanResult for seamless UI integeration
                results.push({
                    word: `10-${codeStr}`,
                    definition: meaning || 'Unknown Code',
                    isAcronym: false,
                    isCommonWord: false,
                    isDangling: false // Technically mapped, even if unknown
                });

                j += 2;
            }
        } else {
            // Build up the normal text chunk
            currentAcronymChunk += obj.char;
            currentWordsChunk.push(obj.originalWord);
        }
    }

    // Evaluate any remaining text chunk at the end
    if (currentAcronymChunk.length > 0) {
        const textResults = await evaluateTextAcronym(currentAcronymChunk, currentWordsChunk);
        results.push(...textResults);
    }

    return results;
}

/**
 * Extracted text-only greedy logic.
 */
async function evaluateTextAcronym(acronym: string, originalWords: string[]): Promise<UrbanResult[]> {
    if (acronym.length === 0) return [];

    // Cap acronym querying to a maximum of 5 characters.
    let currentTry = acronym.length > 5 ? acronym.slice(0, 5) : acronym;

    while (currentTry.length > 1) {
        // Rule 1: Is the current acronym string a common english word itself?
        if (isCommonWord(currentTry)) {
            const matchLen = currentTry.length;
            const matchWords = originalWords.slice(0, matchLen);
            const danglingWords = originalWords.slice(matchLen);

            const result: UrbanResult[] = [{
                word: currentTry,
                definition: `Common english word formed by: [${matchWords.join(' ')}]`,
                isAcronym: true,
                isCommonWord: true,
                isDangling: false
            }];

            if (danglingWords.length > 0) {
                const rest = await evaluateTextAcronym(acronym.slice(matchLen), danglingWords);
                result.push(...rest);
            }
            return result;
        }

        // Rule 2: API lookup
        const def = await fetchUrbanDefinition(currentTry);

        if (def) {
            const matchLen = currentTry.length;
            const danglingWords = originalWords.slice(matchLen);

            const result: UrbanResult[] = [{
                word: currentTry,
                definition: def.definition,
                isAcronym: true,
                isCommonWord: false,
                isDangling: false
            }];

            if (danglingWords.length > 0) {
                const rest = await evaluateTextAcronym(acronym.slice(matchLen), danglingWords);
                result.push(...rest);
            }

            return result;
        }
        currentTry = currentTry.slice(0, -1);
    }

    // If no acronym matched, the first word remains unmapped. Recurse on the remaining words.
    const result: UrbanResult[] = [{
        word: originalWords[0],
        definition: "remained unmapped.",
        isAcronym: false,
        isCommonWord: false,
        isDangling: true
    }];

    if (originalWords.length > 1) {
        const rest = await evaluateTextAcronym(acronym.slice(1), originalWords.slice(1));
        result.push(...rest);
    }

    return result;
}

/**
 * Main processor:
 * @param preservePunctuation If true, keeps punctuation as chunk boundaries. If false, strips everything non-alphanumeric.
 */
export async function processTextBlock(textBlock: string, preservePunctuation: boolean = true): Promise<UrbanResult[]> {
    if (!textBlock.trim()) return [];

    let chunks: string[] = [];

    if (preservePunctuation) {
        // Split text into chunks based on punctuation and line break boundaries
        // periods, commas, semi-colons, colons, exclamation points, question marks,
        // newlines, hyphens surrounded by whitespace, em dashes
        chunks = textBlock.split(/[,.;:!?\n]+|\s+-\s+|—+/g).filter(c => c.trim().length > 0);
    } else {
        // Aggressively replace all non-alphanumeric characters (including newlines and punctuation)
        // with spaces to force a single massive unpunctuated block, then split by space
        const strippedText = textBlock.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\n/g, ' ');
        // We push this as a single monolithic chunk so words run together seamlessly
        chunks = [strippedText.trim()].filter(c => c.length > 0);
    }

    const finalResults: UrbanResult[] = [];

    for (const chunk of chunks) {
        const rawWords = chunk.split(/\s+/).filter(w => w.length > 0);

        // Strip out any remaining non-alphanumeric trailing/leading characters within the chunk
        // except for hyphens that might be part of hyphenated words without spaces
        const cleanWords = rawWords.map(w => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')).filter(w => w.length > 0);

        if (cleanWords.length > 0) {
            const acronymObjs = buildAcronymObj(cleanWords);
            const chunkResults = await evaluateAcronymSegment(acronymObjs);
            finalResults.push(...chunkResults);
        }
    }

    return finalResults;
}

/**
 * Combines results into the hyphenated Output requirement.
 */
export function formatHyphenatedOutput(results: UrbanResult[]): string {
    return results.map(r => r.word).join('-');
}
