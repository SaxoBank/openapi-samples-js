/*jslint this: true, browser: true, for: true, long: true, bitwise: true, unordered: true */
/*global window console demonstrationHelper ParserProtobuf protobuf */

/**
 * Follows WebSocket behaviour defined by spec:
 * https://html.spec.whatwg.org/multipage/web-sockets.html
 */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
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
    // These objects contains the state of the subscriptions, so a reconnect can be processed and health can be monitored.
    const tradeLevelSubscription = {
        "referenceId": "MyTradeLevelEvent",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const listSubscription = {
        "referenceId": "",  // This comes from the input
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const orderTicketSubscriptions = [];
    const orderTicketSubscriptionReferenceIdPrefix = "MyPricesEvent";
    let connection = null;  // The websocket connection object
    let orderTicketSubscriptionsActivityMonitor = null;
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
     * Get the input data and convert it to an object to be sent as request body.
     * @param {string} textAreaId Identifies which textarea element to use.
     * @return {Object} The object from the input field - null if invalid.
     */
    function getObjectFromTextArea(textAreaId) {
        let object = null;
        try {
            object = JSON.parse(document.getElementById(textAreaId).value);
            if (object.hasOwnProperty("Arguments")) {
                if (object.Arguments.hasOwnProperty("AccountKey")) {
                    object.Arguments.AccountKey = demo.user.accountKey;
                }
            }
            document.getElementById(textAreaId).value = JSON.stringify(object, null, 4);
        } catch (e) {
            console.error(e);
        }
        return object;
    }

    /**
     * Only applicable on Live: verify if customer accepted the OpenAPI Market Data Terms.
     * @return {void}
     */
    function getMarketDataTermsAccepted() {
        fetch(
            demo.apiUrl + "/port/v1/users/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.MarketDataViaOpenApiTermsAccepted) {
                        console.log("The customer accepted the OpenAPI Market Data Terms.\nThis means realtime prices, when available, can be retrieved by a thirdparty app.");
                    } else {
                        console.error("User didn't accept the terms for market data via the OpenApi.\nThis is required for instrument prices on Live via the OpenAPI.\n\n!!! This is not an issue on SIM, which has only realtime prices for Fx instruments.");
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
     * Get the ContextId from the ENS post body.
     * @return {string} The ContextId which was entered in the TextArea.
     */
    function getContextId() {
        const data = getObjectFromTextArea("idInfoPricesRequestObject");
        return data.ContextId;
    }

    /**
     * This is an example of constructing the websocket connection.
     * @return {void}
     */
    function createConnection() {
        const accessToken = document.getElementById("idBearerToken").value;
        const contextId = encodeURIComponent(getContextId());
        const streamerUrl = demo.streamerUrl + "?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
        if (!isWebSocketsSupportedByBrowser()) {
            console.error("This browser doesn't support WebSockets.");
            throw "This browser doesn't support WebSockets.";
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
     * This function monitors the data going over the network for the different active subscriptions.
     * @param {Object} subscription The subscription to monitor
     * @returns {void}
     */
    function monitorActivity(subscription) {
        if (subscription.isActive) {
            if (subscription.isRecentDataReceived) {
                console.debug("Subscription " + subscription.referenceId + " is healthy..");
                subscription.isRecentDataReceived = false;
            } else {
                console.error("No recent network activity for subscription " + subscription.referenceId + ". You might want to reconnect.");
            }
        }
    }

    /**
     * This is an example of subscribing to price updates for multiple instruments.
     * @return {void}
     */
    function subscribeList() {
        const data = getObjectFromTextArea("idInfoPricesRequestObject");
        if (listSubscription.isActive) {
            // The reference id of a subscription for which the new subscription is a replacement.
            // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
            // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
            // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
            // If no such subscription exists, the ReplaceReferenceId is ignored.
            data.ReplaceReferenceId = listSubscription.referenceId;
        }
        listSubscription.referenceId = data.ReferenceId;
        fetch(
            // Refresh rate is minimal 1000 ms; this endpoint is meant to show an overview.
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
                listSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                listSubscription.isActive = true;
                response.json().then(function (responseJson) {
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (listSubscription.activityMonitor === null) {
                        listSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(listSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    console.log("Subscription created " + (
                        connection === null
                        ? ""
                        : "(readyState " + connection.readyState + ") "
                    ) + "with RefreshRate " + responseJson.RefreshRate + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Lookup the subscription in the list, to get Uic and AssetType.
     * @param {Array<Object>} subscriptions The list
     * @param {string} referenceId The reference id to lookup
     * @return {Object} The subscription
     */
    function getSubscriptionByReference(subscriptions, referenceId) {
        // The referenceId is something like "MyPriceEvent_4" - the second part is the index.
        return subscriptions[parseInt(referenceId.substring(referenceId.indexOf("_") + 1), 10)];
    }

    /**
     * Subscribe to prices in high quality. These are meant to display on order tickets, but you can setup multiple subscriptions.
     * Multiple subscriptions are grouped into a single batch request.
     * @return {void}
     */
    function subscribeOrderTicket() {
        const data = getObjectFromTextArea("idPricesRequestObject");
        data.ReferenceId += "_" + orderTicketSubscriptions.length;
        fetch(
            // Refresh rate is minimal 1000 ms; this endpoint is meant to show an overview.
            // This is intended for only one instrument, but you can request multiple parallel subscriptions, up to 200 (this is the app default).
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
                response.json().then(function (responseJson) {
                    orderTicketSubscriptions.push({
                        "referenceId": data.ReferenceId,
                        "uic": data.Arguments.Uic,
                        "assetType": data.Arguments.AssetType,
                        "isRecentDataReceived": true,  // Start positive, will be set to 'false' after the next monitor health check.
                        "isActive": true
                    });
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (orderTicketSubscriptionsActivityMonitor === null) {
                        orderTicketSubscriptionsActivityMonitor = window.setInterval(function () {
                            orderTicketSubscriptions.forEach(monitorActivity);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    console.log("Subscription created " + (
                        connection === null
                        ? ""
                        : "(readyState " + connection.readyState + ") "
                    ) + "with RefreshRate " + responseJson.RefreshRate + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                });
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
                        console.log("Unsubscribed to " + demo.apiUrl + urlPath + "." + (
                            connection === null
                            ? ""
                            : "\nReadyState " + connection.readyState + "."
                        ));
                        internalCallbackOnSuccess();
                    } else {
                        demo.processError(response);
                    }
                }).catch(function (error) {
                    console.error(error);
                });
            } else {
                console.log("Subscription not active: " + urlPath);
                internalCallbackOnSuccess();
            }
        }

        const contextId = getContextId();
        const urlPathInfoPrices = "/trade/v1/infoprices/subscriptions/" + encodeURIComponent(contextId);
        const urlPathPrices = "/trade/v1/prices/subscriptions/" + encodeURIComponent(contextId);
        // Make sure this is done sequentially, to prevent throttling issues when new subscriptions are created.
        removeSubscription(listSubscription.isActive, urlPathInfoPrices, function () {
            removeSubscription(orderTicketSubscriptions.length > 0, urlPathPrices, callbackOnSuccess);
        });
    }

    /**
     * Unsubscribe and subscribe again, with the selected/active account.
     * @return {void}
     */
    function recreateSubscriptions() {
        const uicList = [];
        if (tradeLevelSubscription.isActive) {
            subscribeToTradeLevelChanges();
        }
        if (listSubscription.isActive) {
            subscribeList();
        }
        orderTicketSubscriptions.forEach(function (subscription) {
            uicList.push(subscription.uic);
        });
        if (uicList.length > 0) {
            document.getElementById("idUics").value = uicList.join(",");
            subscribeOrderTicket();
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
                if (demo.getSecondsUntilTokenExpiry(document.getElementById("idBearerToken").value) <= 0) {
                    window.alert("It looks like the socket has been disconnected due to an expired token (error code " + evt.code + ").");
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
         * @param {number} messageId The message sequence number
         * @param {Array<Object>} payload The list of messages
         * @return {void}
         */
        function handleHeartbeat(messageId, payload) {
            // Heartbeat messages are sent every "responseJson.InactivityTimeout" seconds. If there is a minute without messages, this indicates an error.
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
                            case listSubscription.referenceId:
                                listSubscription.isRecentDataReceived = true;
                                break;
                            case tradeLevelSubscription.referenceId:
                                tradeLevelSubscription.isRecentDataReceived = true;
                                break;
                            default:
                                orderTicketSubscriptions.forEach(function (orderTicketSubscription) {
                                    if (orderTicketSubscription.referenceId === heartbeat.OriginatingReferenceId) {
                                        orderTicketSubscription.isRecentDataReceived = true;
                                    }
                                });
                            }
                            console.debug("No data, but heartbeat received for " + heartbeat.OriginatingReferenceId + " @ " + new Date().toLocaleTimeString() + " (#" + messageId + ")");
                            break;
                        default:
                            console.error("Unknown heartbeat message received: " + JSON.stringify(payload));
                        }
                    });
                });
            } else {
                // This might be a TradeLevelChange event
                console.log("Received non-array heartbeat notification: " + JSON.stringify(payload, null, 4));
            }
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
                fetch(
                    demo.apiUrl + "/root/v1/sessions/capabilities",
                    {
                        "method": "PATCH",
                        "headers": {
                            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        "body": JSON.stringify(data)
                    }
                ).then(function (response) {
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
         * This function processes the price update messages - the most important part.
         * @param {Object} message The update
         * @param {number} bundleId The bundle identifier
         * @param {number} bundleCount The bundle number
         * @return {void}
         */
        function handlePriceUpdate(message, bundleId, bundleCount) {
            const subscription = getSubscriptionByReference(orderTicketSubscriptions, message.referenceId);
            console.log("Individual price update event #" + message.messageId + " received (" + bundleId + " of " + bundleCount + ") with reference id " + message.referenceId + ":\nUic " + subscription.uic + " " + subscription.assetType + "\n" + JSON.stringify(message.payload, null, 4));
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
                    console.error("Protobuf is not covered by this sample");
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
            messages.forEach(function (message, i) {
                switch (message.referenceId) {
                case listSubscription.referenceId:
                    listSubscription.isRecentDataReceived = true;
                    // Notice that the format of the messages of the two list endpoints is different.
                    // The /prices contain no Uic, that must be derived from the referenceId.
                    // Since /infoprices is about lists, it always contains the Uic.
                    console.log("Price list update event #" + message.messageId + " received in bundle of " + messages.length + " (reference id " + message.referenceId + "):\n" + JSON.stringify(message.payload, null, 4));
                    break;
                case "_heartbeat":
                    // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
                    handleHeartbeat(message.messageId, message.payload);
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
                case tradeLevelSubscription.referenceId:
                    handleTradeLevelMessage(message.payload);
                    console.log("Streaming trade level change event #" + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
                    break;
                default:
                    orderTicketSubscriptions.forEach(function (orderTicketSubscription) {
                        if (orderTicketSubscription.referenceId === message.referenceId) {
                            orderTicketSubscription.isRecentDataReceived = true;
                        }
                    });
                    if (message.referenceId.substr(0, orderTicketSubscriptionReferenceIdPrefix.length) === orderTicketSubscriptionReferenceIdPrefix) {
                        // Notice that the format of the messages of the two endpoints is different.
                        // The /prices contain no Uic, that must be derived from the referenceId.
                        // Since /infoprices is about lists, it always contains the Uic.
                        handlePriceUpdate(message, i + 1, messages.length);
                    } else {
                        console.error("No processing implemented for message with reference id: " + message.referenceId);
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
     * This is an example of extending the websocket session, after a token refresh took place.
     * @return {void}
     */
    function extendSubscription() {
        // Be sure to refresh the token first, using the OAuth2 server (not included in this sample).
        // Example: https://saxobank.github.io/openapi-samples-js/authentication/oauth2-implicit-flow/
        const token = document.getElementById("idBearerToken").value;
        fetch(
            demo.apiUrl + "/streamingws/authorize?contextid=" + encodeURIComponent(getContextId()),
            {
                "method": "PUT",
                "headers": {
                    "Authorization": "Bearer " + token
                }
            }
        ).then(function (response) {
            const newExpirationTime = new Date();
            newExpirationTime.setSeconds(newExpirationTime.getSeconds() + demo.getSecondsUntilTokenExpiry(token));
            if (response.ok) {
                console.log("Subscription extended until " + newExpirationTime.toLocaleString() + ".");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * When you want to use a different account, there is no need to setup a different connection. Just delete the existing subscription and open a new subscription.
     * @return {void}
     */
    function switchAccount() {
        recreateSubscriptions();
    }

    /**
     * This is an example of unsubscribing, including a reset of the state.
     * @return {void}
     */
    function unsubscribeAndResetState() {
        unsubscribe(function () {
            listSubscription.isActive = false;
            orderTicketSubscriptions.length = 0;
        });
    }

    /**
     * This is an example of disconnecting the socket.
     * @return {void}
     */
    function disconnect() {
        const NORMAL_CLOSURE = 1000;
        if (connection !== null) {
            connection.close(NORMAL_CLOSURE);  // This will trigger the onclose event
        } else {
            console.error("Connection not active.   ");
        }
        // Activity monitoring can be stopped.
        window.clearInterval(tradeLevelSubscription.activityMonitor);
        window.clearInterval(orderTicketSubscriptionsActivityMonitor);
        window.clearInterval(listSubscription.activityMonitor);
    }

    /**
     * Only one app can retrieve realtime prices. This is the primary app. This function makes this app the primary one. Other apps are notified and get delayed prices.
     * @return {void}
     */
    function requestPrimaryPriceSession() {
        const data = {
            "TradeLevel": "FullTradingAndChat"
        };
        fetch(
            demo.apiUrl + "/root/v1/sessions/capabilities",
            {
                "method": "PUT",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
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
     * Subscribe to price session changes.
     * @return {void}
     */
    function subscribeToTradeLevelChanges() {
        const contextId = encodeURIComponent(getContextId());
        const data = {
            "ContextId": contextId,
            "ReferenceId": tradeLevelSubscription.referenceId
        };
        if (tradeLevelSubscription.isActive) {
            // The reference id of a subscription for which the new subscription is a replacement.
            // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
            // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
            // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
            // If no such subscription exists, the ReplaceReferenceId is ignored.
            data.ReplaceReferenceId = tradeLevelSubscription.referenceId;
        }
        fetch(
            demo.apiUrl + "/root/v1/sessions/events/subscriptions",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
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
                    console.log("Subscription created " + (
                        connection === null
                        ? ""
                        : "(readyState " + connection.readyState + ") "
                    ) + "with data " + JSON.stringify(data, null, 4) + "\n\nResponse: " + JSON.stringify(responseJson, null, 4));
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
        fetch(
            demo.apiUrl + "/root/v1/user",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
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
     * This function has nothing to do with websockets, it only digs up 5 Uics to subscribe to, when AssetType is selected.
     * @return {void}
     */
    function findInstrumentsForAssetType() {

        /**
         * Convert the modified objects to a string and display in the text area.
         * @param {Array<number>} uics The list of Uics to add to the request objects.
         * @param {string} Asset type to add to the request objects.
         * @param {Object} infoPricesRequestData The request object for InfoPrices.
         * @param {Object} pricesRequestData The request object for Prices.
         * @return {void}
         */
        function addUicsToRequestObjects(uics, assetType, infoPricesRequestData, pricesRequestData) {
            infoPricesRequestData.Arguments.Uics = uics.join();
            infoPricesRequestData.Arguments.AssetType = assetType;
            document.getElementById("idInfoPricesRequestObject").value = JSON.stringify(infoPricesRequestData, null, 4);
            pricesRequestData.Arguments.Uic = uics[0];
            pricesRequestData.Arguments.AssetType = assetType;
            document.getElementById("idPricesRequestObject").value = JSON.stringify(pricesRequestData, null, 4);
        }

        /**
         * Find futures by FutureSpaceId.
         * @param {number} futureSpaceId ID from the search.
         * @param {string} Asset type to add to the request objects.
         * @param {Object} infoPricesRequestData The request object for InfoPrices.
         * @param {Object} pricesRequestData The request object for Prices.
         * @return {void}
         */
        function findFutureContracts(futureSpaceId, assetType, infoPricesRequestData, pricesRequestData) {
            fetch(
                demo.apiUrl + "/ref/v1/instruments/futuresspaces/" + futureSpaceId,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        const uics = [];
                        responseJson.Elements.forEach(function (futureContract) {
                            if (uics.length < 200) {
                                // Max 200 subscriptions are allowed for default thirdparty apps.
                                uics.push(futureContract.Uic);
                            }
                        });
                        addUicsToRequestObjects(uics, assetType, infoPricesRequestData, pricesRequestData);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        /**
         * For options, the identifier is an OptionRoot. Convert this to a Uic.
         * @param {number} optionRootId The identifier from the instrument response
         * @param {string} Asset type to add to the request objects.
         * @param {Object} infoPricesRequestData The request object for InfoPrices.
         * @param {Object} pricesRequestData The request object for Prices.
         * @return {void}
         */
        function findOptionContracts(optionRootId, assetType, infoPricesRequestData, pricesRequestData) {
            fetch(
                demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        const uics = [];
                        responseJson.OptionSpace[0].SpecificOptions.forEach(function (specificOption) {
                            if (uics.length < 200) {
                                // Max 200 subscriptions are allowed for default thirdparty apps.
                                uics.push(specificOption.Uic);
                            }
                        });
                        addUicsToRequestObjects(uics, assetType, infoPricesRequestData, pricesRequestData);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const infoPricesRequestData = getObjectFromTextArea("idInfoPricesRequestObject");
        const pricesRequestData = getObjectFromTextArea("idPricesRequestObject");
        const assetType = document.getElementById("idCbxAssetType").value;
        const includeNonTradable = (
            assetType === "StockIndex"
            ? "true"
            : "false"
        );
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + assetType + "&IncludeNonTradable=" + includeNonTradable + "&$top=5" + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const identifiers = [];
                    let instrument;
                    if (responseJson.Data.length === 0) {
                        console.error("No instrument of type " + assetType + " found.");
                    } else {
                        instrument = responseJson.Data[0];  // Just take the first instrument - it's a demo
                        if (assetType === "ContractFutures" && instrument.hasOwnProperty("DisplayHint") && instrument.DisplayHint === "Continuous") {
                            // We found an future root - get the series
                            findFutureContracts(instrument.Identifier, assetType, infoPricesRequestData, pricesRequestData);
                        } else if (instrument.SummaryType === "ContractOptionRoot") {
                            // We found an option root - get the series
                            findOptionContracts(instrument.Identifier, assetType, infoPricesRequestData, pricesRequestData);
                        } else {
                            responseJson.Data.forEach(function (instrument) {
                                identifiers.push(instrument.Identifier);
                            });
                        }
                        addUicsToRequestObjects(identifiers, assetType, infoPricesRequestData, pricesRequestData);
                        console.log("Changed object to asset of type " + assetType + ".");
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
     * Sync data of js config with the edits in the HTML.
     * @return {void}
     */
    function populateTextAreas() {
        const defaultContextId = "MyApp_" + Date.now();  // Some unique value
        let data = getObjectFromTextArea("idInfoPricesRequestObject");
        data.ContextId = defaultContextId;
        document.getElementById("idInfoPricesRequestObject").value = JSON.stringify(data, null, 4);
        data = getObjectFromTextArea("idPricesRequestObject");
        data.ContextId = defaultContextId;
        document.getElementById("idPricesRequestObject").value = JSON.stringify(data, null, 4);
    }

    demo.setupEvents([
        {"evt": "demoDataLoaded", "elmId": "", "func": populateTextAreas, "funcsToDisplay": [populateTextAreas]},
        {"evt": "change", "elmId": "idCbxAssetType", "func": findInstrumentsForAssetType, "funcsToDisplay": [findInstrumentsForAssetType]},
        {"evt": "click", "elmId": "idBtnCreateConnection", "func": createConnection, "funcsToDisplay": [createConnection]},
        {"evt": "click", "elmId": "idBtnStartListener", "func": startListener, "funcsToDisplay": [startListener]},
        {"evt": "click", "elmId": "idBtnGetMarketDataTerms", "func": getMarketDataTermsAccepted, "funcsToDisplay": [getMarketDataTermsAccepted]},
        {"evt": "click", "elmId": "idBtnRequestPrimarySession", "func": getAndKeepPrimarySession, "funcsToDisplay": [getAndKeepPrimarySession, subscribeToTradeLevelChanges, requestPrimaryPriceSession]},
        {"evt": "click", "elmId": "idBtnSubscribeList", "func": subscribeList, "funcsToDisplay": [subscribeList]},
        {"evt": "click", "elmId": "idBtnSubscribeOrderTicket", "func": subscribeOrderTicket, "funcsToDisplay": [subscribeOrderTicket]},
        {"evt": "click", "elmId": "idBtnSwitchAccount", "func": switchAccount, "funcsToDisplay": [switchAccount, recreateSubscriptions]},
        {"evt": "click", "elmId": "idBtnExtendSubscription", "func": extendSubscription, "funcsToDisplay": [extendSubscription, demo.getSecondsUntilTokenExpiry]},
        {"evt": "click", "elmId": "idBtnUnsubscribe", "func": unsubscribeAndResetState, "funcsToDisplay": [unsubscribeAndResetState, unsubscribe]},
        {"evt": "click", "elmId": "idBtnDisconnect", "func": disconnect, "funcsToDisplay": [disconnect]}
    ]);
    demo.displayVersion("trade");
}());
