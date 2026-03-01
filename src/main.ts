import './style.css';
import { decodeDateToTenCodes, calculateRelativeDate, formatToLocalDatetimeString } from './engine';
import { processTextBlock, type UrbanResult, formatHyphenatedOutput } from './urban';

// DOM Elements
const datetimePicker = document.getElementById('datetime-picker') as HTMLInputElement;
const relativeToggle = document.getElementById('relative-toggle') as HTMLInputElement;
const relativePanel = document.getElementById('relative-time-panel') as HTMLDivElement;
const relativeNumber = document.getElementById('relative-number') as HTMLInputElement;
const relativeUnit = document.getElementById('relative-unit') as HTMLSelectElement;
const evaluatedDisplay = document.getElementById('evaluated-time-display') as HTMLParagraphElement;
const tenCodeOutput = document.getElementById('ten-code-output') as HTMLDivElement;

const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
const punctuationToggle = document.getElementById('punctuation-toggle') as HTMLInputElement;
const urbanOutput = document.getElementById('urban-output') as HTMLDivElement;

// Initialization
function init() {
  const now = new Date();
  const formatted = formatToLocalDatetimeString(now);
  datetimePicker.value = formatted;

  // Initial Decode
  handleTimeChange();

  // Event Listeners
  datetimePicker.addEventListener('change', handleTimeChange);
  relativeToggle.addEventListener('change', () => {
    relativePanel.style.display = relativeToggle.checked ? 'flex' : 'none';
    handleTimeChange();
  });
  relativeNumber.addEventListener('input', handleTimeChange);
  relativeUnit.addEventListener('change', handleTimeChange);

  // Debounce Urban Dictionary lookup
  let timeoutId: number;
  textInput.addEventListener('input', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      handleTextChange();
    }, 500); // 500ms debounce
  });

  punctuationToggle.addEventListener('change', handleTextChange);
}

function handleTimeChange() {
  let baseDate = new Date(datetimePicker.value);

  // Check if invalid date
  if (isNaN(baseDate.getTime())) {
    tenCodeOutput.innerHTML = '<p class="placeholder-text error">Invalid Date Selected.</p>';
    return;
  }

  if (relativeToggle.checked) {
    const amount = parseInt(relativeNumber.value, 10) || 0;
    const unit = relativeUnit.value as 'days' | 'weeks' | 'months';
    baseDate = calculateRelativeDate(baseDate, amount, unit);

    evaluatedDisplay.innerHTML = `Evaluated Time: <strong>${baseDate.toLocaleString()}</strong>`;
  } else {
    evaluatedDisplay.innerHTML = `Evaluated Time: <strong>${baseDate.toLocaleString()}</strong>`;
  }

  // Convert Date to exact string matching the format requirement (e.g., 2026-02-28 10:45 -> 02, 28, 20, 26, 10, 45)
  // We format as MMDDYYYYHHmm
  const pad = (n: number) => n.toString().padStart(2, '0');
  const rawString = `${pad(baseDate.getMonth() + 1)}${pad(baseDate.getDate())}${baseDate.getFullYear()}${pad(baseDate.getHours())}${pad(baseDate.getMinutes())}`;

  const tenCodes = decodeDateToTenCodes(rawString);

  // Render Logic
  tenCodeOutput.innerHTML = '';

  tenCodes.forEach(tc => {
    const pill = document.createElement('div');
    pill.className = 'code-pill';

    const digitSpan = document.createElement('span');
    digitSpan.className = 'digit';
    digitSpan.innerText = tc.code; // "10-XX"

    const meaningSpan = document.createElement('span');
    meaningSpan.className = 'meaning';
    meaningSpan.innerText = tc.meaning;

    pill.appendChild(digitSpan);
    pill.appendChild(meaningSpan);
    tenCodeOutput.appendChild(pill);
  });
}

async function handleTextChange() {
  const rawText = textInput.value;

  if (!rawText.trim()) {
    urbanOutput.innerHTML = '<p class="placeholder-text">Enter text to parse acronyms...</p>';
    return;
  }

  // Loading State
  urbanOutput.innerHTML = `
        <div style="width: 100%;">
            <div class="loading-skeleton" style="width: 40%"></div>
            <div class="loading-skeleton" style="width: 80%"></div>
            <div class="loading-skeleton" style="width: 60%"></div>
        </div>
    `;

  try {
    const preservePunctuation = punctuationToggle.checked;
    const results: UrbanResult[] = await processTextBlock(rawText, preservePunctuation);

    if (results.length === 0) {
      urbanOutput.innerHTML = '<p class="placeholder-text">No acronyms could be determined.</p>';
      return;
    }

    // Output Result
    const outputHyphenated = formatHyphenatedOutput(results);

    urbanOutput.innerHTML = ''; // clear loading state

    const pill = document.createElement('div');
    pill.className = 'urban-pill';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'acronym';
    titleSpan.innerText = outputHyphenated;

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'definition';

    // Add context for what each piece is
    const mapped = results.map(r => {
      if (r.isCommonWord) return `[${r.word}] is a verified dictionary word.`;
      if (r.isAcronym) return `[${r.word}] => ${r.definition}`;
      // Numeric resolutions are neither common words, acronyms, nor dangling
      if (!r.isAcronym && !r.isCommonWord && !r.isDangling) return `[${r.word}] => ${r.definition}`;
      return `[${r.word}] remained unmapped.`;
    }).join('<br><br>');

    detailsContainer.innerHTML = mapped;

    pill.appendChild(titleSpan);
    pill.appendChild(detailsContainer);
    urbanOutput.appendChild(pill);

  } catch (e) {
    urbanOutput.innerHTML = '<p class="placeholder-text error" style="color: var(--error-color);">Error parsing the context. Please check the console.</p>';
    console.error(e);
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);
