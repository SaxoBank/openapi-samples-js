# Instrument retrieval

This example downloads all instruments of AssetType Stock, Future and Option.
It respects the default limit of 60 requests per minute.

This example is really only intended for server applications serving many clients concurrently, or scraping books of a lot of instruments. The preferred solution for individual apps would be to use the regular search as shown in the [Search example](https://github.com/SaxoBank/openapi-samples-js/tree/main/instruments/instrument-search).

Live demo: https://saxobank.github.io/openapi-samples-js/instruments/instrument-retrieval/
