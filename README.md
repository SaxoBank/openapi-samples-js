# OpenAPI JavaScript Sample Repository

This repository contains sample files demonstrating OpenAPI interactions in JavaScript that can be run in the browser. Each of the included samples is designed as standalone HTML with vanilla JS and no dependecies.

To try these samples yourself, download/clone this repo and load the HTML files locally, or navigate to [this interactive page](https://saxobank.github.io/openapi-samples-js/) to run the samples directly online.

## Requirements

Samples run against Saxo's simulation environment and require an **access token** in order to function. Saxo provides 24-hour tokens on the [Developer Portal](https://www.developer.saxo/openapi/token/), which is the easiest way to get started with the samples provided here. An account is required to generate a token, which can be created for free.

## Table of Contents

1. Authentication
    - [OAuth2 PKCE Flow example](authentication/oauth2-pkce-flow)
    - [OAuth2 Code Flow example](authentication/oauth2-code-flow)
    - [OAuth2 Implicit Flow example](authentication/oauth2-implicit-flow)
2. Instruments
    - [Instrument Search example](instruments/instrument-search)
    - [Display Positions and Order List](instruments/display-positions-orders)
    - [Retrieve Universe](instruments/instrument-retrieval)
3. Order Placement
    - [Stock order example](orders/stocks)
    - [Option order](orders/options)
    - [Option Strategy](orders/option-strategies)
4. Using websockets
    - [Retrieving order events](websockets/order-events-monitoring)
    - [Monitoring primary status](websockets/primary-monitoring)
5. Batch Requests
    - [Batch Request example](batch-request)
6. Error handling
    - [Error handling](error-handling)
