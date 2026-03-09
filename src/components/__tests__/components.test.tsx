import { describe, it, expect } from "vitest";

describe("SEOHead", () => {
  it("sets document title", async () => {
    // Dynamic import to avoid side effects
    const { default: SEOHead } = await import("@/components/SEOHead");
    const { render } = await import("@testing-library/react");

    render(SEOHead({ title: "Test Title", description: "Test desc" }) as any);

    // SEOHead uses useEffect to set document.title
    await new Promise((r) => setTimeout(r, 50));
    expect(document.title).toBe("Test Title");
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", async () => {
    const { default: ErrorBoundary } = await import("@/components/ErrorBoundary");
    const { render, screen } = await import("@testing-library/react");

    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
