# Urban Dictionary Meta - AI Assistants Guide

## Project Context
This application is a dual-function decoder web application that maps both absolute datetimes and text blocks. It is constructed entirely in Vanilla TypeScript (using Vite) with no external frontend frameworks (e.g. React).

### Core Features
1. **Police 10-Code Decoder**: Converts an input date and time into 2-digit pairs and maps them to Police 10-Codes (e.g., `2026-02-28 10:45` -> `20`, `26`, `02`, `28`, `10`, `45` -> `10-20`, `10-26`, `10-02` etc). An optional feature exists to toggle absolute/relative datetimes (e.g., subtracting days/weeks/months before processing).
2. **Text to Urban Dictionary Acronyms**: Takes a block of text, extracts the first letter of each word to form an acronym, and performs a greedy search against the Urban Dictionary API. It performs two passes (with and without punctuation), drops characters from the end of the acronym if no match is found, and selects the most upvoted result that represents an acronym.

## Architecture
- `src/main.ts`: Main application entry point handling DOM manipulation and event listeners.
- `src/engine.ts`: Core datetime parsing logic for rendering 10-codes.
- `src/urban.ts`: Urban Dictionary API integration (`https://api.urbandictionary.com/v0/define?term=...`), acronym extraction, and greedy fallback search.
- `src/codes.ts`: Static mapping and array of common Police Ten-Codes for immediate, offline lookup.
- `src/style.css`: Modern, high-quality, glassmorphism-inspired aesthetic CSS using grid/flex.

## Development Constraints
- Use strict typing in TypeScript at all times.
- Keep the CSS completely Vanilla. Implement modern variables (`:root`) and smooth transitions without Tailwind.
- The UI MUST honor whitespace formatting in the paste-text textarea (`white-space: pre-wrap`).
- Prioritize high-quality visual aesthetics directly matching premium web design principles.
- Use `lucide` icons via SVG/HTML logic if necessary.

## Commands
- `npm run dev`: Start the local development server.
- `npm run build`: Build for production (Targeting GitHub Pages deployment).
