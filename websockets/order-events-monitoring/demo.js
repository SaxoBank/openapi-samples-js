/*jslint this: true, browser: true, for: true, long: true, bitwise: true */
/*global window console WebSocket accountKey clientKey run processError apiUrl displayVersion */

let connection;

/**
 * This is an example of constructing the websocket connection.
 * @return {void}
 */
function createConnection() {
    const accessToken = document.getElementById("idBearerToken").value;
    const contextId = encodeURIComponent(document.getElementById("idContextId").value);
    const streamerUrl = "wss://gateway.saxobank.com/sim/openapi/streamingws/connect?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
    if (contextId !== document.getElementById("idContextId").value) {
        console.error("Invalid characters in Context ID.");
        throw "Invalid characters in Context ID.";
    }
    connection = new WebSocket(streamerUrl);
    connection.binaryType = "arraybuffer";
    console.log("Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState);
    // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
    // 0 = CONNECTING, 1 = OPEN
}

/**
 * This function initiates the events and contains the processing of new messages.
 * @return {void}
 */
function startListener() {

    /**
     * Creates a Long from its little endian byte representation (function is part of long.js - https://github.com/dcodeIO/long.js).
     * @param {!Array.<number>} bytes Little endian byte representation
     * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
     * @returns {number} The corresponding Long value
     */
    function fromBytesLE(bytes, unsigned) {
        const low = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) | 0;
        const high = (bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24) | 0;
        const TWO_PWR_16_DBL = 1 << 16;
        const TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
        if (unsigned) {
            return ((high >>> 0) * TWO_PWR_32_DBL) + (low >>> 0);
        }
        return high * TWO_PWR_32_DBL + (low >>> 0);
    }

    /**
     * Parse the incoming messages. Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
     * @param {Object} data The received stream message
     * @returns {Array[Object]}
     */
    function parseMessageFrame(data) {
        const message = new DataView(data);
        let parsedMessages = [];
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
            messageId = fromBytesLE(new Uint8Array(data, index, 8));
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
            referenceIdBuffer = new Int8Array(data.slice(index, index + referenceIdSize));
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
             * 64-bit little-endian unsigned integer indicating the size of the message payload.
             */
            payloadSize = message.getUint32(index, true);
            index += 4;
            /* Payload (Spayload bytes)
             * Binary message payload with the size indicated by the payload size field.
             * The interpretation of the payload depends on the message format field.
             */
            payloadBuffer = new Int8Array(data.slice(index, index + payloadSize));
            if (payloadFormat === 0) {
                payload = JSON.parse(String.fromCharCode.apply(String, payloadBuffer));
                parsedMessages.push({
                    "messageId": messageId,
                    "referenceId": referenceId,
                    "payload": payload
                });
            } else {
                console.error("Unsupported payloadFormat: " + payloadFormat);
            }
            index += payloadSize;
        }
        return parsedMessages;
    }

    connection.onopen = function () {
        console.log("Streaming connected");
    };
    connection.onclose = function () {
        console.log("Streaming disconnected");
    };
    connection.onerror = function (evt) {
        console.error(evt);
    };
    connection.onmessage = function (messageFrame) {
        const messages = parseMessageFrame(messageFrame.data);
        messages.forEach(function (message) {
            switch (message.referenceId) {
            case "MyOrderEvent":
                console.log("Streaming order event " + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
                break;
            case "MyPositionEvent":
                console.log("Streaming position event " + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
                break;
            case "_heartbeat":
                console.debug("Heartbeat event " + message.messageId + " received: " + JSON.stringify(message.payload));
                break;
            case "_resetsubscriptions":
                // The server is not able to send messages and client needs to reset subscriptions by recreating them.
                console.error("Reset Susbcription Control messsage received! Reset your subscriptions by recreating them.\n\n" + JSON.stringify(message.payload, null, 4));
                break;
            case "_disconnect":
                // The server has disconnected the client. This messages requires you to reauthenticate if you wish to continue receiving messages.
                console.error("The server has disconnected the client! Refresh the token.\n\n" + JSON.stringify(message.payload, null, 4));
                break;
            default:
                console.error("No processing implemented for message with reference " + message.referenceId);
            }
        });
    };
    console.log("Connection subscribed to events. ReadyState: " + connection.readyState);
}

/**
 * This is an example of subscribing to changes in active orders.
 * @return {void}
 */
function subscribeOrders() {
    const data = {
        "ContextId": document.getElementById("idContextId").value,
        "ReferenceId": "MyOrderEvent",
        "Arguments": {
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
    fetch(
        apiUrl + "/ens/v1/activities/subscriptions",
        {
            "method": "POST",
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Content-Type": "application/json"
            },
            "body": JSON.stringify(data)
        }
    ).then(function (response) {
        if (response.ok) {
            console.log("Subscription for order changes created with readyState " + connection.readyState + " and data '" + JSON.stringify(data, null, 4) + "'.");
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of subscribing to changes in net positions.
 * @return {void}
 */
function subscribePositions() {
    const data = {
        "ContextId": document.getElementById("idContextId").value,
        "ReferenceId": "MyPositionEvent",
        "Arguments": {
            "AccountKey": accountKey,
            "ClientKey": clientKey
        }
    };
    fetch(
        apiUrl + "/port/v1/netpositions/subscriptions",
        {
            "method": "POST",
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Content-Type": "application/json"
            },
            "body": JSON.stringify(data)
        }
    ).then(function (response) {
        if (response.ok) {
            console.log("Subscription for position changes created with readyState " + connection.readyState + " and data '" + JSON.stringify(data, null, 4) + "'.");
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of extending the websocket session, when a token refresh took place.
 * @return {void}
 */
function extendSubscription() {
    fetch(
        apiUrl + "/streamingws/authorize?contextid=" + encodeURIComponent(document.getElementById("idContextId").value),
        {
            "method": "PUT",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            }
        }
    ).then(function (response) {
        if (response.ok) {
            console.log("Subscription extended");
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of disconnecting.
 * @return {void}
 */
function disconnect() {
    connection.close();
}

(function () {
    document.getElementById("idContextId").value = "MyApp_" + Date.now();  // Some unique value
    document.getElementById("idBtnCreateConnection").addEventListener("click", function () {
        run(createConnection);
    });
    document.getElementById("idBtnStartListener").addEventListener("click", function () {
        run(startListener);
    });
    document.getElementById("idBtnSubscribeOrders").addEventListener("click", function () {
        run(subscribeOrders);
    });
    document.getElementById("idBtnSubscribePositions").addEventListener("click", function () {
        run(subscribePositions);
    });
    document.getElementById("idBtnExtendSubscription").addEventListener("click", function () {
        run(extendSubscription);
    });
    document.getElementById("idBtnDisconnect").addEventListener("click", function () {
        run(disconnect);
    });
    displayVersion("ens");
}());
