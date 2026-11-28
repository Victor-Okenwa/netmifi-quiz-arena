import { describe, expect, it } from "bun:test";
import { isSafeIngestionUrl } from "@repo/validators";
import { extractAcademicContent, normalizeMarkdownSections } from "./index";

describe("Milestone 8: Firecrawl & Question Factory Pipeline", () => {
  it("rejects malicious, private, and loopback URLs (SSRF protection)", () => {
    const malicious = [
      "http://example.com/unencrypted",
      "https://localhost:3000",
      "https://127.0.0.1/admin",
      "https://10.0.0.1/internal",
      "https://192.168.1.1/router",
      "https://169.254.169.254/latest/meta-data",
      "https://internal-db.local",
    ];

    for (const url of malicious) {
      expect(isSafeIngestionUrl(url)).toBe(false);
    }
  });

  it("approves valid public HTTPS URLs", () => {
    expect(
      isSafeIngestionUrl("https://en.wikipedia.org/wiki/Binary_search_tree"),
    ).toBe(true);
    expect(
      isSafeIngestionUrl(
        "https://ocw.mit.edu/courses/electrical-engineering-and-computer-science",
      ),
    ).toBe(true);
  });

  it("normalizes raw Markdown into discrete syllabus sections", () => {
    const sampleMarkdown = `
# Data Structures: Trees

Trees are hierarchical data structures consisting of nodes connected by edges.

## Binary Search Trees

A binary search tree maintains the invariant that left subtree keys are less than the parent node.

## AVL Trees

AVL trees are self-balancing binary search trees where the difference between heights of left and right subtrees is at most one.
    `.trim();

    const sections = normalizeMarkdownSections(
      sampleMarkdown,
      "https://example.com/trees",
    );

    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0]?.heading).toContain("Trees");
    expect(sections[0]?.wordCount).toBeGreaterThan(0);
  });

  it("extracts academic content gracefully with educational fallback when API key is simulated", async () => {
    const result = await extractAcademicContent({
      url: "https://en.wikipedia.org/wiki/Binary_search_tree",
      timeoutMs: 5000,
      fallbackToEducationalParser: true,
    });

    expect(result.sourceUrl).toBe(
      "https://en.wikipedia.org/wiki/Binary_search_tree",
    );
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.rawMarkdown.length).toBeGreaterThan(50);
  });
});
