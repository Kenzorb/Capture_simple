import {
  maxPersonalNoteLength,
  type ApiError,
  type CaptureRequest,
  type CaptureResponse,
  type ProcessingStatus,
} from "@capture/shared";

type Preview = { url: string; title: string; extractedText: string | null };
type CaptureDraft = Omit<CaptureRequest, "request_id">;
type SaveCapture = (draft: CaptureDraft) => Promise<CaptureResponse | ApiError>;

const savedMessages: Record<ProcessingStatus, string> = {
  saved: "Saved to your library.",
  queued: "Saved. Analysis is queued.",
  processing: "Saved. Analysis is in progress.",
  ready: "Saved. Notes are ready.",
  failed: "Saved. Analysis failed. Open your library for details.",
  quota_limited: "Saved. You’ve reached your analysis limit.",
  unsupported: "Link saved. Analysis is unavailable for this page.",
};

const errorMessages: Partial<Record<ApiError["error"]["code"], string>> = {
  unauthenticated: "Reopen the popup and reconnect Capture to save.",
  forbidden: "Check your Capture connection, then try again.",
  invalid_input: "Capture the page again, then try saving.",
  payload_too_large:
    "This capture is too large. Try saving the URL from your library.",
  rate_limited: "Too many saves. Wait a moment and try again.",
};
const saveError = "Couldn’t confirm the save. Try again.";

export function bindCaptureForm(
  form: HTMLFormElement,
  feedback: HTMLElement,
  saveCapture?: SaveCapture,
  articleHref?: (id: string) => string,
) {
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const note = form.querySelector<HTMLTextAreaElement>("textarea")!;
  const noteDisclosure = form.querySelector("details")!;
  const availability = form.querySelector<HTMLElement>("#save-availability")!;
  const articleLink = form.querySelector<HTMLAnchorElement>("#saved-article")!;
  let page: Preview | null = null;
  let submitting = false;

  note.maxLength = maxPersonalNoteLength;
  availability.hidden = Boolean(saveCapture);
  if (saveCapture) button.removeAttribute("aria-describedby");

  function setPage(next: Preview | null) {
    page = next;
    submitting = false;
    form.reset();
    form.hidden = next === null;
    form.setAttribute("aria-busy", "false");
    noteDisclosure.open = false;
    noteDisclosure.hidden = false;
    note.disabled = false;
    button.hidden = false;
    button.disabled = next === null || !saveCapture;
    articleLink.hidden = true;
    articleLink.removeAttribute("href");
    feedback.textContent = "";
  }

  async function submit() {
    if (!page || !saveCapture || submitting || button.disabled) return;
    const selected = page;
    const personalNote = note.value.replace(/\r\n?/g, "\n");
    const keyboardFocus = document.activeElement === button;
    submitting = true;
    button.disabled = note.disabled = true;
    form.setAttribute("aria-busy", "true");
    feedback.textContent = "Saving page…";
    let saved = false;
    try {
      const result = await saveCapture({
        url: selected.url,
        title: selected.title,
        source: "chrome_extension",
        extracted_text: selected.extractedText ?? undefined,
        personal_note: personalNote.trim() ? personalNote : undefined,
      });
      if (page !== selected) return;
      if ("error" in result) {
        feedback.textContent = errorMessages[result.error.code] ?? saveError;
      } else {
        feedback.textContent = result.duplicate
          ? "This page is already in your library."
          : savedMessages[result.processing_status];
        saved = true;
        if (articleHref) {
          articleLink.href = articleHref(result.article_id);
          articleLink.hidden = false;
        }
      }
    } catch {
      if (page === selected) feedback.textContent = saveError;
    } finally {
      if (page === selected) {
        submitting = false;
        form.setAttribute("aria-busy", "false");
        button.disabled = note.disabled = saved;
        button.hidden = saved;
        if (saved) noteDisclosure.hidden = true;
        if (
          keyboardFocus &&
          (document.activeElement === document.body ||
            document.activeElement === button)
        ) {
          if (!articleLink.hidden) articleLink.focus();
          else if (saved) feedback.focus();
          else button.focus();
        }
      }
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit();
  });

  return setPage;
}
