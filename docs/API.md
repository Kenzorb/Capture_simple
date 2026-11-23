# Capture API contracts

These contracts define the capture and article endpoints. Send authenticated requests using a Capture session. The extension uses `Authorization: Bearer <access_token>`. The server derives ownership from that session. Send JSON to endpoints that accept a request body.

## Save a capture

`POST /api/captures` accepts a client-generated UUID in `request_id`. Reuse it when retrying the same save. The URL must use HTTP or HTTPS and contain at most 4,096 characters. `title`, `extracted_text`, and `personal_note` are optional, with limits of 500, 100,000, and 4,000 characters. Use `chrome_extension` for an extension capture or `manual_url` for a pasted URL.

Capture accepts uncompressed JSON up to 128 KiB. The URL and extracted text are independently limited to 4,096 and 100,000 UTF-8 bytes. Oversized requests return HTTP 413. The dashboard and API share a budget of 20 saves per account per minute, including duplicate requests. If the budget is exhausted, the API returns HTTP 429 with a `Retry-After` header in seconds.

```json
{
  "request_id": "7a985dde-9cb2-42ec-b2c4-e7499466d159",
  "url": "https://example.com/rest-api-guide",
  "title": "A Guide to REST APIs",
  "extracted_text": "Cleaned article text",
  "source": "chrome_extension",
  "personal_note": "Reference for the backend project."
}
```

A manual save can contain just the request ID, URL, and source. Use an HTTP or HTTPS URL with a public domain name. Capture saves the link immediately and does not contact the site during the save.

```json
{
  "request_id": "a047728d-95a5-42ad-bc11-273c54edc241",
  "url": "https://example.com/garden-guide",
  "source": "manual_url"
}
```

A first save returns HTTP 201 and the saved article ID. A duplicate returns HTTP 200, the existing ID, and `duplicate: true`. Reusing a request ID for another canonical URL returns HTTP 409. Usage is optional. Capture remains saved when processing is delayed or unavailable.

Capture compares canonical URLs for duplicates. It removes known tracking parameters and ordinary section anchors while preserving other query parameters and hash routes such as `#/docs`. It keeps the submitted source URL and leaves short links as separate URLs until the actual destination is known.

```json
{
  "article_id": "a047728d-95a5-42ad-bc11-273c54edc241",
  "capture_status": "saved",
  "processing_status": "queued",
  "duplicate": false,
  "usage": { "used": 7, "reserved": 1, "limit": 20 }
}
```

Processing statuses are `saved`, `queued`, `processing`, `ready`, `failed`, `quota_limited`, and `unsupported`.

## List articles

`GET /api/articles` accepts `limit` from 1 to 100 and defaults to 20. Optional filters are `status`, `domain`, direct membership in a topic by UUID (`topic`), and keyword search `q`. Sort by `captured_desc` (default) or `captured_asc`. To continue, send the previous `next_cursor` as `cursor` with the same filters and sort. A null cursor means the final page.

For example, `GET /api/articles?limit=20&status=ready&sort=captured_desc` returns a page of ready articles.

`GET /api/search?q=...` uses the same response, filters, and cursor. The query is required and accepts up to 200 characters. It matches the user's capture titles, AI summaries and concept names, personal notes, and assigned topic names. Matching is case-insensitive. Quoted phrases and `OR` are supported, and at least one positive term is required to return results.

The list returns active articles by default. Use `archived=true` to list archived articles. Archived articles remain accessible by ID.

```json
{
  "articles": [
    {
      "id": "a047728d-95a5-42ad-bc11-273c54edc241",
      "url": "https://example.com/garden-guide",
      "title": "Planning a garden",
      "domain": "example.com",
      "author": null,
      "published_at": null,
      "captured_at": "2026-11-22T06:00:00Z",
      "archived_at": null,
      "status": "ready"
    }
  ],
  "next_cursor": null
}
```

## Read an article

`GET /api/articles/:id` accepts the UUID of an article owned by the caller. It returns the article, personal note, and assigned topics. Missing articles and articles owned by someone else return HTTP 404.

Use `article.status` to check processing progress. A new eligible capture transitions from `queued` to `processing`, then to `ready`, `failed`, or `unsupported`. Captures without an eligible job can be `saved`, `quota_limited`, or `unsupported`. Failed captures remain in the library. This response uses `Cache-Control: private, no-store` and contains no worker execution IDs or error details.

The `ai_note` field contains the latest validated structured note or `null` when no note is available. The `personal_note` field stays separate. A new publication attaches one primary topic and can attach additional existing topics. The primary uses an existing manual choice, the first usable suggested path, or Unsorted.

```json
{
  "article": {
    "id": "a047728d-95a5-42ad-bc11-273c54edc241",
    "url": "https://example.com/garden-guide",
    "title": "Planning a garden",
    "domain": "example.com",
    "author": null,
    "published_at": null,
    "captured_at": "2026-11-22T06:00:00Z",
    "archived_at": null,
    "status": "ready"
  },
  "personal_note": "Use this for spring planting.",
  "topics": []
}
```

## Edit or delete an article

`PATCH /api/articles/:id` accepts any combination of `title`, `personal_note`, and `archived`. Omitted fields retain their existing values. Set `personal_note` to null to remove it, and set `archived` to false to restore an archived article. A successful edit returns HTTP 204.

```json
{
  "title": "Planning a spring garden",
  "personal_note": null,
  "archived": false
}
```

`DELETE /api/articles/:id` permanently removes the article and associated content and personal data. Confirm with the user before sending the request. It requires a JSON body with `confirmed` set to true and returns HTTP 204 on success. Missing or unowned articles return HTTP 404 for both operations.

```json
{ "confirmed": true }
```

## Manage the topic tree

`GET /api/topics` returns `{"topics":[]}` with the complete set of topics owned by the caller. Each topic includes `id`, `parent_id`, `name`, `description`, `created_at`, and `article_count`, which counts active articles directly linked to that topic. A null parent identifies a root.

`POST /api/topics` creates a topic and returns HTTP 201 with `{"topic":{...}}`. Send `name` and optionally `description` and `parent_id`. `PATCH /api/topics/:id` accepts any of the same fields and returns the updated topic. Set `parent_id` to null to move a topic to the root, or `description` to null to clear it.

Names are unique within each parent, including the root, with case and surrounding whitespace ignored. Roots count as level one and the maximum depth is four. A move must keep the whole subtree within the depth limit. A topic cannot move under itself, one of its descendants, or another account's topic.

`DELETE /api/topics/:id` removes a leaf and returns HTTP 204. Articles assigned to the deleted topic stay in the library. Move child topics before deleting their parent. Unknown or foreign topic IDs return HTTP 404.

## Export the library

`GET /api/export?format=json` downloads the authenticated user's library. Use `format=markdown` to download Markdown. JSON is the default and contains versioned `topics` and `articles` collections. Both formats include active and archived captures, source URLs, AI notes, personal notes, topic assignments, and capture timestamps. The server streams the download in pages.

## Monthly processing allowance

`GET /api/usage` returns the signed-in account's effective `plan`, `used`, `reserved`, `article_limit`, `next_reset` timestamp, and `manual_retry_limit`. An account without a current usage row has zero used and reserved units. The read does not create a usage period.

Processing allowances start at 00:00 UTC on the first day of each calendar month. The first processing request in a new month creates its usage period. Free allows 20 analyses, and an eligible Pro subscription allows 300 even when its billing term is annual. Eligibility requires an active or trialing Pro subscription with a billing end time after the request. Cancellation scheduled for the end of the term keeps Pro access until then.

An upgrade increases the current month's allowance and retains usage. A downgrade retains completed analyses and pending reservations and blocks new reservations once the Free allowance is reached. Jobs that finish after the reset settle against the period that reserved them.

Deleting a queued capture releases its reserved allowance. Deleting a processed capture retains the allowance already used. Its usage event retains only quota metadata after the capture and its job are deleted.

At the limit, capture still succeeds with `processing_status: "quota_limited"`. Its detail page shows the reset date. The owner can use **Analyze capture** once allowance is available. Each request checks quota on the server before creating a processing job.

## Errors

Use the HTTP status and machine-readable code. The error may echo a valid request ID.

| HTTP | Error code          |
| ---- | ------------------- |
| 400  | `invalid_input`     |
| 401  | `unauthenticated`   |
| 403  | `forbidden`         |
| 404  | `not_found`         |
| 409  | `conflict`          |
| 413  | `payload_too_large` |
| 429  | `rate_limited`      |
| 500  | `internal_error`    |
| 503  | `unavailable`       |

```json
{
  "error": {
    "code": "invalid_input",
    "message": "Enter a valid HTTP or HTTPS URL.",
    "request_id": "7a985dde-9cb2-42ec-b2c4-e7499466d159"
  }
}
```
