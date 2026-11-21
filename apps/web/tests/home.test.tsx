// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import HomePage from "../app/(marketing)/page";

afterEach(cleanup);

test("the landing page presents a sign-in link", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", { name: "Capture what you learn." }),
  ).toBeDefined();
  expect(
    screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
  ).toBe("/sign-in");
});
