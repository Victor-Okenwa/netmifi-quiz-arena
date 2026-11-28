# External Integration Rules (`packages/integrations`)

## Rule 6: Firecrawl and ElevenLabs Integration Rules

### 6.1 Firecrawl (`packages/integrations/firecrawl`) — Question Factory Ingestion

1. **Server-Only & Pipeline Separation**:
   - Keep `FIRECRAWL_API_KEY` strictly server-side.
   - Firecrawl is responsible only for **extracting and normalizing academic source content** (`SOURCE URL → FIRECRAWL → NORMALIZATION`). Keep AI draft question generation and database persistence decoupled.
2. **URL Validation, SSRF & Crawl Bounds**:
   - Validate all source URLs before calling Firecrawl: allow only `https://`, reject localhost/private IPv4/IPv6 ranges, and restrict to permitted educational domains where configured.
   - Default to single-page scrape (`scrapeUrl`) for targeted pages; when crawling (`crawlUrl`), always enforce strict `maxDepth` and `limit` caps.
3. **Asynchronous Job Lifecycle & Human Review**:
   - Track ingestion through persistent job states (`pending → crawling → processing → generating → review_required → completed / failed`).
   - **Never auto-publish AI-generated questions directly to live battles.** All generated questions must enter `draft` / `review_required` status and require explicit administrator/reviewer approval before becoming eligible for battles.
   - Preserve source attribution (`source_url`, `source_title`, `course_id`, `topic_id`) on every generated question.

### 6.2 ElevenLabs (`packages/integrations/elevenlabs`) — Voice Quiz & Announcements

1. **Server-Only & Deterministic Caching**:
   - Keep `ELEVENLABS_API_KEY` strictly server-side.
   - Compute a deterministic content hash (`sha256(text + voiceId + modelId)`) before requesting TTS generation.
   - If an audio record with a matching hash already exists in PostgreSQL/Supabase Storage, return the cached storage URL instead of calling ElevenLabs again.
2. **Storage & Non-Blocking Fallbacks**:
   - Upload generated audio buffers to **Supabase Storage** and store only the storage path, voice ID, content hash, and status in PostgreSQL.
   - Never block battle progression or result finalization on ElevenLabs API latency or failures; always degrade gracefully to text display in the UI.
   - Question audio must match the approved question text verbatim without leaking hints or answers.
