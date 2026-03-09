import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import SEOHead from "@/components/SEOHead";

describe("SEOHead", () => {
  it("sets document title via render", async () => {
    render(<SEOHead title="Test Title" description="Test desc" />);
    await new Promise((r) => setTimeout(r, 50));
    expect(document.title).toBe("Test Title");
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
