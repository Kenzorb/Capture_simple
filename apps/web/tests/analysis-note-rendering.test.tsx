// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { AnalysisNotes } from "../app/(dashboard)/dashboard/captures/[id]/analysis-notes";

afterEach(cleanup);

test("analysis note markup remains visible as text", () => {
  const summary = "<em>Source formatting</em>";
  const { container } = render(
    <AnalysisNotes
      status="ready"
      note={{
        schema_version: 1,
        model: "fixture",
        language: "en",
        summary,
        key_takeaways: ["<strong>Source takeaway</strong>"],
        sections: [],
        concepts: [],
        tags: [],
        suggested_topic_paths: [],
      }}
    />,
  );

  expect(screen.getByText(summary)).toBeDefined();
  expect(container.querySelector("em, strong")).toBeNull();
});
