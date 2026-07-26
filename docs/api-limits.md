# API limits

Public list endpoints cap client-supplied pagination. Invalid numeric params
return `400`; finite values above the max are clamped.

| Endpoint | Default | Max | Notes |
| --- | ---: | ---: | --- |
| `GET /api/classes` | 25 | 100 | Cursor pagination (#412): pass `cursor` from the prior response's `nextCursor`. Response is `{ rows, nextCursor, hasMore }`; no `total`. `offset` is removed and returns `400`; a malformed `cursor` also returns `400`. |
| `GET /api/admin/aliases` | 50 | 200 | Editor-only route; uses the same parser. |

`GET /api/classes?room_code=...` still returns the bounded room schedule payload
for one room.
