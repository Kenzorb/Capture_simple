# Capture API contracts

These contracts define the capture and article endpoints. Send authenticated requests using a Capture session. The extension uses `Authorization: Bearer <access_token>`. The server derives ownership from that session. Send JSON to endpoints that accept a request body.

## Save a capture

`POST /api/captures` accepts a client-generated UUID in `request_id`. Reuse it when retrying the same save. The URL must use HTTP or HTTPS and contain at most 4,096 characters. `title`, `extracted_text`, and `personal_note` are optional, with limits of 500, 100,000, and 4,000 characters. Use `chrome_extension` for an extension capture or `manual_url` for a pasted URL.

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

A manual save can contain just the request ID, URL, and source.

```json
{
  "request_id": "a047728d-95a5-42ad-bc11-273c54edc241",
  "url": "https://example.com/garden-guide",
  "source": "manual_url"
}
```

A successful call returns the saved article ID. A duplicate returns the existing ID with `duplicate: true`. Usage is optional. Capture remains saved when processing is delayed or unavailable.

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

`GET /api/articles` accepts `limit` from 1 to 100 and defaults to 20. Optional filters are `status`, `domain`, and search query `q`. Sort by `captured_desc` (default) or `captured_asc`. To continue, send the previous `next_cursor` as `cursor` with the same filters and sort. A null cursor means the final page.

For example, `GET /api/articles?limit=20&status=ready&sort=captured_desc` returns a page of ready articles.

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
