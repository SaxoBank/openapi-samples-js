# Client-side Sample for grouping multiple requests in a single batch

This is a demonstration on how to group requests, to improve performance.

More on batch requests: https://www.developer.saxo/openapi/learn/batching-requests

Saxobank is in the process of migrating to [HTTP/2](https://arstechnica.com/information-technology/2015/02/http2-finished-coming-to-browsers-within-weeks/). In HTTP/2, multiple bidirectional streams are multiplexed over a single TCP connection. Each stream can carry a request/response pair, and multiple requests to a server can be made by using multiple streams.<br />
This defeats the purpose of batching requests for clients supporting HTTP/2. As a result, batch requests become obsolete soon.

Live demo: https://saxobank.github.io/openapi-samples-js/batch-request/