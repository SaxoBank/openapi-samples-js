# <a name="documentation"></a>Client-side Samples for monitoring order status events

This document describes how a client application can subscribe to Saxo Bank's Event Notification Service (ENS).

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
    var accessToken = // paste access token here
    var contextId = encodeURIComponent("MyApp" + Date.now());
    var streamerUrl = "wss://gateway.saxobank.com/sim/openapi/streamingws/connect?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
    var connection = new WebSocket(streamerUrl);
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
        console.log("Streaming connected");
    };
    connection.onclose = function () {
        console.log("Streaming disconnected");
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
    var data = {
        "ContextId": contextId,
        "ReferenceId": "orders",
        "Arguments": {
            "ClientKey": clientKey,
            "AccountKey": accountKey,
            "Activities": [
                "AccountFundings",
                "Orders"
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
    function parseStreamingMessage(data) {
        try {
            var message = new DataView(data);
            var bytes = new Uint8Array(data);
            var messageId = message.getInt8();
            var refBeginIndex = 10;
            var refIdLength = message.getInt8(refBeginIndex);
            var refId = String.fromCharCode.apply(String, bytes.slice(refBeginIndex + 1, refBeginIndex + 1 + refIdLength));
            var payloadBeginIndex = refBeginIndex + 1 + refIdLength;
            var payloadLength = message.getUint32(payloadBeginIndex + 1, true);
            var segmentEnd = payloadBeginIndex + 5 + payloadLength;
            var payload = String.fromCharCode.apply(String, bytes.slice(payloadBeginIndex + 5, segmentEnd));
            var block = JSON.parse(payload);
            console.log("Message " + messageId + " parsed with referenceId " + refId + " and payload: " + payload);
            block.ReferenceId = refId;
            block.MessageID = messageId;
            switch (refId) {
            case "orders":
                console.log("Order event to be processed:");
                console.log(block[0]);
                break;
            default:
                console.log("No processing implemented for message with reference " + refId);
            }
            return {
                "segmentEnd": segmentEnd,
                "messages": block
            };
        } catch (error) {
            console.error("Parse message failed: " + error);
        }
    }

    connection.onmessage = function (event) {
        var reader = new FileReader();
        console.log("Streaming message received");
        reader.readAsArrayBuffer(event.data);
        reader.onloadend = function () {
            var beginAt = 0;
            var data = reader.result;
            var parsedMessage;
            do {
                parsedMessage = parseStreamingMessage(data);
                beginAt = parsedMessage.segmentEnd;
                data = data.slice(beginAt);
            } while (data.byteLength > 0);
            console.log(parsedMessage);
        };
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
    var data = {
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
