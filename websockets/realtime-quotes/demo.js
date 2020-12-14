/*jslint this: true, browser: true, long: true, bitwise: true */
/*global window console demonstrationHelper ParserProtobuf protobuf */

/**
 * Follows WebSocket behaviour defined by spec:
 * https://html.spec.whatwg.org/multipage/web-sockets.html
 */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "isExtendedAssetTypesRequired": true,  // Adds link to app with Extended AssetTypes
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "FxSpot",  // Only FX has realtime prices, if Live account is not linked
        "footerElm": document.getElementById("idFooter")
    });
    const parserProtobuf = new ParserProtobuf("default", protobuf);
    const streamingState = {
        // This object contains the state of the subscriptions, so a reconnect can be processed.
        isJsonListSubscriptionActive: false,
        isJsonOrderTicketSubscriptionActive: false,
        isProtoBufListSubscriptionActive: false,
        isProtoBufOrderTicketSubscriptionActive: false
    };
    let schemaName;
    let connection;

    /**
     * Test if the browser supports the features required for websockets.
     * @return {boolean} True when the features are available.
     */
    function isWebSocketsSupportedByBrowser() {
        return (
            Boolean(window.WebSocket) &&
            Boolean(window.Int8Array) &&
            Boolean(window.Uint8Array) &&
            Boolean(window.TextDecoder)
        );
    }

    /**
     * This is an example of constructing the websocket connection.
     * @return {void}
     */
    function createConnection() {
        const accessToken = document.getElementById("idBearerToken").value;
        const contextId = encodeURIComponent(document.getElementById("idContextId").value);
        const streamerUrl = demo.streamerUrl + "?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
        if (!isWebSocketsSupportedByBrowser()) {
            console.error("This browser doesn't support WebSockets.");
            throw "This browser doesn't support WebSockets.";
        }
        if (contextId !== document.getElementById("idContextId").value) {
            console.error("Invalid characters in Context ID.");
            throw "Invalid characters in Context ID.";
        }
        try {
            connection = new window.WebSocket(streamerUrl);
            connection.binaryType = "arraybuffer";
            console.log("Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState + ".");
            // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
            // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        } catch (error) {
            console.error("Error creating websocket. " + error);
        }
    }

    /**
     * This is an example of subscribing to price updates for multiple instruments, using Json.
     * @return {void}
     */
    function subscribeListJson() {
        const data = {
            "ContextId": document.getElementById("idContextId").value,
            "ReferenceId": "MyPriceEvent_JSON",
            "Arguments": {
                "AccountKey": demo.user.accountKey,
                "Uics": document.getElementById("idUics").value,
                "AssetType": document.getElementById("idCbxAssetType").value,
                // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                // MarketDepth gives the order book, when available.
                "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
            }
        };
        fetch(
            // Refresh rate is minimal 1000 ms; this endpoint is meant to show an overview.
            // For more frequent updates, the endpoint "POST /trade/v1/prices/subscriptions" can be used, with "RequireTradableQuote" set to "true".
            // This is intended for only one instrument, but you can request multiple parallel subscriptions, up to 200 (this is the app default).
            demo.apiUrl + "/trade/v1/infoprices/subscriptions",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
            if (response.ok) {
                streamingState.isJsonListSubscriptionActive = true;
                response.json().then(function (responseJson) {
                    console.log("Subscription created with readyState " + connection.readyState + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of subscribing to price updates with higher refreshRate meant for displaying in an order ticket, using Json.
     * @return {void}
     */
    function subscribeOrderTicketJson() {

        /**
         * Get a realtime subscription for prices on a single instrument. Use this to get prices in an order ticket.
         * @param {number} uic Instrument ID
         * @return {void}
         */
        function subscribe(uic) {
            const data = {
                "ContextId": document.getElementById("idContextId").value,
                "ReferenceId": "MyPriceEventOfUic" + "_" + uic,
                "Arguments": {
                    "AccountKey": demo.user.accountKey,
                    "Uic": uic,
                    "AssetType": document.getElementById("idCbxAssetType").value,
                    "RequireTradableQuote": true,  // This field lets the server know the prices are used to base trading decisions on
                    // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                    // MarketDepth gives the order book, when available.
                    "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
                }
            };
            fetch(
                demo.apiUrl + "/trade/v1/prices/subscriptions",
                {
                    "method": "POST",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    "body": JSON.stringify(data)
                }
            ).then(function (response) {
                if (response.ok) {
                    streamingState.isJsonOrderTicketSubscriptionActive = true;
                    response.json().then(function (responseJson) {
                        console.log("Subscription created with readyState " + connection.readyState + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const uicList = document.getElementById("idUics").value.split(",");
        uicList.forEach(subscribe);
    }

    /**
     * This is an example of subscribing to price updates, using Protobuf, which saves some bandwidth, but is much more complex to implement!
     * @return {void}
     */
    function subscribeListProtoBuf() {
        // The Saxo API supports ProtoBuf, which saves some bandwidth.
        //
        // More about Protocol Buffers: https://developers.google.com/protocol-buffers/docs/overview
        //
        // In order to make the parsing work, parts of the client-lib are used.
        // See Github: https://github.com/SaxoBank/openapi-clientlib-js
        const data = {
            "ContextId": document.getElementById("idContextId").value,
            "ReferenceId": "MyPriceEvent_ProtoBuf",
            "Format": "application/x-protobuf",  // This triggers ProtoBuf
            "Arguments": {
                "AccountKey": demo.user.accountKey,
                "Uics": document.getElementById("idUics").value,
                "AssetType": document.getElementById("idCbxAssetType").value,
                // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                // MarketDepth gives the order book, when available.
                "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
            }
        };
        fetch(
            demo.apiUrl + "/trade/v1/infoprices/subscriptions",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
            if (response.ok) {
                streamingState.isProtoBufListSubscriptionActive = true;
                response.json().then(function (responseJson) {
                    // The schema to use when parsing the messages, is send together with the snapshot.
                    schemaName = responseJson.SchemaName;
                    if (!parserProtobuf.addSchema(responseJson.Schema, schemaName)) {
                        console.error("Adding schema to protobuf was not successful");
                    }
                    console.log("Subscription created with readyState " + connection.readyState + ". Schema name: " + schemaName + ".\nSchema:\n" + responseJson.Schema);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of subscribing to price updates with higher refreshRate meant for displaying in an order ticket, using Protocol Buffers.
     * @return {void}
     */
    function subscribeOrderTicketProtoBuf() {
        // The Saxo API supports ProtoBuf, which saves some bandwidth.
        //
        // More about Protocol Buffers: https://developers.google.com/protocol-buffers/docs/overview
        //
        // In order to make the parsing work, parts of the client-lib are used.
        // See Github: https://github.com/SaxoBank/openapi-clientlib-js

        /**
         * Get a realtime subscription for prices on a single instrument. Use this to get prices in an order ticket.
         * @param {number} uic Instrument ID
         * @return {void}
         */
        function subscribe(uic) {
            const data = {
                "ContextId": document.getElementById("idContextId").value,
                "ReferenceId": "MyPriceEventOfUic" + "_" + uic,
                "Format": "application/x-protobuf",  // This triggers ProtoBuf
                "Arguments": {
                    "AccountKey": demo.user.accountKey,
                    "Uic": uic,
                    "AssetType": document.getElementById("idCbxAssetType").value,
                    "RequireTradableQuote": true,  // This field lets the server know the prices are used to base trading decisions on
                    // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                    // MarketDepth gives the order book, when available.
                    "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
                }
            };
            fetch(
                demo.apiUrl + "/trade/v1/prices/subscriptions",
                {
                    "method": "POST",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    "body": JSON.stringify(data)
                }
            ).then(function (response) {
                if (response.ok) {
                    streamingState.isProtoBufOrderTicketSubscriptionActive = true;
                    response.json().then(function (responseJson) {
                        // The schema to use when parsing the messages, is send together with the snapshot.
                        schemaName = responseJson.SchemaName;
                        if (!parserProtobuf.addSchema(responseJson.Schema, schemaName)) {
                            console.error("Adding schema to protobuf was not successful");
                        }
                        console.log("Subscription created with readyState " + connection.readyState + ". Schema name: " + schemaName + ".\nSchema:\n" + responseJson.Schema);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const uicList = document.getElementById("idUics").value.split(",");
        uicList.forEach(subscribe);
    }

    /**
     * This function initiates the events and contains the processing of new messages.
     * @return {void}
     */
    function startListener() {
        const utf8Decoder = new window.TextDecoder();

        /**
         * This event is triggered when the socket connection is opened.
         * @return {void}
         */
        function handleSocketOpen() {
            console.log("Streaming connected.");
        }

        /**
         * This event is triggered when the socket connection is closed.
         * @param {Object} evt The event containing the reason
         * @return {void}
         */
        function handleSocketClose(evt) {
            // Status codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
            if (evt.wasClean === true) {
                console.log("Streaming disconnected with code " + evt.code + ".");  // Most likely 1000 (Normal Closure), or 1001 (Going Away)
            } else {
                console.error("Streaming disconnected with code " + evt.code + ".");
                if (window.confirm("It looks like the socket has been disconnected, probably due to a network failure or expired token (" + evt.code + ").\nDo you want to reconnect?")) {
                    createConnection();
                    startListener();
                    // Ideally you create a setup where the connection is restored automatically, after a second or so.
                    // You can do this with an increasing wait time, until a maximum of say 10 retries.
                    setTimeout(function () {
                        if (streamingState.isJsonListSubscriptionActive) {
                            subscribeListJson();
                        }
                        if (streamingState.isJsonOrderTicketSubscriptionActive) {
                            subscribeOrderTicketJson();
                        }
                        if (streamingState.isProtoBufListSubscriptionActive) {
                            subscribeListProtoBuf();
                        }
                        if (streamingState.isProtoBufOrderTicketSubscriptionActive) {
                            subscribeOrderTicketProtoBuf();
                        }
                    }, 1000);
                }
            }
        }

        /**
         * This event is triggered when the socket connection enters an error state.
         * @param {Object} evt The event containing the reason
         * @return {void}
         */
        function handleSocketError(evt) {
            console.error(evt);
        }

        /**
         * Creates a Long from its little endian byte representation (function is part of long.js - https://github.com/dcodeIO/long.js).
         * @param {!Array.<number>} bytes Little endian byte representation
         * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
         * @returns {number} The corresponding Long value
         */
        function fromBytesLe(bytes, unsigned) {
            const low = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) | 0;
            const high = (bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24) | 0;
            const twoPwr16Dbl = 1 << 16;
            const twoPwr32Dbl = twoPwr16Dbl * twoPwr16Dbl;
            if (unsigned) {
                return (high >>> 0) * twoPwr32Dbl + (low >>> 0);
            }
            return high * twoPwr32Dbl + (low >>> 0);
        }

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
                 * 64-bit little-endian unsigned integer indicating the size of the message payload.
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

        /**
         * New data is received. Read and process the data.
         * @param {Object} messageFrame The received message
         * @return {void}
         */
        function handleSocketMessage(messageFrame) {
            const messages = parseMessageFrame(messageFrame.data);
            messages.forEach(function (message) {
                const priceEventName = "MyPriceEvent";
                switch (message.referenceId) {
                case "_heartbeat":
                    console.debug("Heartbeat event " + message.messageId + " received: " + JSON.stringify(message.payload));
                    break;
                case "_resetsubscriptions":
                    // The server is not able to send messages and client needs to reset subscriptions by recreating them.
                    console.error("Reset Subscription Control message received! Reset your subscriptions by recreating them.\n\n" + JSON.stringify(message.payload, null, 4));
                    break;
                case "_disconnect":
                    // The server has disconnected the client. This messages requires you to re-authenticate if you wish to continue receiving messages.
                    console.error("The server has disconnected the client! Refresh the token.\n\n" + JSON.stringify(message.payload, null, 4));
                    break;
                default:
                    if (message.referenceId.substring(0, priceEventName.length) === priceEventName) {
                        // Notice that the format of the messages of the two endpoints is different.
                        // The /prices contain no Uic, that must be derived from the referenceId.
                        // Since /infoprices is about lists, it always contains the Uic.
                        console.log("Price update event " + message.messageId + " received in bundle of " + messages.length + " (reference " + message.referenceId + "):\n" + JSON.stringify(message.payload, null, 4));
                    } else {
                        console.error("No processing implemented for message with reference " + message.referenceId);
                    }
                }
            });
        }

        connection.onopen = handleSocketOpen;
        connection.onclose = handleSocketClose;
        connection.onerror = handleSocketError;
        connection.onmessage = handleSocketMessage;
        console.log("Connection subscribed to events. ReadyState: " + connection.readyState + ".");
    }

    /**
     * This is an example of extending the websocket session, when a token refresh took place.
     * @return {void}
     */
    function extendSubscription() {
        fetch(
            demo.apiUrl + "/streamingws/authorize?contextid=" + encodeURIComponent(document.getElementById("idContextId").value),
            {
                "method": "PUT",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("Subscription extended.");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of unsubscribing to the events.
     * @param {Function} callbackOnSuccess Function to invoke on success
     * @return {void}
     */
    function unsubscribe(callbackOnSuccess) {

        /**
         * Unsubscribe for the service added to the URL.
         * @param {boolean} isSubscriptionActive When not active, skip and invoke callback
         * @param {string} urlPath The URL pointing to the service to unsubscribe
         * @param {Function} internalCallbackOnSuccess Function to invoke on success
         * @return {void}
         */
        function removeSubscription(isSubscriptionActive, urlPath, internalCallbackOnSuccess) {
            if (isSubscriptionActive) {
                fetch(
                    demo.apiUrl + urlPath,
                    {
                        "method": "DELETE",
                        "headers": {
                            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                        }
                    }
                ).then(function (response) {
                    if (response.ok) {
                        console.log("Unsubscribed to " + demo.apiUrl + urlPath + ".\nReadyState " + connection.readyState + ".");
                        internalCallbackOnSuccess();
                    } else {
                        demo.processError(response);
                    }
                }).catch(function (error) {
                    console.error(error);
                });
            } else {
                internalCallbackOnSuccess();
            }
        }

        const contextId = document.getElementById("idContextId").value;
        const urlPathInfoPrices = "/trade/v1/infoprices/subscriptions/" + encodeURIComponent(contextId);
        const urlPathPrices = "/trade/v1/prices/subscriptions/" + encodeURIComponent(contextId);
        // Make sure this is done sequentially.
        removeSubscription(streamingState.isJsonListSubscriptionActive || streamingState.isProtoBufListSubscriptionActive, urlPathInfoPrices, function () {
            removeSubscription(streamingState.isJsonOrderTicketSubscriptionActive || streamingState.isProtoBufOrderTicketSubscriptionActive, urlPathPrices, callbackOnSuccess);
        });
        // (By adding a referenceId, the unsubscribe can be done per instrument)
    }

    /**
     * When you want to use a different account, there is no need to setup a different connection. Just delete the existing subscription and open a new subscription.
     * @return {void}
     */
    function switchAccount() {
        unsubscribe(function () {
            if (streamingState.isJsonListSubscriptionActive) {
                subscribeListJson();
            }
            if (streamingState.isJsonOrderTicketSubscriptionActive) {
                subscribeOrderTicketJson();
            }
            if (streamingState.isProtoBufListSubscriptionActive) {
                subscribeListProtoBuf();
            }
            if (streamingState.isProtoBufOrderTicketSubscriptionActive) {
                subscribeOrderTicketProtoBuf();
            }
        });
    }

    /**
     * This is an example of unsubscribing, including a reset of the state.
     * @return {void}
     */
    function unsubscribeAndResetState() {
        unsubscribe(function () {
            streamingState.isJsonListSubscriptionActive = false;
            streamingState.isProtoBufListSubscriptionActive = false;
            streamingState.isJsonOrderTicketSubscriptionActive = false;
            streamingState.isProtoBufOrderTicketSubscriptionActive = false;
        });
    }

    /**
     * This is an example of disconnecting the socket.
     * @return {void}
     */
    function disconnect() {
        const NORMAL_CLOSURE = 1000;
        connection.close(NORMAL_CLOSURE);  // This will trigger the onclose event
    }

    document.getElementById("idContextId").value = "MyApp_" + Date.now();  // Some unique value
    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnCreateConnection", "func": createConnection, "funcsToDisplay": [createConnection]},
        {"evt": "click", "elmId": "idBtnStartListener", "func": startListener, "funcsToDisplay": [startListener]},
        {"evt": "click", "elmId": "idBtnSubscribeListJson", "func": subscribeListJson, "funcsToDisplay": [subscribeListJson]},
        {"evt": "click", "elmId": "idBtnSubscribeOrderTicketJson", "func": subscribeOrderTicketJson, "funcsToDisplay": [subscribeOrderTicketJson]},
        {"evt": "click", "elmId": "idBtnSubscribeListProtoBuf", "func": subscribeListProtoBuf, "funcsToDisplay": [subscribeListProtoBuf]},
        {"evt": "click", "elmId": "idBtnSubscribeOrderTicketProtoBuf", "func": subscribeOrderTicketProtoBuf, "funcsToDisplay": [subscribeOrderTicketProtoBuf]},
        {"evt": "click", "elmId": "idBtnSwitchAccount", "func": switchAccount, "funcsToDisplay": [switchAccount]},
        {"evt": "click", "elmId": "idBtnExtendSubscription", "func": extendSubscription, "funcsToDisplay": [extendSubscription]},
        {"evt": "click", "elmId": "idBtnUnsubscribe", "func": unsubscribeAndResetState, "funcsToDisplay": [unsubscribeAndResetState, unsubscribe]},
        {"evt": "click", "elmId": "idBtnDisconnect", "func": disconnect, "funcsToDisplay": [disconnect]}
    ]);
    demo.displayVersion("trade");
}());
