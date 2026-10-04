# Prompt Archive

Prompt Archive is a small, standalone browser app for collecting reusable prompts and notes about how to use them. Prompts and preferences are saved in the browser, so there is no account or server.

## What It Does

- Create prompts with a title and full prompt text. Blank titles and prompt text are rejected.
- Edit or delete saved prompts. Each prompt appears as a card with a short text preview.
- Search prompt titles and prompt text as you type.
- Rate prompts from one to five stars. Ratings are saved with their prompts.
- Add multiple notes to each prompt, then edit, save, or delete notes. Notes stay linked to their prompt, and deleting a prompt also deletes its notes.
- Choose between Nordic Forest, Cyberpunk, and Retro Paper themes. The selected theme is remembered.
- Use the responsive interface on mobile and desktop.

## Data and Storage

The app uses `localStorage` in the current browser profile and site origin:

- `prompt-archive-prompts` stores prompt IDs, titles, text, and optional ratings.
- `prompt-archive-notes` stores note IDs, the associated prompt ID, and note text.
- `prompt-archive-theme` stores the selected visual theme.

Data is not synced between browsers or devices. Clearing browser storage can remove saved prompts, notes, and theme preferences.

## Run Locally

Open `index.html` in a modern browser with JavaScript and `localStorage` enabled. No build step, package installation, or backend is required.

## Project Files

- `index.html` contains the page structure, prompt form, and notes template.
- `styles.css` contains the themes, responsive layout, and interaction styles.
- `app.js` renders the library and handles prompt, rating, note, theme, search, and storage behavior.
