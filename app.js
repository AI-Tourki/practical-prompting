const STORAGE_KEY = "prompt-archive-prompts";
const NOTES_STORAGE_KEY = "prompt-archive-notes";
const THEME_STORAGE_KEY = "prompt-archive-theme";
const DEFAULT_THEME = "nordic-forest";
const THEMES = ["cyberpunk", "nordic-forest", "retro-paper"];
const promptForm = document.querySelector("#prompt-form");
const titleInput = document.querySelector("#prompt-title");
const contentInput = document.querySelector("#prompt-content");
const searchInput = document.querySelector("#prompt-search");
const promptList = document.querySelector("#prompt-list");
const notesTemplate = document.querySelector("#prompt-notes-template");
const formMessage = document.querySelector("#form-message");
const themeButtons = document.querySelectorAll("[data-theme-choice]");
const composerTitle = document.querySelector(".composer .section-heading h2");
const saveButton = promptForm.querySelector(".save-button");
const cancelEditButton = document.createElement("button");
let editingPromptId = null;

cancelEditButton.className = "cancel-edit-button";
cancelEditButton.type = "button";
cancelEditButton.textContent = "Cancel edit";
cancelEditButton.hidden = true;
cancelEditButton.addEventListener("click", cancelPromptEdit);
promptForm.insertBefore(cancelEditButton, formMessage);

function readTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme, persist = true) {
  if (!THEMES.includes(theme)) return;

  document.documentElement.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.themeChoice === theme),
    );
  });

  const canvasColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--canvas")
    .trim();
  document.querySelector('meta[name="theme-color"]').content = canvasColor;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The current theme still applies when browser storage is unavailable.
    }
  }
}

function readPrompts() {
  try {
    const storedPrompts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(storedPrompts) ? storedPrompts : [];
  } catch {
    return [];
  }
}

function readNotes() {
  try {
    const storedNotes = JSON.parse(
      localStorage.getItem(NOTES_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(storedNotes)
      ? storedNotes.filter(
          (note) =>
            note &&
            typeof note.id === "string" &&
            typeof note.promptId === "string" &&
            typeof note.content === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  try {
    // Notes use their own JSON key and retain the ID of their prompt.
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

let prompts = readPrompts();
// Keep notes attached to prompts that still exist in the library.
let notes = readNotes().filter((note) =>
  prompts.some((prompt) => prompt.id === note.promptId),
);

themeButtons.forEach((button) => {
  button.addEventListener("click", () =>
    applyTheme(button.dataset.themeChoice),
  );
});
applyTheme(readTheme(), false);

function getPreview(content) {
  const words = content.trim().split(/\s+/);
  return words.length > 14 ? `${words.slice(0, 14).join(" ")}...` : content;
}

function getPromptRating(prompt) {
  return Number.isInteger(prompt.rating) &&
    prompt.rating >= 1 &&
    prompt.rating <= 5
    ? prompt.rating
    : 0;
}

function updateRatingPreview(ratingGroup, rating) {
  ratingGroup.querySelectorAll("[data-rating]").forEach((button) => {
    const buttonRating = Number(button.dataset.rating);
    button.classList.toggle("is-filled", buttonRating <= rating);
    button.setAttribute("aria-pressed", String(buttonRating === rating));
  });
}

function createRatingControl(prompt) {
  const ratingGroup = document.createElement("div");
  ratingGroup.className = "prompt-rating";
  ratingGroup.setAttribute("role", "group");
  ratingGroup.setAttribute("aria-label", `Rate ${prompt.title}`);

  const currentRating = getPromptRating(prompt);

  for (let rating = 1; rating <= 5; rating += 1) {
    const starButton = document.createElement("button");
    starButton.className = "rating-star";
    starButton.type = "button";
    starButton.dataset.rating = String(rating);
    starButton.setAttribute(
      "aria-label",
      `Set ${prompt.title} rating to ${rating} out of 5 stars`,
    );
    starButton.setAttribute("aria-pressed", String(currentRating === rating));
    starButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.12 2.75 L14.78 8.13 Q14.9 8.38 15.18 8.42 L21.11 9.28 Q21.39 9.32 21.19 9.52 L16.89 13.7 Q16.69 13.9 16.74 14.18 L17.75 20.09 Q17.8 20.37 17.55 20.24 L12.25 17.44 Q12 17.31 11.75 17.44 L6.45 20.24 Q6.2 20.37 6.25 20.09 L7.26 14.18 Q7.31 13.9 7.11 13.7 L2.81 9.52 Q2.61 9.32 2.89 9.28 L8.82 8.42 Q9.1 8.38 9.22 8.13 L11.88 2.75 Q12 2.5 12.12 2.75 Z" /></svg>';
    const burst = document.createElement("span");
    burst.className = "rating-burst";
    burst.setAttribute("aria-hidden", "true");

    for (let sparkIndex = 0; sparkIndex < 8; sparkIndex += 1) {
      const spark = document.createElement("span");
      spark.style.setProperty("--spark-angle", `${sparkIndex * 45}deg`);
      spark.style.setProperty("--spark-index", String(sparkIndex));
      burst.append(spark);
    }

    starButton.append(burst);
    starButton.addEventListener("pointerenter", () =>
      updateRatingPreview(ratingGroup, rating),
    );
    starButton.addEventListener("focus", () =>
      updateRatingPreview(ratingGroup, rating),
    );
    starButton
      .querySelector("svg")
      .addEventListener("animationend", () =>
        starButton.classList.remove("is-popping"),
      );
    starButton.addEventListener("click", () => {
      starButton.classList.remove("is-popping");
      void starButton.offsetWidth;
      starButton.classList.add("is-popping");
      onRate(prompt.id, rating, ratingGroup);
    });
    ratingGroup.append(starButton);
  }

  ratingGroup.addEventListener("pointerleave", () =>
    updateRatingPreview(ratingGroup, getPromptRating(prompt)),
  );
  ratingGroup.addEventListener("focusout", (event) => {
    if (!ratingGroup.contains(event.relatedTarget)) {
      updateRatingPreview(ratingGroup, getPromptRating(prompt));
    }
  });
  updateRatingPreview(ratingGroup, currentRating);

  return ratingGroup;
}

function createPromptCard(prompt) {
  const card = document.createElement("article");
  card.className = "prompt-card";
  card.dataset.promptId = prompt.id;

  const header = document.createElement("div");
  header.className = "prompt-card-header";

  const title = document.createElement("h3");
  title.textContent = prompt.title;

  const actions = document.createElement("div");
  actions.className = "prompt-card-actions";

  const editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.type = "button";
  editButton.setAttribute("aria-label", `Edit ${prompt.title}`);
  editButton.title = `Edit ${prompt.title}`;
  editButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6"/><path d="m18.5 2.5 3 3L11 16l-4 1 1-4Z"/><path d="m16.5 4.5 3 3"/></svg>';
  editButton.addEventListener("click", () => editPrompt(prompt.id));

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${prompt.title}`);
  deleteButton.addEventListener("click", () => deletePrompt(prompt.id));

  const notesButton = document.createElement("button");
  notesButton.className = "notes-trigger";
  notesButton.type = "button";
  notesButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.75h8l4 4v12.5H7z"/><path d="M15 3.75v4h4M10 12h6M10 15.5h6"/></svg><span class="note-count" aria-hidden="true"></span>';
  const notesDialog = createNotesSection(prompt, notesButton);
  notesButton.addEventListener("click", () => {
    notesDialog.showModal();
    notesDialog.querySelector(".note-input").focus();
  });
  updateNotesTrigger(prompt, notesButton);

  actions.append(editButton, notesButton, deleteButton);

  const preview = document.createElement("p");
  preview.className = "prompt-preview";
  preview.textContent = getPreview(prompt.content);

  const rating = createRatingControl(prompt);
  header.append(title, actions);
  card.append(header, rating, preview, notesDialog);
  return card;
}

function createNotesSection(prompt, triggerButton) {
  const dialog = document.createElement("dialog");
  dialog.className = "notes-dialog";

  const section = notesTemplate.content.firstElementChild.cloneNode(true);
  const title = section.querySelector("h4");
  const list = section.querySelector(".note-list");
  const form = section.querySelector(".note-form");
  const input = section.querySelector(".note-input");
  const label = section.querySelector(".note-label");
  const message = section.querySelector(".note-message");
  const inputId = `note-input-${prompt.id}`;

  title.id = `notes-title-${prompt.id}`;
  section.setAttribute("aria-labelledby", title.id);
  section.setAttribute("aria-label", `Notes for ${prompt.title}`);
  dialog.setAttribute("aria-labelledby", title.id);
  label.htmlFor = inputId;
  input.id = inputId;
  list.setAttribute("aria-label", `Notes for ${prompt.title}`);

  const header = document.createElement("header");
  header.className = "notes-dialog-header";
  const closeButton = document.createElement("button");
  closeButton.className = "notes-close-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close notes");
  closeButton.title = "Close notes";
  closeButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  closeButton.addEventListener("click", () => dialog.close());
  header.append(title, closeButton);
  section.replaceChildren(header, list, form);
  dialog.append(section);

  renderNotesInDialog(prompt, list, dialog, triggerButton);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) {
      message.textContent = "Write a note before adding it.";
      return;
    }

    const note = {
      id: `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      promptId: prompt.id,
      content,
    };
    notes = [...notes, note];
    if (!saveNotes()) {
      notes = notes.filter((savedNote) => savedNote.id !== note.id);
      message.textContent = "Could not save this note in browser storage.";
      return;
    }

    input.value = "";
    message.textContent = "";
    renderNotesInDialog(prompt, list, dialog, triggerButton);
    input.focus();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => triggerButton.focus());

  return dialog;
}

function updateNotesTrigger(prompt, triggerButton) {
  const noteCount = notes.filter((note) => note.promptId === prompt.id).length;
  triggerButton.querySelector(".note-count").textContent = String(noteCount);
  triggerButton.setAttribute(
    "aria-label",
    `Open notes for ${prompt.title}, ${noteCount} ${noteCount === 1 ? "note" : "notes"}`,
  );
  triggerButton.title = `${noteCount} ${noteCount === 1 ? "note" : "notes"}`;
}

function renderNotesInDialog(prompt, list, dialog, triggerButton) {
  const promptNotes = notes.filter((note) => note.promptId === prompt.id);
  list.replaceChildren(
    ...promptNotes.map((note) =>
      createNoteItem(prompt, note, list, dialog, triggerButton),
    ),
  );
  updateNotesTrigger(prompt, triggerButton);
}

function createNoteItem(prompt, note, list, dialog, triggerButton) {
  const item = document.createElement("li");
  item.className = "note-item";
  item.dataset.noteId = note.id;

  const content = document.createElement("p");
  content.className = "note-content";
  content.textContent = note.content;

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editButton = document.createElement("button");
  editButton.className = "note-edit-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit note for ${prompt.title}`);
  editButton.addEventListener("click", () => {
    const editor = document.createElement("textarea");
    editor.className = "note-editor";
    editor.rows = 3;
    editor.maxLength = 1000;
    editor.value = note.content;
    editor.setAttribute("aria-label", `Edit note for ${prompt.title}`);

    const message = dialog.querySelector(".note-message");
    const saveButton = document.createElement("button");
    saveButton.className = "note-save-button";
    saveButton.type = "button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
      const updatedContent = editor.value.trim();
      if (!updatedContent) {
        message.textContent = "A note cannot be empty.";
        editor.focus();
        return;
      }

      const previousContent = note.content;
      note.content = updatedContent;
      if (!saveNotes()) {
        note.content = previousContent;
        message.textContent = "Could not save this note in browser storage.";
        return;
      }

      renderNotesInDialog(prompt, list, dialog, triggerButton);
      const updatedItem = [...list.children].find(
        (noteItem) => noteItem.dataset.noteId === note.id,
      );
      updatedItem?.querySelector(".note-edit-button")?.focus();
    });

    const cancelButton = document.createElement("button");
    cancelButton.className = "note-cancel-button";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      renderNotesInDialog(prompt, list, dialog, triggerButton);
      const updatedItem = [...list.children].find(
        (noteItem) => noteItem.dataset.noteId === note.id,
      );
      updatedItem?.querySelector(".note-edit-button")?.focus();
    });

    item.replaceChildren(editor, saveButton, cancelButton);
    editor.focus();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "note-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete note for ${prompt.title}`);
  deleteButton.addEventListener("click", () => {
    const previousNotes = notes;
    notes = notes.filter((savedNote) => savedNote.id !== note.id);
    if (!saveNotes()) {
      notes = previousNotes;
      dialog.querySelector(".note-message").textContent =
        "Could not delete this note from browser storage.";
      return;
    }

    renderNotesInDialog(prompt, list, dialog, triggerButton);
    dialog.querySelector(".note-input").focus();
  });

  actions.append(editButton, deleteButton);
  item.append(content, actions);
  return item;
}

function getVisiblePrompts() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return prompts;

  return prompts.filter(
    (prompt) =>
      prompt.title.toLowerCase().includes(query) ||
      prompt.content.toLowerCase().includes(query),
  );
}

function renderPrompts() {
  promptList.replaceChildren();

  if (prompts.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML =
      '<span class="empty-mark" aria-hidden="true">{ }</span><p>Your saved prompts will live here.</p>';
    promptList.append(emptyState);
    return;
  }

  const visiblePrompts = getVisiblePrompts();

  if (visiblePrompts.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    const message = document.createElement("p");
    message.textContent = "No saved prompts match your search.";
    emptyState.append(message);
    promptList.append(emptyState);
    return;
  }

  visiblePrompts.forEach((prompt) =>
    promptList.append(createPromptCard(prompt)),
  );
}

function savePrompts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    return true;
  } catch {
    formMessage.textContent =
      "Could not save in this browser. Check your storage settings.";
    return false;
  }
}

function deletePrompt(id) {
  const previousPrompts = prompts;
  const previousNotes = notes;
  prompts = prompts.filter((prompt) => prompt.id !== id);
  notes = notes.filter((note) => note.promptId !== id);

  if (savePrompts()) {
    saveNotes();
    if (editingPromptId === id) {
      editingPromptId = null;
      resetComposerMode();
      promptForm.reset();
    }
    renderPrompts();
  } else {
    prompts = previousPrompts;
    notes = previousNotes;
  }
}

function resetComposerMode() {
  const addIcon = document.createElement("span");
  addIcon.setAttribute("aria-hidden", "true");
  addIcon.textContent = "+";
  saveButton.replaceChildren(addIcon, document.createTextNode(" Save prompt"));
  composerTitle.textContent = "New Prompt";
  cancelEditButton.hidden = true;
}

function cancelPromptEdit() {
  editingPromptId = null;
  promptForm.reset();
  formMessage.textContent = "";
  resetComposerMode();
  titleInput.focus();
}

function editPrompt(id) {
  const prompt = prompts.find((savedPrompt) => savedPrompt.id === id);
  if (!prompt) return;

  editingPromptId = id;
  titleInput.value = prompt.title;
  contentInput.value = prompt.content;
  formMessage.textContent = "";
  composerTitle.textContent = "Edit Prompt";
  saveButton.textContent = "Save changes";
  cancelEditButton.hidden = false;
  titleInput.focus();
}

function onRate(promptId, newRating, ratingGroup) {
  const prompt = prompts.find((savedPrompt) => savedPrompt.id === promptId);
  if (
    !prompt ||
    !Number.isInteger(newRating) ||
    newRating < 1 ||
    newRating > 5
  ) {
    return;
  }

  const previousRating = prompt.rating;
  prompt.rating = newRating;

  if (savePrompts()) {
    updateRatingPreview(ratingGroup, newRating);
  } else {
    if (previousRating === undefined) {
      delete prompt.rating;
    } else {
      prompt.rating = previousRating;
    }
    updateRatingPreview(ratingGroup, getPromptRating(prompt));
  }
}

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    formMessage.textContent = "Add a title and prompt before saving.";
    return;
  }

  if (editingPromptId) {
    const prompt = prompts.find(
      (savedPrompt) => savedPrompt.id === editingPromptId,
    );
    if (!prompt) {
      cancelPromptEdit();
      return;
    }

    const previousTitle = prompt.title;
    const previousContent = prompt.content;
    prompt.title = title;
    prompt.content = content;

    if (savePrompts()) {
      editingPromptId = null;
      renderPrompts();
      promptForm.reset();
      resetComposerMode();
      titleInput.focus();
    } else {
      prompt.title = previousTitle;
      prompt.content = previousContent;
    }
    return;
  }

  const prompt = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    title,
    content,
  };

  prompts = [prompt, ...prompts];

  if (savePrompts()) {
    renderPrompts();
    promptForm.reset();
    titleInput.focus();
  } else {
    prompts = prompts.filter((savedPrompt) => savedPrompt.id !== prompt.id);
  }
});

searchInput.addEventListener("input", renderPrompts);

renderPrompts();
