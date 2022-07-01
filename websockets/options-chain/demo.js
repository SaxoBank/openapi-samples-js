/*jslint this: true, browser: true, long: true, for: true, bitwise: true, unordered: true */
/*global window console demonstrationHelper */

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
        "footerElm": document.getElementById("idFooter")
    });
    // These objects contains the state of the subscriptions, so a reconnect can be processed and health can be monitored.
    const optionsChainSubscription = {
        "referenceId": "MyOptionsChainEvent",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    let connection;
    let snapshot;  // The object containing all the data to be updated

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
     * Determine if the option root is an FxBinaryOption (with OneTouch/NoTouch, or Put/Call sides).
     * @return {boolean} When true, the AssetType is an FxBinaryOption, otherwise StockOption, StockIndexOption, FuturesOption, or FxVanillaOption
     */
    function isFxBinaryOption() {
        return snapshot.AssetType === "FxOneTouchOption" || snapshot.AssetType === "FxNoTouchOption";
    }

    /**
     * Display option chain.
     * @param {Object} optionsChain The snapshot from the response, or the incoming messages
     * @return {void}
     */
    function handleOptionsChainEvent(optionsChain) {
        // In this example the original snapshot is updated with the new data - you can do smarter than this.
        snapshot.LastUpdated = optionsChain.LastUpdated;
        try {
            if (optionsChain.hasOwnProperty("Expiries")) {
                optionsChain.Expiries.forEach(function (expiry) {
                    const snapshotExpiry = snapshot.Expiries[expiry.Index];
                    if (expiry.hasOwnProperty("Strikes") && expiry.Strikes !== null) {  // Seriously. It can be null (don't ask)
                        // Don't forget MidStrikePrice
                        expiry.Strikes.forEach(function (strike) {
                            const snapshotStrike = snapshotExpiry.Strikes[strike.Index];
                            if (isFxBinaryOption()) {
                                // See for the difference https://www.developer.saxo/openapi/learn/options-chain#OptionsChain-fields
                                if (strike.hasOwnProperty("NoTouch")) {
                                    if (strike.NoTouch.hasOwnProperty("Ask")) {
                                        snapshotStrike.NoTouch.Ask = strike.NoTouch.Ask;
                                    }
                                }
                                if (strike.hasOwnProperty("OneTouch")) {
                                    if (strike.OneTouch.hasOwnProperty("Ask")) {
                                        snapshotStrike.OneTouch.Ask = strike.OneTouch.Ask;
                                    }
                                }
                            } else {
                                if (strike.hasOwnProperty("Call")) {
                                    // Don't forget Bid, LastTraded (NetChange), Volume, Low, High - quite some work to make it complete!
                                    if (strike.Call.hasOwnProperty("Ask")) {
                                        snapshotStrike.Call.Ask = strike.Call.Ask;
                                    }
                                    if (strike.Call.hasOwnProperty("AskSize")) {
                                        snapshotStrike.Call.AskSize = strike.Call.AskSize;
                                    }
                                }
                                if (strike.hasOwnProperty("Put")) {
                                    if (strike.Put.hasOwnProperty("Ask")) {
                                        snapshotStrike.Put.Ask = strike.Put.Ask;
                                    }
                                    if (strike.Put.hasOwnProperty("AskSize")) {
                                        snapshotStrike.Put.AskSize = strike.Put.AskSize;
                                    }
                                }
                            }
                        });
                    }
                    // Keep in mind that when decreasing the subscription to less series, the data can become outdated.
                    // This can be solved by displaying the LastUpdated timestamp for the shown strike.
                });
            }
        } catch (error) {
            // Protect the software for messages with an out-of-scope index.
            console.error("Error " + error + " happened in event object " + JSON.stringify(optionsChain, null, 2));
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
     * Determine the AssetType of a given OptionRootId.
     * @param {number} optionRootId The option root
     * @param {Function} callbackOnSuccess This function is called when the request was successful
     * @return {void}
     */
    function getAssetTypeOfOptionRoot(optionRootId, callbackOnSuccess) {
        fetch(
            // Don't filter on parameter "TradingStatus=Tradable", because many series have status "NotDefined"
            demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId + "?OptionSpaceSegment=AllDates",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    callbackOnSuccess(responseJson.AssetType);  // Can differ (FuturesOption, StockOption, StockIndexOption)
                });
            } else {
                if (response.status === 404) {
                    // You can verify this using SaxoTraderGO
                    console.error("This option root is not found. Are options available for this account?");
                } else {
                    demo.processError(response);
                }
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Convert the snaphot to a string, to demo how the series matrix might look - you'll probably do this in a much smarter way.
     * @return {string} The string respresentation of the options matrix
     */
    function displayExpiries() {
        const nameOfStrike = (
            isFxBinaryOption()
            ? "Barrier"
            : "Strike"
        );
        let snapshotAsText = "";
        snapshot.Expiries.forEach(function (expiry) {
            const expiryDate = new Date(expiry.Expiry);
            snapshotAsText += "Option series with expiry date " + expiryDate.toLocaleDateString();
            snapshotAsText += ":\n";
            expiry.Strikes.forEach(function (strike) {
                snapshotAsText += " Strike " + (
                    strike.hasOwnProperty(nameOfStrike)
                    ? strike[nameOfStrike]
                    : "?"
                );
                // More prize info is available. Study the response of the subscribe request.
                if (isFxBinaryOption()) {
                    if (Object.keys(strike.NoTouch).length > 0) {
                        // Ignore empty objects
                        snapshotAsText += ", noTouch";
                        if (strike.NoTouch.hasOwnProperty("Ask")) {
                            snapshotAsText += " with ask " + strike.NoTouch.Ask;  // You will use the correct Format.Decimals from the /instrument/details endpoint?
                        }
                    }
                    if (Object.keys(strike.OneTouch).length > 0) {
                        snapshotAsText += ", oneTouch";
                        if (strike.OneTouch.hasOwnProperty("Ask")) {
                            snapshotAsText += " with ask " + strike.OneTouch.Ask;
                        }
                    }
                } else {
                    if (Object.keys(strike.Call).length > 0) {
                        // Ignore empty objects
                        snapshotAsText += ", call";
                        if (strike.Call.hasOwnProperty("Ask")) {
                            snapshotAsText += " with ask " + strike.Call.Ask;  // You will use the correct Format.Decimals from the /instrument/details endpoint?
                        }
                        if (strike.Call.hasOwnProperty("AskSize")) {
                            snapshotAsText += " volume " + strike.Call.AskSize;
                        }
                    }
                    if (Object.keys(strike.Put).length > 0) {
                        snapshotAsText += ", put";
                        if (strike.Put.hasOwnProperty("Ask")) {
                            snapshotAsText += " with ask " + strike.Put.Ask;
                        }
                        if (strike.Put.hasOwnProperty("AskSize")) {
                            snapshotAsText += " volume " + strike.Put.AskSize;
                        }
                    }
                }
                snapshotAsText += "\n";
            });
        });
        return snapshotAsText;
    }

    /**
     * The snapshot contains only relevant strikes. But updates might come in for strikes that are not available in the snapshot - just don't display empty strikes.
     * @return {void}
     */
    function prepareSnapshotForWindowUpdates() {

        function createEmptyStrike(nameOfSide1, nameOfSide2) {
            const emptyStrike = {};
            emptyStrike[nameOfSide1] = {};
            emptyStrike[nameOfSide2] = {};
            return emptyStrike;
        }

        snapshot.Expiries.forEach(function (expiry) {
            const nameOfSide1 = (
                isFxBinaryOption()
                ? "NoTouch"
                : "Call"
            );
            const nameOfSide2 = (
                isFxBinaryOption()
                ? "OneTouch"
                : "Put"
            );
            let i;
            if (expiry.hasOwnProperty("Strikes")) {
                // Make sure all strikes contain a call/put, or noTouch/oneTouch object:
                expiry.Strikes.forEach(function (strike) {
                    if (!strike.hasOwnProperty(nameOfSide1)) {
                        strike[nameOfSide1] = {};
                    }
                    if (!strike.hasOwnProperty(nameOfSide2)) {
                        strike[nameOfSide2] = {};
                    }
                });
            } else {
                expiry.Strikes = [];
                // Add empty strikes
                for (i = 0; i < expiry.StrikeCount; i += 1) {
                    expiry.Strikes.push(createEmptyStrike(nameOfSide1, nameOfSide2));
                }
            }
        });
    }

    /**
     * Create an array specifying the number of expiries.
     * @return {Array<Object>} The expiries to request
     */
    function addExpiries() {
        const strikeStartIndex = document.getElementById("idCbxStrikeStart").value;
        const expiries = [];
        let i;
        for (i = 0; i < document.getElementById("idCbxExpiries").value; i += 1) {
            // Here you can supply the number of option series with an expiry date to add to the subscription.
            // Too many subscriptions lead to a 400 "TooManyStrikesRequested: Too many strikes requested" error.
            // You can also play with the StrikeStartIndex, to move the active part to a different StrikeWindowStartIndex.
            const expiry = {
                "Index": i
            };
            if (strikeStartIndex !== "ATM") {
                // This can differ per expiry, but for the demo, this is done for all expiries.
                expiry.StrikeStartIndex = strikeStartIndex;
            }
            expiries.push(expiry);
        }
        return expiries;
    }

    /**
     * This is an example of subscribing to an options chain.
     * @return {void}
     */
    function subscribeOptionsChain() {

        function internalSubscribe(assetType) {
            const data = {
                "ContextId": document.getElementById("idContextId").value,
                "ReferenceId": optionsChainSubscription.referenceId,
                "Arguments": {
                    "AccountKey": demo.user.accountKey,
                    "AssetType": assetType,
                    "Identifier": optionRootId,
                    "MaxStrikesPerExpiry": document.getElementById("idCbxMaxStrikesPerExpiry").value,  // 100 will be the "All" value
                    "Expiries": addExpiries()
                }
            };
            if (optionsChainSubscription.isActive) {
                // There is an active subscription. Update that one, to spare a DELETE request.
                data.ReplaceReferenceId = optionsChainSubscription.referenceId;
            }
            fetch(
                demo.apiUrl + "/trade/v1/optionschain/subscriptions",
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
                    optionsChainSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                    optionsChainSubscription.isActive = true;
                    response.json().then(function (responseJson) {
                        // Monitor connection every "InactivityTimeout" seconds.
                        if (optionsChainSubscription.activityMonitor === null) {
                            optionsChainSubscription.activityMonitor = window.setInterval(function () {
                                monitorActivity(optionsChainSubscription);
                            }, responseJson.InactivityTimeout * 1000);
                        }
                        snapshot = responseJson.Snapshot;
                        prepareSnapshotForWindowUpdates();
                        console.log("Subscription for options chain created with readyState " + connection.readyState + " and data: " + JSON.stringify(data, null, 4) + "\n\nResponse: " + displayExpiries());
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const optionRootId = document.getElementById("idOptionRootId").value;
        const assetTypeSuppied = document.getElementById("idCbxAssetType").value;
        if (assetTypeSuppied === "-") {
            // First, determine the AssetType to be used:
            getAssetTypeOfOptionRoot(optionRootId, internalSubscribe);
        } else {
            // The request GET /instruments/contractoptionspaces/21 doesn't work for some option types.
            internalSubscribe(assetTypeSuppied);
        }
    }

    /**
     * This is used for scrolling the options board, by providing either another set of expiries, or specifying another set of strikes to subscribe to.
     * For changing to another instrument, it is recommended to create a new subscription and discard the old. Use the ReplaceReferenceId field, to save a DELETE request.
     * @return {void}
     */
    function updateSubscription() {
        // There is the option to PATCH the active subscription. However, a patch doesn't come with a snapshot.
        // Matching incoming data with an old snapshot of a different window, leads to issues. So just update the active subscription by using the ReplaceReferenceId.
        subscribeOptionsChain();
    }

    /**
     * Reset an options chain subscription "At The Money".
     * @return {void}
     */
    function resetSubscription() {
        // There is the option to PUT the active subscription to /ResetATM. However, a put doesn't come with a snapshot.
        // Matching incoming data with an old snapshot of a different window, leads to issues. So just update the active subscription by using the ReplaceReferenceId.
        document.getElementById("idCbxStrikeStart").value = "ATM";
        subscribeOptionsChain();
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
                        console.log("Unsubscribed to " + urlPath + ".\nReadyState " + connection.readyState + ".");
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
        const urlPathOptionsChain = "/trade/v1/optionschain/subscriptions/" + encodeURIComponent(contextId) + "/" + encodeURIComponent(optionsChainSubscription.referenceId);
        removeSubscription(optionsChainSubscription.isActive, urlPathOptionsChain, callbackOnSuccess);
    }

    /**
     * Unsubscribe and subscribe again, with the selected/active account.
     * @return {void}
     */
    function recreateSubscriptions() {
        unsubscribe(function () {
            if (optionsChainSubscription.isActive) {
                subscribeOptionsChain();
            }
        });
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
                            case optionsChainSubscription.referenceId:
                                optionsChainSubscription.isRecentDataReceived = true;
                                break;
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
                    // ProtoBuf is not supported in this example. See the realtime-quotes example for a Protocol Buffers implementation.
                    console.error("Protocol Buffers are not supported in this example.");
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
                case optionsChainSubscription.referenceId:
                    optionsChainSubscription.isRecentDataReceived = true;
                    handleOptionsChainEvent(message.payload);
                    demo.displaySourceCode([handleOptionsChainEvent]);
                    console.log(displayExpiries() + "\n\nStreaming option chain event(s) " + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
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
     * This is an example of unsubscribing, including a reset of the state.
     * @return {void}
     */
    function unsubscribeAndResetState() {
        unsubscribe(function () {
            optionsChainSubscription.isActive = false;
        });
    }

    /**
     * This is an example of disconnecting.
     * @return {void}
     */
    function disconnect() {
        const NORMAL_CLOSURE = 1000;
        connection.close(NORMAL_CLOSURE);  // This will trigger the onclose event
        // Activity monitoring can be stopped.
        window.clearInterval(optionsChainSubscription.activityMonitor);
    }

    document.getElementById("idContextId").value = "MyApp_" + Date.now();  // Some unique value
    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnCreateConnection", "func": createConnection, "funcsToDisplay": [createConnection]},
        {"evt": "click", "elmId": "idBtnStartListener", "func": startListener, "funcsToDisplay": [startListener]},
        {"evt": "click", "elmId": "idBtnSubscribeOptionsChain", "func": subscribeOptionsChain, "funcsToDisplay": [subscribeOptionsChain, addExpiries]},
        {"evt": "click", "elmId": "idBtnUpdateSubscription", "func": updateSubscription, "funcsToDisplay": [updateSubscription, subscribeOptionsChain]},
        {"evt": "click", "elmId": "idBtnResetSubscription", "func": resetSubscription, "funcsToDisplay": [resetSubscription, subscribeOptionsChain]},
        {"evt": "click", "elmId": "idBtnExtendSubscription", "func": extendSubscription, "funcsToDisplay": [extendSubscription]},
        {"evt": "click", "elmId": "idBtnUnsubscribe", "func": unsubscribeAndResetState, "funcsToDisplay": [unsubscribeAndResetState]},
        {"evt": "click", "elmId": "idBtnDisconnect", "func": disconnect, "funcsToDisplay": [disconnect]}
    ]);
    demo.displayVersion("trade");
}());
