/*jslint browser: true, long: true, bitwise: true, unordered: true */
/*global console ParserProtobuf protobuf InstrumentRow */

/**
 * Init demo and return config and helper functions.
 * @param {Object} demo The required elements in the website.
 * @return {Object} Object with config, user object and helper functions.
 */
function priceSubscriptionHelper(demo) {

    const contextId = "PriceDemo_" + Date.now();  // Some unique value
    const parserProtobuf = new ParserProtobuf("default", protobuf);
    // These objects contains the state of the subscriptions, so a reconnect can be processed and health can be monitored.
    const listSubscription = {
        "reference": "PriceListEvent",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false,
        "instruments": [],
        "assetType": ""
    };
    const tradeLevelSubscription = {
        "reference": "TradeLevelEvent",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    let rows = [];
    let connection = null;
    let schemaName;
    let bearerToken;
    let primarySessionRequestCount = 0;

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
        const websocketConnectUrl = demo.websocketConnectUrl + "?authorization=Bearer " + encodeURIComponent(bearerToken) + "&contextId=" + encodeURIComponent(contextId);
        if (!isWebSocketsSupportedByBrowser()) {
            console.error("This browser doesn't support WebSockets.");
            throw "This browser doesn't support WebSockets.";
        }
        try {
            connection = new window.WebSocket(websocketConnectUrl);
            connection.binaryType = "arraybuffer";
            console.log("Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState + ".");
            // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
            // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        } catch (error) {
            console.error("Error creating websocket. " + error);
        }
    }

    /**
     * Create the body object for fetching data from the API.
     * @param {string} method GET, POST, PATCH etc.
     * @param {Object} body The optional data to send to the API - GET and DELETE don't send gata via the body (in general)
     * @return {Object} The object with Bearer token
     */
    function getFetchBody(method, body) {

        const result = {
            "method": method.toUpperCase(),
            "headers": {
                "Authorization": "Bearer " + bearerToken
            }
        };
        if (body !== undefined && body !== null) {
            // We are sending JSON if using POST or PATCH. API is not accepting www-form-urlencoded.
            result.headers["Content-Type"] = "application/json; charset=utf-8";
            result.body = JSON.stringify(body);
        }
        return result;
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
                fetch(demo.apiUrl + urlPath, getFetchBody("DELETE")).then(function (response) {
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

        const urlPathInfoPrices = "/trade/v1/infoprices/subscriptions/" + encodeURIComponent(contextId);
        // Make sure this is done sequentially, to prevent throttling issues when new subscriptions are created.
        removeSubscription(listSubscription.isActive, urlPathInfoPrices, function () {
            // Empty the list of instruments
            clearList();
            callbackOnSuccess();
        });
    }

    /**
     * This is an example of unsubscribing, including a reset of the state.
     * @return {void}
     */
    function unsubscribeAndResetState() {
        unsubscribe(function () {
            listSubscription.isActive = false;
        });
    }

    /**
     * Only one app can retrieve realtime prices. This is the primary app. This function makes this app the primary one. Other apps are notified and get delayed prices.
     * @return {void}
     */
    function requestPrimaryPriceSession() {
        const data = {
            "TradeLevel": "FullTradingAndChat"
        };
        fetch(demo.apiUrl + "/root/v1/sessions/capabilities", getFetchBody("PUT", data)).then(function (response) {
            if (response.ok) {
                console.log("Requested FullTradingAndChat session capabilities..");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This function monitors the data going over the network for the different active subscriptions.
     * @param {Object} subscription The subscription to monitor
     * @returns {void}
     */
    function monitorActivity(subscription) {
        if (subscription.isActive) {
            if (subscription.isRecentDataReceived) {
                console.debug("Subscription " + subscription.reference + " is healthy..");
                subscription.isRecentDataReceived = false;
            } else {
                console.error("No recent network activity for subscription " + subscription.reference + ". You might want to reconnect.");
            }
        }
    }

    /**
     * Subscribe to price session changes.
     * @return {void}
     */
    function subscribeToTradeLevelChanges() {
        const data = {
            "ContextId": contextId,
            "ReferenceId": tradeLevelSubscription.reference
        };
        if (tradeLevelSubscription.isActive) {
            // The reference id of a subscription for which the new subscription is a replacement.
            // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
            // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
            // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
            // If no such subscription exists, the ReplaceReferenceId is ignored.
            data.ReplaceReferenceId = tradeLevelSubscription.reference;
        }
        fetch(demo.apiUrl + "/root/v1/sessions/events/subscriptions", getFetchBody("POST", data)).then(function (response) {
            tradeLevelSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
            tradeLevelSubscription.isActive = true;
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (tradeLevelSubscription.activityMonitor === null) {
                        tradeLevelSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(tradeLevelSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    console.log("Subscription created with readyState " + connection.readyState + " and data: " + JSON.stringify(data, null, 4) + "\n\nResponse: " + JSON.stringify(responseJson, null, 4));
                    if (responseJson.Snapshot.TradeLevel !== "FullTradingAndChat") {
                        requestPrimaryPriceSession();
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request primary price session if allowed, and keep this.
     * @return {void}
     */
    function getAndKeepPrimarySession() {
        fetch(demo.apiUrl + "/root/v1/user", getFetchBody("GET")).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // More info about the user operations can be found @ https://saxobank.github.io/openapi-samples-js/basics/user-info/
                    if (responseJson.Operations.indexOf("OAPI.OP.TakeTradeSession") === -1) {
                        console.error("You are not allowed to upgrade your TradeLevel to FullTradingAndChat.");
                    } else {
                        console.log("Session has operation 'OAPI.OP.TakeTradeSession':\nYou can upgrade your session to FullTradingAndChat!\n\nProceeding to request..");
                        subscribeToTradeLevelChanges();
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Convert the currency code to a symbol (USD to $).
     * @param {string} currencyCode Currency code, coming from the API.
     * @return {string} Currency symbol.
     */
    function currencyCodeToSymbol(currencyCode) {
        switch (currencyCode) {
        case "EUR":
            return "€";
        case "USD":
            return "$";
        case "JPY":
            return "¥";
        case "GBP":
            return "£";
        case "RUB":
            return "₽";
        case "CNH":
            return "¥";
        case "ILS":
            return "₪";
        case "THB":
            return "฿";
        default:
            return currencyCode;
        }
    }

    /**
     * This is an example of subscribing to price updates, using Protobuf, which saves some bandwidth, but is much more complex to implement!
     * @param {Array<number>} instrumentList Instrument Uics
     * @param {string} assetType Instrument AssetType
     * @return {void}
     */
    function subscribeToList(instrumentList, assetType) {

        function internalSubscribe() {
            // The Saxo API supports ProtoBuf, which saves some bandwidth.
            //
            // More about Protocol Buffers: https://developers.google.com/protocol-buffers/docs/overview
            //
            // In order to make the parsing work, parts of the client-lib are used.
            // See Github: https://github.com/SaxoBank/openapi-clientlib-js
            const data = {
                "ContextId": contextId,
                "ReferenceId": listSubscription.reference,
                "Format": "application/x-protobuf",  // This triggers ProtoBuf
                "Arguments": {
                    "AccountKey": demo.user.accountKey,
                    "Uics": instrumentList.join(),
                    "AssetType": assetType,
                    // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                    // MarketDepth gives the order book, when available.
                    // PriceInfo gives NetChange and PercentChange attributes in update messages.
                    "FieldGroups": ["Quote", "DisplayAndFormat", "InstrumentPriceDetails", "PriceInfo", "PriceInfoDetails"]
                }
                // https://www.saxoinvestor.fr/sim/openapi/trade/v1/prices/subscriptions
                // {"Format":"application/x-protobuf","Arguments":{"AccountKey":"XIeV3EweQCO5pkSko8F3SA==","AssetType":"StockIndex","Uic":12999,"FieldGroups":["PriceInfo","PriceInfoDetails","InstrumentPriceDetails","HistoricalChanges","MarketDepth","Quote"]},"RefreshRate":500,"Tag":null,"ContextId":"7616225273","ReferenceId":"22","KnownSchemas":["Price-3.3.344+e533a2681c"]}
            };
            if (listSubscription.isActive) {
                // The reference id of a subscription for which the new subscription is a replacement.
                // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
                // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
                // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
                // If no such subscription exists, the ReplaceReferenceId is ignored.
                data.ReplaceReferenceId = listSubscription.reference;
            }
            console.log("Subscribing to " + instrumentList.length + " instruments of AssetType " + assetType + "..");
            fetch(demo.apiUrl + "/trade/v1/infoprices/subscriptions", getFetchBody("POST", data)).then(function (response) {
                if (response.ok) {
                    listSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                    listSubscription.isActive = true;
                    response.json().then(function (responseJson) {
                        // The schema to use when parsing the messages, is send together with the snapshot.
                        schemaName = responseJson.SchemaName;
                        if (!parserProtobuf.addSchema(responseJson.Schema, schemaName)) {
                            console.error("Adding schema to protobuf was not successful.");
                        }
                        responseJson.Snapshot.Data.forEach(function (instrument) {
                            let instrumentName = instrument.DisplayAndFormat.Description + " (" + currencyCodeToSymbol(instrument.DisplayAndFormat.Currency) + ") [" + (
                                instrument.Quote.DelayedByMinutes === 0
                                ? "realtime"
                                : "delayed"
                            ) + "]";
                            rows.push(new InstrumentRow(document.getElementById("idInstrumentsList"), instrumentName, instrument));
                        });
                        // Monitor connection every "InactivityTimeout" seconds.
                        if (listSubscription.activityMonitor === null) {
                            listSubscription.activityMonitor = window.setInterval(function () {
                                monitorActivity(listSubscription);
                            }, responseJson.InactivityTimeout * 1000);
                        }
                        console.log("Subscription for " + rows.length + " instruments created with readyState " + connection.readyState + ".\nRefreshRate: " + responseJson.RefreshRate + ".\nSchema name: " + schemaName + ".");
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        listSubscription.instruments = instrumentList;
        listSubscription.assetType = assetType;
        internalSubscribe();
    }

    /**
     * Make the instrument list empty.
     * @return {void}
     */
    function clearList() {
        rows.forEach(function (row) {
            row.remove();
        });
        rows = [];
    }

    /**
     * Resubscribe, optionally with a different account.
     * @return {void}
     */
    function recreateSubscriptions() {
        if (listSubscription.isActive) {
            subscribeToList(listSubscription.instruments, listSubscription.assetType);
        }
        if (tradeLevelSubscription.isActive) {
            subscribeToTradeLevelChanges();
        }
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
                if (demo.getSecondsUntilTokenExpiry(bearerToken) <= 0) {
                    window.alert("It looks like the socket has been disconnected due to an expired token (error code " + evt.code + ").");
                    unsubscribeAndResetState();
                } else if (window.confirm("It looks like the socket has been disconnected, probably due to a network failure (error code " + evt.code + ").\nDo you want to (try to) reconnect?")) {
                    createConnection();
                    startListener();
                    // Ideally you create a setup where the connection is restored automatically, after a second or so.
                    // You can do this with an increasing wait time, until a maximum of say 10 retries.
                    recreateSubscriptions();
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
         * This function processes the heartbeat messages, containing info about system health.
         * https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
         * @param {Array<Object>} payload The list of messages
         * @return {void}
         */
        function handleHeartbeat(payload) {
            // Heartbeat messages are sent every 20 seconds. If there is a minute without messages, this is an error.
            if (Array.isArray(payload)) {
                payload.forEach(function (heartbeatMessages) {
                    heartbeatMessages.Heartbeats.forEach(function (heartbeat) {
                        switch (heartbeat.Reason) {
                        case "SubscriptionTemporarilyDisabled":
                        case "SubscriptionPermanentlyDisabled":
                            console.error("Heartbeat event error: " + heartbeat.Reason);
                            break;
                        case "NoNewData":
                            switch (heartbeat.OriginatingReferenceId) {
                            case listSubscription.reference:
                                listSubscription.isRecentDataReceived = true;
                                break;
                            case tradeLevelSubscription.reference:
                                tradeLevelSubscription.isRecentDataReceived = true;
                                break;
                            }
                            console.debug("No data, but heartbeat received for " + heartbeat.OriginatingReferenceId + " @ " + new Date().toLocaleTimeString());
                            break;
                        default:
                            console.error("Unknown heartbeat message received: " + JSON.stringify(payload));
                        }
                    });
                });
            } else {
                console.log("Received non-array heartbeat notification: " + JSON.stringify(payload, null, 4));
            }
        }

        /**
         * This function processes the price messages.
         * @param {Array<Object>} payload The list of messages
         * @return {void}
         */
        function handlePriceMessage(payload) {

            function publishPrice(message) {
                rows.forEach(function (row) {
                    if (message.hasOwnProperty("Uic") && message.Uic === row.initialQuoteMessage.Uic) {
                        row.processQuoteMessage(message);
                    }
                });
            }

            payload.Collection.forEach(publishPrice);
            listSubscription.isRecentDataReceived = true;
        }

        /**
         * This is an example of making the current app primary, so real time prices can be shown again. Other apps are notified and get delayed prices.
         * @return {void}
         */
        function requestPrimaryPriceSessionAgain() {
            const data = {
                "TradeLevel": "FullTradingAndChat"
            };
            const MAX_REQUESTS = 4;
            if (primarySessionRequestCount < MAX_REQUESTS) {
                // This check is to prevent a "Primary Session fight", after some retries the app must wait with requesting FullTradingAndChat again.
                primarySessionRequestCount += 1;
                fetch(demo.apiUrl + "/root/v1/sessions/capabilities", getFetchBody("PATCH", data)).then(function (response) {
                    if (response.ok) {
                        console.log("Requested FullTradingAndChat session capabilities again..");
                    } else {
                        demo.processError(response);
                    }
                }).catch(function (error) {
                    console.error(error);
                });
            } else {
                // Wait 30 seconds..
                console.error("Wait 30 seconds with requesting FullTradingAndChat rights again, to prevent a fight with another app...");
                window.setTimeout(function () {
                    primarySessionRequestCount = 0;  // Reset
                    requestPrimaryPriceSessionAgain();
                }, 30 * 1000);
            }
        }

        /**
         * This function processes the trade level change messages.
         * @param {Array<Object>} payload The list of messages
         * @return {void}
         */
        function handleTradeLevelMessage(payload) {
            if (payload.TradeLevel !== "FullTradingAndChat") {
                requestPrimaryPriceSessionAgain();
                demo.displaySourceCode([requestPrimaryPriceSessionAgain]);  // Show code, for demo purposes..
            }
            tradeLevelSubscription.isRecentDataReceived = true;
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

        /**
         * New data is received. Read and process the data.
         * @param {Object} messageFrame The received message
         * @return {void}
         */
        function handleSocketMessage(messageFrame) {
            const messages = parseMessageFrame(messageFrame.data);
            messages.forEach(function (message) {
                switch (message.referenceId) {
                case listSubscription.reference:
                    handlePriceMessage(message.payload);
                    //console.log("Price list update event " + message.messageId + " received in bundle of " + messages.length + " (reference " + message.referenceId + "):\n" + JSON.stringify(message.payload, null, 4));
                    break;
                case tradeLevelSubscription.reference:
                    handleTradeLevelMessage(message.payload);
                    console.log("Streaming trade level change event " + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
                    break;
                case "_heartbeat":
                    // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                    handleHeartbeat(message.payload);
                    break;
                case "_resetsubscriptions":
                    // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                    // The server is not able to send messages and client needs to reset subscriptions by recreating them.
                    console.error("Reset Subscription Control message received! Reset your subscriptions by recreating them.\n\n" + JSON.stringify(message.payload, null, 4));
                    recreateSubscriptions();  // When the TargetReferenceIds array contains elements, this can be done in a more efficient way, by only resubscribing to the referenced subscriptions.
                    break;
                case "_disconnect":
                    // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                    // The server has disconnected the client. This messages requires you to re-authenticate if you wish to continue receiving messages.
                    console.error("The server has disconnected the client! New login is required.\n\n" + JSON.stringify(message.payload, null, 4));
                    break;
                default:
                    console.error("No processing implemented for message with reference " + message.referenceId);
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
     * @param {string} accessToken Token required to authenticate.
     * @return {void}
     */
    function extendSubscription(accessToken) {
        bearerToken = accessToken;
        if (connection !== null) {
            fetch(demo.apiUrl + "/streaming/ws/authorize?contextid=" + encodeURIComponent(contextId), getFetchBody("PUT")).then(function (response) {
                if (response.ok) {
                    console.log("Websocket subscription extended.");
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }
    }

    /**
     * When you want to use a different account, there is no need to setup a different connection. Just delete the existing subscription and open a new subscription.
     * @return {void}
     */
    function switchAccount() {
        recreateSubscriptions();
    }

    /**
     * This is an example of disconnecting the socket.
     * @return {void}
     */
    function disconnect() {
        const NORMAL_CLOSURE = 1000;
        connection.close(NORMAL_CLOSURE);  // This will trigger the onclose event
        // Activity monitoring can be stopped.
        window.clearInterval(listSubscription.activityMonitor);
        window.clearInterval(tradeLevelSubscription.activityMonitor);
    }

    /**
     * Connect to the the websocket connection, if not already active.
     * @param {string} accessToken Token required to authenticate.
     * @return {void}
     */
    function connect(accessToken) {
        bearerToken = accessToken;
        // Connect to feed, if not already connected
        if (connection === null) {
            createConnection();
            startListener();
            getAndKeepPrimarySession();
        }
    }

    /**
     * Setup and return settings to be used on demo.js.
     * @return {Object} Object with price streamer helper functions.
     */
    function setupPriceSubscriptionHelper() {
        return Object.freeze({
            connect,
            disconnect,
            subscribeToList,
            clearList,
            extendSubscription,
            switchAccount,
            unsubscribeAndResetState
        });
    }

    return setupPriceSubscriptionHelper();
}
