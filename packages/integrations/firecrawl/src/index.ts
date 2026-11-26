/**
 * Server-only Firecrawl academic content ingestion and normalization module.
 * Full extraction pipeline is implemented in Milestone 8.
 */

export interface NormalizedContentSection {
  heading: string;
  markdownContent: string;
  sourceUrl: string;
  wordCount: number;
}

export interface FirecrawlExtractionResult {
  sourceUrl: string;
  title: string;
  rawMarkdown: string;
  sections: NormalizedContentSection[];
  extractedAt: string;
}
