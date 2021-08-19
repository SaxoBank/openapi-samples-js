/*jslint this: true, browser: true, for: true, long: true, bitwise: true, unordered: true */
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
    // These objects contains the state of the subscriptions, so a reconnect can be processed and health can be monitored.
    const jsonListSubscription = {
        "referenceId": "MyPriceListEvent_Json",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const protoBufListSubscription = {
        "referenceId": "MyPriceListEvent_ProtoBuf",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const orderTicketSubscriptions = [];
    const jsonOrderTicketSubscriptionReferenceIdPrefix = "MyPriceEventJson";
    const protoBufOrderTicketSubscriptionReferenceIdPrefix = "MyPriceEventProtoBuf";
    let schemaName;  // The ProtoBuf schema
    let connection;  // The websocket connection object
    let orderTicketSubscriptionsActivityMonitor = null;

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
     * This is an example of subscribing to price updates for multiple instruments, using Json.
     * @return {void}
     */
    function subscribeListJson() {
        const data = {
            "ContextId": document.getElementById("idContextId").value,
            "ReferenceId": jsonListSubscription.referenceId,
            "Arguments": {
                "AccountKey": demo.user.accountKey,
                "Uics": document.getElementById("idUics").value,
                "AssetType": document.getElementById("idCbxAssetType").value,
                // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                // MarketDepth gives the order book, when available.
                "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
            }
        };
        if (jsonListSubscription.isActive) {
            // The reference id of a subscription for which the new subscription is a replacement.
            // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
            // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
            // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
            // If no such subscription exists, the ReplaceReferenceId is ignored.
            data.ReplaceReferenceId = jsonListSubscription.referenceId;
        }
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
                jsonListSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                jsonListSubscription.isActive = true;
                response.json().then(function (responseJson) {
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (jsonListSubscription.activityMonitor === null) {
                        jsonListSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(jsonListSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    console.log("Subscription created (readyState " + connection.readyState + ") with RefreshRate " + responseJson.RefreshRate + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Convert a price subscription request to a text block to be used in a batch request.
     * @param {Object} postData Subscription data to post, containing instrument and quality of the events
     * @param {number} requestId Number of the request - this can be used to correlate responses
     * @return {string} Part of the batch request data
     */
    function addSubscriptionRequestToBatchRequest(postData, requestId) {
        const host = "https://gateway.saxobank.com";
        let fullPath = demo.apiUrl + "/trade/v1/prices/subscriptions";
        fullPath = fullPath.substring(host.length);
        return "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nPOST " + fullPath + " HTTP/1.1\r\nX-Request-Id:" + requestId + "\r\nAccept-Language:en\r\nContent-Type:application/json; charset=utf-8\r\nHost:gateway.saxobank.com\r\n\r\n" + JSON.stringify(postData) + "\r\n";
    }

    /**
     * Convert an unsubscribe request for an individual price subscription to a text block to be used in a batch request.
     * @param {number} newLength The new number of price subscriptions
     * @return {string} Part of the batch request data
     */
    function addDeleteSubscriptionRequestsToBatchRequest(newLength, requestId) {
        const host = "https://gateway.saxobank.com";
        let fullPathPrefix = demo.apiUrl + "/trade/v1/prices/subscriptions/" + document.getElementById("idContextId").value + "/";
        let request = "";
        let i;
        fullPathPrefix = fullPathPrefix.substring(host.length);
        for (i = newLength; i < orderTicketSubscriptions.length; i += 1) {
            console.log("Deleting subscription with reference " + orderTicketSubscriptions[i].referenceId);
            requestId += 1;
            request += "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nDELETE " + fullPathPrefix + orderTicketSubscriptions[i].referenceId + " HTTP/1.1\r\nX-Request-Id:" + requestId + "\r\nAccept-Language:en\r\nContent-Type:application/json; charset=utf-8\r\nHost:gateway.saxobank.com\r\n\r\n\r\n";
        }
        return request;
    }

    /**
     * Lookup the subscription in the list, to get Uic and AssetType.
     * @param {Array<Object>} subscriptions The list
     * @param {string} referenceId The reference id to lookup
     * @return {Object} The subscription
     */
    function getSubscriptionByReference(subscriptions, referenceId) {
        // The referenceId is something like "MyPriceEventJson_4" - the second part is the index.
        return subscriptions[parseInt(referenceId.substring(referenceId.indexOf("_") + 1), 10)];
    }

    /**
     * Subscribe to prices in high quality. These are meant to display on order tickets, but you can setup multiple subscriptions.
     * Multiple subscriptions are grouped into a single batch request.
     * @param {string} format Format of the events, either "json", or "protoBuf"
     * @param {Array<number>} uicList Instrument list to subscribe to
     * @return {void}
     */
    function subscribeOrderTicket(format, uicList) {
        const orderTicketSubscriptionsRequested = [];
        let postDataBatchRequest = "";
        let requestId = 0;
        // Create a batch request to create multiple subscriptions in one request.
        // More info on batch requests: https://saxobank.github.io/openapi-samples-js/batch-request/
        uicList.forEach(function (uic, i) {
            const assetType = document.getElementById("idCbxAssetType").value;
            const referenceId = (
                format === "json"
                ? jsonOrderTicketSubscriptionReferenceIdPrefix
                : protoBufOrderTicketSubscriptionReferenceIdPrefix
            ) + "_" + i;
            const data = {
                "ContextId": document.getElementById("idContextId").value,
                "ReferenceId": referenceId,
                "Arguments": {
                    "AccountKey": demo.user.accountKey,
                    "Uic": uic,
                    "AssetType": assetType,
                    "RequireTradableQuote": true,  // This field lets the server know the prices are used to base trading decisions on
                    // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                    // MarketDepth gives the order book, when available.
                    "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
                }
            };
            if (format === "protoBuf") {
                data.Format = "application/x-protobuf";  // This triggers ProtoBuf
            }
            orderTicketSubscriptionsRequested.push({
                "referenceId": referenceId,
                "uic": uic,
                "assetType": assetType
            });
            if (orderTicketSubscriptions.length > i) {
                // The reference id of a subscription for which the new subscription is a replacement.
                // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
                // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
                // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
                // If no such subscription exists, the ReplaceReferenceId is ignored.
                data.ReplaceReferenceId = referenceId;
            }
            requestId += 1;
            postDataBatchRequest += addSubscriptionRequestToBatchRequest(data, requestId);
        });
        // There is the possibility that the new list is smaller than the current list. Then subscriptions can be deleted, instead of replaced.
        // Maybe this is too complex, just for the example, but replacing subscriptions is an important topic.
        if (orderTicketSubscriptions.length > orderTicketSubscriptionsRequested.length) {
            postDataBatchRequest += addDeleteSubscriptionRequestsToBatchRequest(orderTicketSubscriptionsRequested.length, requestId);
        }
        postDataBatchRequest += "--+--\r\n";  // Add the end tag
        fetch(
            demo.apiUrl + "/trade/batch",  // Grouping is done per service group, so "/ref" for example, must be in a different batch.
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "multipart/mixed; boundary=\"+\"",
                    "Accept": "*/*",
                    "Accept-Language": "en, *;q=0.5",
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Cache-Control": "no-cache"
                },
                "body": postDataBatchRequest
            }
        ).then(function (response) {
            if (response.ok) {
                response.text().then(function (responseText) {
                    const responseArray = responseText.split("\n");
                    let responseJson;
                    let requestedSubscription;
                    let smallestInactivityTimeout = Number.MAX_VALUE;
                    orderTicketSubscriptions.length = 0;
                    responseArray.forEach(function (line) {
                        line = line.trim();
                        if (line.charAt(0) === "{") {
                            try {
                                responseJson = JSON.parse(line);
                                if (responseJson.hasOwnProperty("ErrorCode")) {
                                    // This can be something like "IllegalInstrumentId" - but this never happens in your app :-)
                                    console.error(responseJson.Message);
                                } else {
                                    console.debug(responseJson);
                                    smallestInactivityTimeout = Math.min(smallestInactivityTimeout, responseJson.InactivityTimeout);
                                    requestedSubscription = getSubscriptionByReference(orderTicketSubscriptionsRequested, responseJson.ReferenceId);
                                    orderTicketSubscriptions.push({
                                        "referenceId": responseJson.ReferenceId,
                                        "uic": requestedSubscription.uic,
                                        "assetType": requestedSubscription.assetType,
                                        "isRecentDataReceived": true,  // Start positive, will be set to 'false' after the next monitor health check.
                                        "isActive": true,
                                        "format": format
                                    });
                                    if (format === "protoBuf") {
                                        // The schema to use when parsing the messages, is send together with the snapshot.
                                        schemaName = responseJson.SchemaName;
                                        if (!parserProtobuf.addSchema(responseJson.Schema, schemaName)) {
                                            console.error("Adding schema to protobuf was not successful.");
                                        }
                                        console.log("Subscription created with RefreshRate " + responseJson.RefreshRate + ". Schema name: " + schemaName + ".\nSchema:\n" + responseJson.Schema + "\n\nSnapshot:\n" + JSON.stringify(responseJson, null, 4));
                                    } else {
                                        console.log("Subscription created with RefreshRate " + responseJson.RefreshRate + ". Snapshot:\n" + JSON.stringify(responseJson, null, 4));
                                    }
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    });
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (orderTicketSubscriptionsActivityMonitor === null) {
                        orderTicketSubscriptionsActivityMonitor = window.setInterval(function () {
                            orderTicketSubscriptions.forEach(function (orderTicketSubscription) {
                                monitorActivity(orderTicketSubscription);
                            });
                        }, smallestInactivityTimeout * 1000);
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
     * This is an example of subscribing to price updates with higher refreshRate meant for displaying in an order ticket, using Json.
     * @return {void}
     */
    function subscribeOrderTicketJson() {
        const uicList = document.getElementById("idUics").value.split(",");
        subscribeOrderTicket("json", uicList);
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
            "ReferenceId": protoBufListSubscription.referenceId,
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
        if (protoBufListSubscription.isActive) {
            // The reference id of a subscription for which the new subscription is a replacement.
            // Subscription replacement can be used to improve performance when one subscription must be replaced with another. The primary use-case is for handling the _resetsubscriptions control message.
            // Without replacement and the alternative DELETE request, throttling issues might occur with too many subscriptions.
            // If a subscription with the reference id indicated by ReplaceReferenceId exists, it is removed and the subscription throttling counts are updated before the new subscription is created.
            // If no such subscription exists, the ReplaceReferenceId is ignored.
            data.ReplaceReferenceId = protoBufListSubscription.referenceId;
        }
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
                protoBufListSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                protoBufListSubscription.isActive = true;
                response.json().then(function (responseJson) {
                    // The schema to use when parsing the messages, is send together with the snapshot.
                    schemaName = responseJson.SchemaName;
                    if (!parserProtobuf.addSchema(responseJson.Schema, schemaName)) {
                        console.error("Adding schema to protobuf was not successful.");
                    }
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (protoBufListSubscription.activityMonitor === null) {
                        protoBufListSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(protoBufListSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    console.log("Subscription created (readyState " + connection.readyState + ") with RefreshRate: " + responseJson.RefreshRate + ".\nSchema name: " + schemaName + ".\nSchema:\n" + responseJson.Schema);
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
        const uicList = document.getElementById("idUics").value.split(",");
        subscribeOrderTicket("protoBuf", uicList);
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
        // Make sure this is done sequentially, to prevent throttling issues when new subscriptions are created.
        removeSubscription(jsonListSubscription.isActive || protoBufListSubscription.isActive, urlPathInfoPrices, function () {
            removeSubscription(orderTicketSubscriptions.length > 0, urlPathPrices, callbackOnSuccess);
        });
    }

    /**
     * Unsubscribe and subscribe again, with the selected/active account.
     * @return {void}
     */
    function recreateSubscriptions() {
        const uicsForJson = [];
        const uicsForProtoBuf = [];
        if (jsonListSubscription.isActive) {
            subscribeListJson();
        }
        if (protoBufListSubscription.isActive) {
            subscribeListProtoBuf();
        }
        orderTicketSubscriptions.forEach(function (subscription) {
            if (subscription.format === "json") {
                uicsForJson.push(subscription.uic);
            } else {
                uicsForProtoBuf.push(subscription.uic);
            }
        });
        if (uicsForJson.length > 0) {
            subscribeOrderTicket("json", uicsForJson);
        }
        if (uicsForProtoBuf.length > 0) {
            subscribeOrderTicket("protoBuf", uicsForProtoBuf);
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
                            case jsonListSubscription.referenceId:
                                jsonListSubscription.isRecentDataReceived = true;
                                break;
                            case protoBufListSubscription.referenceId:
                                protoBufListSubscription.isRecentDataReceived = true;
                                break;
                            default:
                                orderTicketSubscriptions.forEach(function (orderTicketSubscription) {
                                    if (orderTicketSubscription.referenceId === heartbeat.OriginatingReferenceId) {
                                        orderTicketSubscription.isRecentDataReceived = true;
                                    }
                                });
                            }
                            console.debug("No data, but heartbeat received for " + heartbeat.OriginatingReferenceId + " @ " + new Date().toLocaleTimeString());
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
         * This function processes the price update messages - the most important part.
         * @param {Object} message The update
         * @param {number} bundleId The bundle identifier
         * @param {number} bundleCount The bundle number
         * @return {void}
         */
        function handlePriceUpdate(message, bundleId, bundleCount) {
            const subscription = getSubscriptionByReference(orderTicketSubscriptions, message.referenceId);
            console.log("Individual price update event " + message.messageId + " received (" + bundleId + " of " + bundleCount + ") with reference id " + message.referenceId + ":\nUic " + subscription.uic + " " + subscription.assetType + "\n" + JSON.stringify(message.payload, null, 4));
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
            messages.forEach(function (message, i) {
                switch (message.referenceId) {
                case jsonListSubscription.referenceId:
                    jsonListSubscription.isRecentDataReceived = true;
                    // Notice that the format of the messages of the two list endpoints is different.
                    // The /prices contain no Uic, that must be derived from the referenceId.
                    // Since /infoprices is about lists, it always contains the Uic.
                    console.log("Price list update event " + message.messageId + " received in bundle of " + messages.length + " (reference id " + message.referenceId + "):\n" + JSON.stringify(message.payload, null, 4));
                    break;
                case protoBufListSubscription.referenceId:
                    protoBufListSubscription.isRecentDataReceived = true;
                    console.log("Price list update event " + message.messageId + " received in bundle of " + messages.length + " (reference id " + message.referenceId + "):\n" + JSON.stringify(message.payload, null, 4));
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
                    orderTicketSubscriptions.forEach(function (orderTicketSubscription) {
                        if (orderTicketSubscription.referenceId === message.referenceId) {
                            orderTicketSubscription.isRecentDataReceived = true;
                        }
                    });
                    if (message.referenceId.substr(0, jsonOrderTicketSubscriptionReferenceIdPrefix.length) === jsonOrderTicketSubscriptionReferenceIdPrefix || message.referenceId.substr(0, protoBufOrderTicketSubscriptionReferenceIdPrefix.length) === protoBufOrderTicketSubscriptionReferenceIdPrefix) {
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
            jsonListSubscription.isActive = false;
            protoBufListSubscription.isActive = false;
            orderTicketSubscriptions.length = 0;
        });
    }

    /**
     * This is an example of disconnecting the socket.
     * @return {void}
     */
    function disconnect() {
        const NORMAL_CLOSURE = 1000;
        connection.close(NORMAL_CLOSURE);  // This will trigger the onclose event
        // Activity monitoring can be stopped.
        window.clearInterval(orderTicketSubscriptionsActivityMonitor);
        window.clearInterval(protoBufListSubscription.activityMonitor);
        window.clearInterval(jsonListSubscription.activityMonitor);
    }

    /**
     * This function has nothing to do with websockets, it only digs up 5 Uics to subscribe to, when AssetType is selected.
     * @return {void}
     */
    function findInstrumentsForAssetType() {

        /**
         * Find futures by FutureSpaceId.
         * @param {number} futureSpaceId ID from the search.
         * @return {void}
         */
        function findFutureContracts(futureSpaceId) {
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
                        document.getElementById("idUics").value = uics.join();
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
         * @return {void}
         */
        function findOptionContracts(optionRootId) {
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
                        document.getElementById("idUics").value = uics.join();
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const assetType = document.getElementById("idCbxAssetType").value;
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + assetType + "&IncludeNonTradable=false&$top=5" + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
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
                            findFutureContracts(instrument.Identifier);
                        } else if (instrument.SummaryType === "ContractOptionRoot") {
                            // We found an option root - get the series
                            findOptionContracts(instrument.Identifier);
                        } else {
                            responseJson.Data.forEach(function (instrument) {
                                identifiers.push(instrument.Identifier);
                            });
                            document.getElementById("idUics").value = identifiers.join();
                        }
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

    document.getElementById("idContextId").value = "MyApp_" + Date.now();  // Some unique value
    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAssetType", "func": findInstrumentsForAssetType, "funcsToDisplay": [findInstrumentsForAssetType]},
        {"evt": "click", "elmId": "idBtnCreateConnection", "func": createConnection, "funcsToDisplay": [createConnection]},
        {"evt": "click", "elmId": "idBtnStartListener", "func": startListener, "funcsToDisplay": [startListener]},
        {"evt": "click", "elmId": "idBtnSubscribeListJson", "func": subscribeListJson, "funcsToDisplay": [subscribeListJson]},
        {"evt": "click", "elmId": "idBtnSubscribeOrderTicketJson", "func": subscribeOrderTicketJson, "funcsToDisplay": [subscribeOrderTicketJson, subscribeOrderTicket]},
        {"evt": "click", "elmId": "idBtnSubscribeListProtoBuf", "func": subscribeListProtoBuf, "funcsToDisplay": [subscribeListProtoBuf]},
        {"evt": "click", "elmId": "idBtnSubscribeOrderTicketProtoBuf", "func": subscribeOrderTicketProtoBuf, "funcsToDisplay": [subscribeOrderTicketProtoBuf, subscribeOrderTicket]},
        {"evt": "click", "elmId": "idBtnSwitchAccount", "func": switchAccount, "funcsToDisplay": [switchAccount, recreateSubscriptions]},
        {"evt": "click", "elmId": "idBtnExtendSubscription", "func": extendSubscription, "funcsToDisplay": [extendSubscription]},
        {"evt": "click", "elmId": "idBtnUnsubscribe", "func": unsubscribeAndResetState, "funcsToDisplay": [unsubscribeAndResetState, unsubscribe]},
        {"evt": "click", "elmId": "idBtnDisconnect", "func": disconnect, "funcsToDisplay": [disconnect]}
    ]);
    demo.displayVersion("trade");
}());
