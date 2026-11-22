// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import type {
  ApiError,
  CaptureResponse,
  ProcessingStatus,
} from "@capture/shared";
import { beforeEach, expect, it, vi } from "vitest";
import { bindCaptureForm } from "../../apps/extension/entrypoints/popup/capture-form";

const markup = readFileSync(
  "apps/extension/entrypoints/popup/index.html",
  "utf8",
);
const preview = {
  url: "https://example.com/article",
  title: "Fixture article",
  extractedText: null,
};

function mount(save?: Parameters<typeof bindCaptureForm>[2]) {
  const form = document.querySelector<HTMLFormElement>("#capture-form")!;
  const feedback = document.querySelector<HTMLElement>("#save-status")!;
  const note = form.querySelector("textarea")!;
  const button = form.querySelector<HTMLButtonElement>("button")!;
  const setPreview = bindCaptureForm(form, feedback, save);
  setPreview(preview);
  return { form, feedback, note, button, setPreview };
}

function success(
  processing_status: ProcessingStatus,
  duplicate = false,
): CaptureResponse {
  return {
    article_id: "12345678-1234-4234-8234-123456789abc",
    capture_status: "saved",
    processing_status,
    duplicate,
  };
}

beforeEach(() => {
  document.body.innerHTML = new DOMParser().parseFromString(
    markup,
    "text/html",
  ).body.innerHTML;
});

it("explains Save availability in the current build", () => {
  const { form, button, note } = mount();
  expect(form.hidden).toBe(false);
  expect(button.disabled).toBe(true);
  expect(button.getAttribute("aria-describedby")).toBe("save-availability");
  expect(note.maxLength).toBe(4000);
  expect(
    document.querySelector("#save-availability")?.hasAttribute("hidden"),
  ).toBe(false);
});

it.each([
  ["queued", false, "Saved. Analysis is queued."],
  ["quota_limited", false, "Saved. You’ve reached your analysis limit."],
  ["unsupported", false, "Link saved. Analysis is unavailable for this page."],
  ["ready", true, "This page is already in your library."],
] as const)(
  "announces %s outcomes and replaces the Save button",
  async (status, duplicate, message) => {
    const { button, feedback } = mount(
      vi.fn().mockResolvedValue(success(status, duplicate)),
    );
    button.click();
    await vi.waitFor(() => expect(feedback.textContent).toBe(message));
    expect(button.hidden).toBe(true);
  },
);

it("announces saving, retains the note on error, and restores the Save control", async () => {
  let fail!: (result: ApiError) => void;
  const save = vi.fn(
    () =>
      new Promise<ApiError>((resolve) => {
        fail = resolve;
      }),
  );
  const { form, button, feedback, note } = mount(save);
  expect(button.hasAttribute("aria-describedby")).toBe(false);
  note.value = "Keep this note.";
  button.click();
  expect(form.getAttribute("aria-busy")).toBe("true");
  expect(feedback.textContent).toBe("Saving page…");
  expect(button.disabled).toBe(true);
  button.click();
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({
    url: preview.url,
    title: preview.title,
    source: "chrome_extension",
    extracted_text: undefined,
    personal_note: "Keep this note.",
  });
  fail({ error: { code: "rate_limited", message: "Internal error details" } });
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(feedback.textContent).toBe(
    "Too many saves. Wait a moment and try again.",
  );
  expect(note.value).toBe("Keep this note.");
  expect(form.getAttribute("aria-busy")).toBe("false");
});

it("offers a retry when the save handler fails", async () => {
  const { button, feedback, note, setPreview } = mount(
    vi.fn().mockRejectedValue(new Error("fixture")),
  );
  note.value = "Unsaved note";
  button.click();
  await vi.waitFor(() =>
    expect(feedback.textContent).toBe("Couldn’t save this page. Try again."),
  );
  expect(button.disabled).toBe(false);
  setPreview({ ...preview, url: "https://example.com/next" });
  expect(note.value).toBe("");
  expect(feedback.textContent).toBe("");
});
