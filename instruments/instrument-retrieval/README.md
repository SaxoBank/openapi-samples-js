# Instrument retrieval

This example downloads all instruments of AssetType Stock, Future and Option.
It respects the default limit of 60 requests per minute.

This example is really only intended for server applications serving many clients concurrently, or scraping books of a lot of instruments. The preferred solution for individual apps would be to use the regular search as shown in the [Search example](https://github.com/SaxoBank/openapi-samples-js/tree/master/instruments/instrument-search).

### Instructions for running the sample

1. Download and copy the three files to your local machine.

2. Open `index.html` in a browser (double click).

3. Get a token and paste it in the edit box.

4. Use the button *Start collecting* to run the example.
