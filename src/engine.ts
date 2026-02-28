import { policeCodes } from './codes';

/**
 * Extracts 2-digit pairs from a provided date string and maps them to 10-codes.
 */
export function decodeDateToTenCodes(dateString: string): { digit: string; code: string; meaning: string }[] {
    // Extract only numbers from the string
    const numbersOnly = dateString.replace(/\D/g, '');

    const pairs: string[] = [];
    for (let i = 0; i < numbersOnly.length; i += 2) {
        if (i + 1 < numbersOnly.length) {
            pairs.push(numbersOnly.substring(i, i + 2));
        } else {
            pairs.push(numbersOnly.substring(i)); // Handle single trailing digit though impossible with strict date formats
        }
    }

    return pairs.map(digitPair => {
        // Try to find the exact pair. For "04", exact "04" might not exist.
        let codeStr = digitPair;
        let meaning = policeCodes[digitPair];

        // If not found and it starts with 0 (e.g. '04'), map to the single digit ('4')
        if (!meaning && digitPair.startsWith('0') && digitPair.length > 1) {
            const stripped = digitPair.replace(/^0+/, '');
            if (policeCodes[stripped]) {
                codeStr = stripped;
                meaning = policeCodes[stripped];
            }
        }

        return {
            digit: digitPair,
            code: `10-${codeStr}`,
            meaning: meaning || 'Unknown Code'
        };
    });
}

/**
 * Utility to calculate a new date by applying relative subtractions.
 */
export function calculateRelativeDate(baseDate: Date, subtractAmount: number, subtractUnit: 'days' | 'weeks' | 'months'): Date {
    const newDate = new Date(baseDate.getTime());

    if (subtractUnit === 'days') {
        newDate.setDate(newDate.getDate() - subtractAmount);
    } else if (subtractUnit === 'weeks') {
        newDate.setDate(newDate.getDate() - (subtractAmount * 7));
    } else if (subtractUnit === 'months') {
        newDate.setMonth(newDate.getMonth() - subtractAmount);
    }

    return newDate;
}

/**
 * Returns a YYYY-MM-DDTHH:mm string formatting representing local time
 */
export function formatToLocalDatetimeString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    // MMDDYYYYHHmm
    return `${pad(date.getMonth() + 1)}${pad(date.getDate())}${date.getFullYear()}${pad(date.getHours())}${pad(date.getMinutes())}`;
}
