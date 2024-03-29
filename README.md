# OpenAPI JavaScript Sample Repository

This repository contains sample files demonstrating OpenAPI interactions in JavaScript that can be run in the browser. Each of the included samples is designed as standalone HTML with vanilla JS and no dependencies.

To try these samples yourself, download/clone this repo and load the HTML files locally on your browser. You can alternatively navigate to [this interactive page](https://saxobank.github.io/openapi-samples-js/) to select the samples hosted directly online.

## Requirements

Samples run against Saxo's simulation environment and require an **access token** in order to function. Saxo provides 24-hour tokens on the [Developer Portal](https://www.developer.saxo/openapi/token/), which is the easiest way to get started with the samples provided here. An account is required to generate a token, which can be created for free.

## Table of Contents

1. Authentication
   - [OAuth2 Code Flow](authentication/oauth2-code-flow/)
   - [OAuth2 Implicit Flow](authentication/oauth2-implicit-flow/)
   - [JSON Web Token Debugger](authentication/token-explained/)
2. Basics
   - [Basic Api Requests](basics/user-info/)
   - [OpenApi Query Options](basics/query-options/)
   - [Error handling](error-handling/)
   - [Diagnose API connection](basics/diagnostics/)
3. Instruments
   - [Instrument Search](instruments/instrument-search/)
   - [Exchanges and Trading Sessions](instruments/exchanges/)
   - [Extended AssetTypes](instruments/extended-assettypes/)
   - [Currency Conversion](instruments/currency-converter/)
   - [Download Instrument Universe](instruments/instrument-retrieval/)
4. Order Placement
   - [Stock Orders](orders/stocks/)
   - [Option Orders](orders/options/)
   - [Multi-leg Orders](orders/option-strategies/)
   - [Future Orders](orders/futures/)
   - [OCO Orders](orders/oco-orders/)
   - [Algorithmic Orders](orders/algo-orders/)
   - [Conditional or Sleeping Orders](orders/conditional-orders/)
   - [Block Orders](orders/block-orders/)
   - [Regulatory Requirements](orders/regulatory-requirements/)
5. Portfolio
   - [Display positions and orders](portfolio/positions-orders/)
   - [Position netting profiles](portfolio/position-netting-profiles/)
   - [Available Margin](portfolio/margin/)
   - [Downloading Reports](portfolio/download-reports/)
6. Account History
   - [Performance](account-history/performance/)
   - [Unsettled Amounts](account-history/unsettled-amounts/)
7. Using websockets
   - [Monitor Orders and Positions](websockets/order-events-monitoring/)
   - [Monitor TradeLevel Status for Realtime Prices](websockets/primary-monitoring/)
   - [Realtime Quotes](websockets/realtime-quotes/)
   - [Monitor Trade Messages](websockets/trade-messages/)
   - [Historical Market Data](websockets/historical-market-data/)
   - [Options Chain](websockets/options-chain/)
   - [Protobuf protocol](websockets/protobuf/)

## Sample Apps

[Basic Price Streamer](sample-apps/realtime-quotes/): Shows how to display prices for instruments and update them when an update is broadcasted. The connection health is monitored.

[Basic Order Manager](sample-apps/basic-order-manager/): A Vue.js app that runs in the browser, pulls out open orders of the logged-in client and displays them in a Vuetify table with sorting and filtering functionality. Includes a simple order blotter and an implementation of OAuth implicit flow to authenticate with the OpenAPI.

Suggestions? Comments? Reach us via Github or [openapisupport@saxobank.com](mailto:openapisupport@saxobank.com).
