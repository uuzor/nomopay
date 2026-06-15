# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> shopify import API handles bad domain gracefully
- Location: tests/smoke.spec.ts:115:5

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED ::1:3001
Call log:
  - → POST http://localhost:3001/api/shopify-import
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - Content-Type: application/json
    - content-length: 57

```