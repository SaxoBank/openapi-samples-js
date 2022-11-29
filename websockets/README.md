# <a name="documentation"></a>Client-side Samples for Websocket feeds

This document describes how a client application can subscribe to Saxo Bank's Event Notification Service (ENS).

Examples on
- [Order Events Monitoring (ENS)](order-events-monitoring)
- [Realtime Quotes](realtime-quotes)
- [Primary Session Monitoring](primary-monitoring)
- [Options Chain](options-chain)
- [Trade Messages](trade-messages)
- [Historical Market Data (Charts)](historical-market-data)
- [Protobuf](protobuf)
- [Corporate Action Events](corporateaction-events-monitoring)

## Table of contents

[Get realtime data using the Saxo API](#realtime)\
[Step 1: Connect to the feed](#realtime1)\
[Step 2: Handle connection events](#realtime2)\
[Step 3: Subscribe to updates](#realtime3)\
[Step 4: Handling events](#realtime4)\
[Step 5: Extend the subscription before the token expires](#realtime5)\
[Step 6: Description of the data](#realtime6)\
[Step 7: Adding a netpositions subscription](#realtime7)\
[Whats next: things to keep in mind](#realtime8)

## <a name="realtime"></a>Get realtime data using the Saxo API

This document describes the realtime feed available for customers.

Native (plain) web sockets are used. Examples in JavaScript.

> The WebSocket API is an advanced technology that makes it possible to open a two-way interactive communication session between the user's browser and a server. With this API, you can send messages to a server and receive event-driven responses without having to poll the server for a reply.

[More info](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)

Prerequisites:

- An access token retrieved using the OAuth2 Authentication flow, as described in the [Saxo documentation](https://www.developer.saxo/openapi/learn/security).

For this example we use the simulation (sandbox/SIM) environment, with predefined test users and passwords. A user can be created on [Saxo's Developer Portal](https://www.developer.saxo/accounts/sim/signup) for testing.

### <a name="realtime1"></a>Step 1: Connect to the feed

The WebSocket API can be used in JavaScript by any modern browser.

The following code creates and starts a connection:

```javascript
    const accessToken = " // paste access token here
    const contextId = encodeURIComponent("MyApp" + Date.now());
    const streamerUrl = "wss://streaming.saxobank.com/sim/openapi/streamingws/connect?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
    const connection = new WebSocket(streamerUrl);
    console.log("Connection created. Status: " + connection.readyState);
```

**accessToken** –  The bearer token, also known as the access token, as provided by the Saxo SSO.

**contextId** - A client-generated unique identifier for the connection. May be up to 50 characters allowing (a-z, A-Z, -, and _). A client application might have multiple connections, identified by different contextIds, but, as you will learn later in this document, one is usually enough per user, as multiple subscriptions can target the same connection.

More info about the setup at Saxo: <https://www.developer.saxo/openapi/learn/plain-websocket-streaming>.

### <a name="realtime2"></a>Step 2: Handle connection events

The javascript connection handler implements the following named eventlisteners:

* **onopen** - emitted right after the connection has been created succesfully
* **onclose** - emitted if the connection, for some reason, is being closed
* **onerror** - emitted of any kind of error has occured
* **onmessage** - emitted on each message - with the actual content - recieved from the server 

The following code configures the events:

```javascript
    connection.onopen = function () {
        console.log("Streaming connected.");
    };
    connection.onclose = function () {
        console.log("Streaming disconnected.");
    };
    connection.onerror = function (evt) {
        console.error(evt);
    };
    connection.onmessage = function (event) {
        console.log("Streaming message received: " + event.data);
    };
```

### <a name="realtime3"></a>Step 3: Subscribe to updates

An 'empty' streaming websocket connection is now configured. In order to subscribe to events to be sent on this connection, you need to create a subscription with a POST request to Saxo's OpenAPI. This is an example to subscribe to order events:

```javascript
    const data = {
        "ContextId": contextId,
        "ReferenceId": "orders",
        "Arguments": {
            "AccountKey": accountKey,
            "Activities": [
                "AccountDepreciation",
                "AccountFundings",
                "CorporateActions",
                "MarginCalls",
                "Orders",
                "PositionDepreciation",
                "Positions"
            ],
            "FieldGroups": [
                "DisplayAndFormat",
                "ExchangeInfo"
            ]
        }
    };

    fetch("https://gateway.saxobank.com/sim/openapi/ens/v1/activities/subscriptions", {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + accessToken
        },
        "body": JSON.stringify(data)
    });
```

**contextId** – The client-generated unique identifier for the connection (so the server can determine the target connection)\
**referenceId** – The client-generated unique reference for the subscription; can be used to identify incoming messages as every event has a referenceId; can be used to do further actions on the subscription, ie. delete it - system event referenceIds are prefixed by an underscore, so better not start with an underscore \
**clientKey** – The key identifying the customer\
**accountKey** – The key identifying the account\
**accessToken** – The Bearer token

That’s it. The application is now ready to receive order update messages.

More info about this endpoint: <https://www.developer.saxo/openapi/referencedocs/service?apiVersion=v1&serviceGroup=ens&service=client%20activities>. There you'll read about setting up a refresh rate and how to get (older) snapshot data.

### <a name="realtime4"></a>Step 4: Handling events

#### Receiving order events

The order events are published when there is a change in portfolio positions, orders or cash balances.

As described above, events are received in the onmessage handler:

```javascript
    /**
     * Parse the incoming messages. Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
     * @param {Object} data The received stream message
     * @returns {Array.<Object>} Returns an array with all incoming messages of the frame
     */
    function parseMessageFrame(data) {
        const message = new DataView(data);
        const parsedMessages = [];
        let index = 0;
        let messageId;
        let referenceIdSize;
        let referenceIdBuffer;
        let referenceId;
        let payloadFormat;
        let payloadSize;
        let payloadBuffer;
        let payload;
        while (index < data.byteLength) {
            /* Message identifier (8 bytes)
             * 64-bit little-endian unsigned integer identifying the message.
             * The message identifier is used by clients when reconnecting. It may not be a sequence number and no interpretation
             * of its meaning should be attempted at the client.
             */
            messageId = fromBytesLe(new window.Uint8Array(data, index, 8));
            index += 8;
            /* Version number (2 bytes)
             * Ignored in this example. Get it using 'messageEnvelopeVersion = message.getInt16(index)'.
             */
            index += 2;
            /* Reference id size 'Srefid' (1 byte)
             * The number of characters/bytes in the reference id that follows.
             */
            referenceIdSize = message.getInt8(index);
            index += 1;
            /* Reference id (Srefid bytes)
             * ASCII encoded reference id for identifying the subscription associated with the message.
             * The reference id identifies the source subscription, or type of control message (like '_heartbeat').
             */
            referenceIdBuffer = new window.Int8Array(data, index, referenceIdSize);
            referenceId = String.fromCharCode.apply(String, referenceIdBuffer);
            index += referenceIdSize;
            /* Payload format (1 byte)
             * 8-bit unsigned integer identifying the format of the message payload. Currently the following formats are defined:
             *  0: The payload is a UTF-8 encoded text string containing JSON.
             *  1: The payload is a binary protobuffer message.
             * The format is selected when the client sets up a streaming subscription so the streaming connection may deliver a mixture of message format.
             * Control messages such as subscription resets are not bound to a specific subscription and are always sent in JSON format.
             */
            payloadFormat = message.getUint8(index);
            index += 1;
            /* Payload size 'Spayload' (4 bytes)
             * 32-bit unsigned integer indicating the size of the message payload.
             */
            payloadSize = message.getUint32(index, true);
            index += 4;
            /* Payload (Spayload bytes)
             * Binary message payload with the size indicated by the payload size field.
             * The interpretation of the payload depends on the message format field.
             */
            payloadBuffer = new window.Uint8Array(data, index, payloadSize);
            payload = null;
            switch (payloadFormat) {
            case 0:
                // JSON
                try {
                    payload = JSON.parse(utf8Decoder.decode(payloadBuffer));
                } catch (error) {
                    console.error(error);
                }
                break;
            case 1:
                // ProtoBuf
                payload = parserProtobuf.parse(payloadBuffer, schemaName);
                break;
            default:
                console.error("Unsupported payloadFormat: " + payloadFormat);
            }
            if (payload !== null) {
                parsedMessages.push({
                    "messageId": messageId,
                    "referenceId": referenceId,
                    "payload": payload
                });
            }
            index += payloadSize;
        }
        return parsedMessages;
    }

    connection.onmessage = function (messageFrame) {
        const messages = parseMessageFrame(messageFrame.data);
        messages.forEach(function (message) {
            switch (message.referenceId) {
            case "_heartbeat":
                // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                console.debug("Heartbeat event " + message.messageId + " received: " + JSON.stringify(message.payload));
                break;
            case "_resetsubscriptions":
                // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                // The server is not able to send messages and client needs to reset subscriptions by recreating them.
                console.error("Reset Subscription Control messsage received! Reset your subscriptions by recreating them.\n\n" + JSON.stringify(message.payload, null, 4));
                break;
            case "_disconnect":
                // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                // The server has disconnected the client. This messages requires you to re-authenticate if you wish to continue receiving messages.
                console.error("The server has disconnected the client! Refresh the token.\n\n" + JSON.stringify(message.payload, null, 4));
                break;
            default:
                if (message.referenceId === "orders") {
                    console.log("Order update event " + message.messageId + " received in bundle of " + messages.length + ":\n" + JSON.stringify(message.payload, null, 4));
                } else {
                    console.error("No processing implemented for message with reference " + message.referenceId);
                }
            }
        });
    };
```

The message format is described here: <https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages>.

### <a name="realtime5"></a>Step 5: Extend the subscription before the token expires

The streaming connection will stop when the client disconnects or at the end of the token's expiry. When the client application has refreshed the token using Saxo's standard OAuth refresh flow, any existing streaming connections should be updated with the same token to prevent interruption of the service.

Extend the subscription using this code:

```javascript
    fetch("https://gateway.saxobank.com/sim/openapi/streamingws/authorize?contextid=" + contextId, {
        "method": "PUT",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + accessToken
        }
    });
```

**contextId** – The identifyer of the connection (so the server can determine the target connection)\
**accessToken** – The (new) Bearer token

### <a name="realtime6"></a>Step 6: Description of the data

Besides the order events the server sends the following control messages: heartbeats (referenceId: \_heartbeat), disconnect events (\_disconnect) and data-clear-events (\_resetsubscriptions).

More info: <https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages>.

#### Order-object

An order object is structured as following:

```javascript
{
    AccountId: "123",
    ActivityTime: "2020-01-27T14:57:03.917000Z",
    ActivityType: "Orders",
    Amount: 100,
    ​AssetType: "Stock",
    ​BuySell: "Buy",
    ​ClientId: "456",
    ​CorrelationKey: "b52fffbf-be1b-445a-a253-35360df2c31f",
    ​DisplayAndFormat: {
        Currency: "EUR",
        Decimals: 2,
        Description: "Danone",
        OrderDecimals: 2,
​​        Symbol: "BN:xpar"
    },
    ​Duration: {
        DurationType: "DayOrder"
    },
    ​ExchangeInfo: {
        ExchangeId: "PAR"
    },
    ​HandledBy: "789",
    ​OrderId: "1234",
    ​OrderRelation: "StandAlone",
    ​OrderType: "Limit",
    ​Price: 60,
    ​SequenceId: "5678",
    ​Status: "Placed",
    ​SubStatus: "Confirmed",
    ​Symbol: "BN:xpar",
    ​Uic: 112809
}
```

### <a name="realtime7"></a>Adding a netpositions subscription

Next, we need to create a netpositions subscripition, which will provide us with:
1. A snapshot of the client's current positions, which includes *all* data for each netposition. This is similar to sending a GET request to the `/netpositions/me` endpoint.
2. Delta updates whenever individual datapoints for each position change (think: current P&L, conversion rate for instruments in currencies different from the client's account currency, etc).

The below code is very similar to the code in step 3. This new subscription will be streaming updates on the **same** websocket connection. Note that the `AccountKey` field is optional: if it is *not* provided, netpositions for ALL of the client accounts will be streamed (this is likely what you want if you are looking to provide a 'complete overview' in your UI).

```javascript
    const data = {
        "ContextId": contextId,
        "ReferenceId": "netpositions",
        "Arguments": {
            "ClientKey": clientKey,
            "AccountKey": accountKey
        }
    };

    fetch("https://gateway.saxobank.com/sim/openapi/port/v1/netpositions/subscriptions", {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + accessToken
        },
        "body": JSON.stringify(data)
    });
```

The response of the POST request includes the snapshot, with "full" details on the current state of the client's netpositions (not shown here to keep this short). Delta messages only include fields that actually change, which means a real-time representation of the client's portfolio can be created by combining these:

```javascript
    "Data": [{
        "NetPositionId": "EURJPY__FxSpot",
        "NetPositionView": {
            "Ask": 120.018,
            "Bid": 119.983,
            "ConversionRateCurrent": 0.0083333,
            "CurrentPrice": 119.983,
            "MarketValue": -37005000,
            "MarketValueInBaseCurrency": -308373.77,
            "ProfitLossOnTrade": -37005000,
            "ProfitLossOnTradeInBaseCurrency": -308373.77,
            "TradeCostsTotal": -181798,
            "TradeCostsTotalInBaseCurrency": -1514.98
        }
    }]
```

Note the `ConversionRateCurrent` field, which can be used to convert instrument P&L to client account currency P&L (in this case for a JPY-denominated FX position on a USD account).

### <a name="realtime8"></a>Whats next: things to keep in mind

#### Using protobuf
We want to encourage people to use protobuf, as it has less impact on our infrastructure.
