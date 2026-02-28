# Urban Dictionary & Police Ten-Code Decoder

![App Preview](public/preview.png)

A dual-function interactive decoder web application built entirely in Vanilla TypeScript and deployed via GitHub Pages.

Time to build: 1h

## Core Features
1. **Police 10-Code Decoder**: 
   - Converts an input date and time into 2-digit pairs and maps them to standard Police 10-Codes (e.g., `10:04` -> `10`, `4` -> `10-10`, `10-4`). 
   - Features an optional toggle to calculate relative datetimes dynamically (subtracting days/weeks/months before processing).
2. **Text to Urban Dictionary Acronyms**: 
   - Takes a block of text and extracts the first letter of each word to form an acronym.
   - Performs a greedy search against the unofficial Urban Dictionary API.
   - Preserves common English words (>= 3 chars) and "dangling" unresolvable words, combining the result into a clean hyphenated output (e.g. `I Love You July` -> `ILY-July`).

## Tech Stack
- Frontend: Vanilla TypeScript (No frameworks like React or Vue).
- Bundler: Vite.
- Styling: Custom Vanilla CSS with modern flex/grid layouts and a premium glassmorphic aesthetic.
- Icons: Lucide.

## Local Development
1. Clone this repository.
2. Run `npm install` to grab the dependencies.
3. Run `npm run dev` to start the local Vite development server.

## Building for Production
The project automatically deploys to GitHub Pages via Actions. 
Alternatively, to build manually:
- Run `npm run build` targeting the base path required for deployment. This command uses `vite build` under the hood to compile and bundle the `dist/` logic.
