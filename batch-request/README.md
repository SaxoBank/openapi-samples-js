# Client-side Sample for grouping multiple requests in a single batch

For clients not supporting [HTTP/2](https://http2.akamai.com/), but the slower HTTP/1.1, request grouping is one of the 'best practises' to improve performance.

This is a demonstration on how to group requests, if you support this as a fallback.

Examples on
- [Batch Request](index.html)
- [Batch Request Decomposer](batch-request-decomposer)

More on batch requests: <https://www.developer.saxo/openapi/learn/batching-requests>

Interactive demo: <https://saxobank.github.io/openapi-samples-js/batch-request/>
