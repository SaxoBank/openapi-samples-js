/*jslint browser: true, for: true, long: true, bitwise: true, unordered: true */
/*global window console demonstrationHelper */

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
    const tradeLevelSubscription = {
        "referenceId": "TradeLevelEvent",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const orderticketSubscription = {
        "referenceId": "",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    const optionsChainSubscription = {
        "referenceId": "",
        "isActive": false,
        "activityMonitor": null,
        "isRecentDataReceived": false
    };
    let connection = null;  // The websocket connection object
    // This is just the default.
    let displayAndFormat = null;
    let primarySessionRequestCount = 0;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The PriceSubscriptionObject from the input field - null if invalid
     */
    function getPriceSubscriptionObjectFromJson() {
        let priceSubscriptionObject = null;
        try {
            priceSubscriptionObject = JSON.parse(document.getElementById("idPriceSubscriptionObject").value);
            if (demo.user.accountKey !== undefined) {
                priceSubscriptionObject.Arguments.AccountKey = demo.user.accountKey;
            }
            document.getElementById("idPriceSubscriptionObject").value = JSON.stringify(priceSubscriptionObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return priceSubscriptionObject;
    }

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
            if (newOrderObject.hasOwnProperty("AccountKey")) {
                // This is the case for single orders, or conditional/related orders
                // This function is used for other order types as well, so more order types are considered
                newOrderObject.AccountKey = demo.user.accountKey;
            }
            if (newOrderObject.hasOwnProperty("Orders")) {
                // This is the case for OCO, related and conditional orders
                newOrderObject.Orders.forEach(function (order) {
                    if (order.hasOwnProperty("AccountKey")) {
                        order.AccountKey = demo.user.accountKey;
                    }
                });
            }
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Get a list of FX option expiry dates .
     * @return {void}
     */
    function getExpiryDates() {
        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        fetch(
            demo.apiUrl + "/ref/v1/standarddates/fxoptionexpiry/" + priceSubscriptionObject.Arguments.Uic,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Response:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of making the current app primary, so real time prices can be shown. Other apps are notified and get delayed prices.
     * Info on keeping this: https://saxobank.github.io/openapi-samples-js/websockets/primary-monitoring/
     * @return {void}
     */
    function requestPrimaryPriceSession() {
        fetch(
            demo.apiUrl + "/root/v1/sessions/capabilities",
            {
                "method": "PUT",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "TradeLevel": "FullTradingAndChat"
                })
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("Requested FullTradingAndChat session capabilities, so prices are realtime.\nExample on monitoring and keeping FullTradingAndChat:\nhttps://saxobank.github.io/openapi-samples-js/websockets/primary-monitoring/");
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
        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        const data = {
            "ContextId": priceSubscriptionObject.ContextId,
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
        if (connection === null) {
            createConnection(priceSubscriptionObject.ContextId);
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
                    console.log("Subscribed to price session changes with response: " + JSON.stringify(responseJson, null, 4));
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
     * Example of formatting a value according to the DisplayAndFormat.
     * @param {Object} displayAndFormat The format rules.
     * @param {number} value The value to be formatted.
     * @return {string} The formatted number.
     */
    function displayAndFormatValue(displayAndFormat, value) {

        /**
         * Round a value to a number of decimals.
         * @param {number} valueToRound Input value.
         * @param {number} decimalPlaces Number of decimals to round to.
         * @return {number} The rounded value.
         */
        function round(valueToRound, decimalPlaces) {
            const factorOfTen = Math.pow(10, decimalPlaces);
            return Math.round(valueToRound * factorOfTen) / factorOfTen;
        }

        /**
         * Return the value as a string, rounded according to given decimals.
         * @return {string} The formatted value.
         */
        function displayWithNormalFormatting() {
            return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + " " + displayAndFormat.Currency;
        }

        /**
         * Return the value as a string, using the DecimalPips display format.
         * @param {number} numberOfPips Return with one or two smaller decimals.
         * @return {string} The formatted value.
         */
        function displayWithDecimalPips(numberOfPips) {
            // displayAndFormat = {"Currency":"USD","Decimals":4,"Description":"Example AllowDecimalPips","DisplayHint":"PreciousMetal","Format":"AllowDecimalPips","OrderDecimals":4,"Symbol":"XAGUSD"}
            // value = 0.01084
            // return = 0,0108 4
            const pipsCodes = [8304, 185, 178, 179, 8308, 8309, 8310, 8311, 8312, 8313];  // Unicode superscript codes of 0..9
            const positionOfDecimalSeparator = String(value).indexOf(".");
            const roundedValue = round(value, displayAndFormat.Decimals + numberOfPips);  // Round, so the correct value is shown if input has more decimals.
            // Truncate value to allowed decimals:
            const truncatedValue = Math.trunc(roundedValue * Math.pow(10, displayAndFormat.Decimals)) / Math.pow(10, displayAndFormat.Decimals);
            const fractionPart = (
                positionOfDecimalSeparator === -1
                ? String(roundedValue)
                : String(roundedValue).slice(positionOfDecimalSeparator + 1)
            );
            let pipsPart = "";
            let i;
            if (fractionPart.length > displayAndFormat.Decimals) {
                for (i = displayAndFormat.Decimals; i < fractionPart.length; i += 1) {
                    pipsPart += String.fromCharCode(pipsCodes[parseInt(fractionPart.charAt(i), 10)]);
                }
            }
            return truncatedValue.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals}) + pipsPart + " " + displayAndFormat.Currency;
        }

        /**
         * Return the value as a string, using the Fractions display format.
         * @return {string} The formatted value.
         */
        function displayWithFractions() {
            // displayAndFormat = {"Currency":"USD","Decimals":5,"Description":"Example Fractions","Format":"Fractions","OrderDecimals":5,"Symbol":"UNITEDSTATES-2.5-15FEB45"}
            // value = 101.44731
            // return = 101 14/32 USD
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            // In a few cases the value for the numerator can be a decimal number itself. The number of decimals on the numerator is then indicated by the NumeratorDecimals value.
            const numeratorText = (
                displayAndFormat.hasOwnProperty("NumeratorDecimals")
                ? numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals})
                : String(Math.round(numerator))
            );
            return integerPart + " " + numeratorText + "/" + Math.pow(2, displayAndFormat.Decimals) + " " + displayAndFormat.Currency;
        }

        /**
         * Return the value as a string, using the ModernFractions display format.
         * @return {string} The formatted value.
         */
        function displayWithModernFractions() {
            // displayAndFormat = {"Currency":"USD","Decimals":5,"Description":"Example ModernFractions","DisplayHint":"Continuous","Format":"ModernFractions","LotSizeText":"100000","NumeratorDecimals":1,"OrderDecimals":5,"Symbol":"TNc1"}
            // value = 139.328125
            // return = 139'10.5
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            const numeratorText = (
                displayAndFormat.hasOwnProperty("NumeratorDecimals")
                ? numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals})
                : String(Math.round(numerator))
            );
            return integerPart + "'" + numeratorText + " " + displayAndFormat.Currency;
        }

        if (value === undefined || value === null) {
            return "(not available)";
        }
        if (displayAndFormat.hasOwnProperty("Format")) {
            switch (displayAndFormat.Format) {
            case "Normal":  // Standard decimal formatting is used with the Decimals field indicating the number of decimals.
                return displayWithNormalFormatting();
            case "Percentage":  // Display as percentage, e.g. 12.34%.
                return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + "%";
            case "AllowDecimalPips":  // Display the last digit smaller than the rest of the numbers. Note that this digit is not included in the number of decimals, effectively increasing the number of decimals by one. E.g. 12.345 when Decimals is 2 and DisplayFormat is AllowDecimalPips.
                return displayWithDecimalPips(1);
            case "AllowTwoDecimalPips":  // Display the last 2 digits smaller than the rest of the numbers. Note that these digits are not included in the number of decimals, effectively increasing the number of decimals by two. E.g. 12.3453 when Decimals is 2 and DisplayFormat is AllowTwoDecimalPips.
                return displayWithDecimalPips(2);
            case "Fractions":  // Display as regular fraction i.e. 3 1/4 where 1=numerator and 4=denominator.
                return displayWithFractions();
            case "ModernFractions":  // Special US Bonds futures fractional format (1/32s or 1/128s without nominator). If PriceDecimals = -5 then the nominator is 32, else 128.
                return displayWithModernFractions();
            default:
                console.error("Unsupported price format: " + displayAndFormat.Format);
                throw "Unsupported format";
            }
        } else {
            // No format returned, use "Normal":
            return displayWithNormalFormatting();
        }
    }

    /**
     * This function processes the price update messages - the most important part.
     * @param {Object} quote The Quote object from Snapshot or update
     * @return {void}
     */
    function processQuote(quote) {

        /**
         * Round a value to a number of decimals.
         * @return {number} The rounded value.
         */
        function round(valueToRound, decimalPlaces) {
            const factorOfTen = Math.pow(10, decimalPlaces);
            return Math.round(valueToRound * factorOfTen) / factorOfTen;
        }

        const newOrderObject = getOrderObjectFromJson();
        const tradeWarningElm = document.getElementById("idTradeable");
        let buttonElm;
        let price;
        let tradeWarning;
        if (quote.hasOwnProperty("Ask")) {
            price = quote.Ask;
            buttonElm = document.getElementById("idBtnPlaceNewBuyOrder");
            buttonElm.value = "Buy @ " + displayAndFormatValue(displayAndFormat, price);
            buttonElm.dataset.price = price;
        }
        if (quote.hasOwnProperty("Bid")) {
            price = quote.Bid;
            buttonElm = document.getElementById("idBtnPlaceNewSellOrder");
            buttonElm.value = "Sell @ " + displayAndFormatValue(displayAndFormat, price);
            buttonElm.dataset.price = price;
        }
        if (quote.hasOwnProperty("Mid")) {
            newOrderObject.UserPrice = round(quote.Mid, displayAndFormat.StrikeDecimals);
        }
        newOrderObject.QuoteId = quote.QuoteId;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        if (quote.hasOwnProperty("PriceTypeBid") || quote.hasOwnProperty("PriceTypeAsk")) {
            if ((quote.hasOwnProperty("PriceTypeBid") && quote.PriceTypeBid !== "Tradable") || (quote.hasOwnProperty("PriceTypeAsk") && quote.PriceTypeAsk !== "Tradable")) {
                // Stop trying to place orders..
                tradeWarning = "This option is not tradable (PriceTypeBid=" + quote.PriceTypeBid + " and PriceTypeAsk=" + quote.PriceTypeAsk + ").\nTry a different StrikePrice or ExpiryDate.";
                tradeWarningElm.setAttribute("style", "background-color: #e10c02; color: #ffffff;");
                tradeWarningElm.innerText = tradeWarning;
                console.error(tradeWarning);
            } else {
                tradeWarningElm.setAttribute("style", "background-color: White; color: Green;");
                tradeWarningElm.innerText = "This option is tradable (PriceTypeBid=" + quote.PriceTypeBid + " and PriceTypeAsk=" + quote.PriceTypeAsk + ")";
            }
        }
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

        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        const urlPathOptionChain = "/trade/v1/optionschain/subscriptions/" + encodeURIComponent(priceSubscriptionObject.ContextId);
        const urlPathPrices = "/trade/v1/prices/subscriptions/" + encodeURIComponent(priceSubscriptionObject.ContextId);
        // Make sure this is done sequentially, to prevent throttling issues when new subscriptions are created.
        removeSubscription(optionsChainSubscription.isActive, urlPathOptionChain, function () {
            removeSubscription(orderticketSubscription.isActive, urlPathPrices, callbackOnSuccess);
        });
    }

    /**
     * Unsubscribe and subscribe again, with the selected/active account.
     * @return {void}
     */
    function recreateSubscriptions() {
        unsubscribe(function () {
            if (orderticketSubscription.isActive) {
                subscribePriceSubscription();
            }
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
                            case orderticketSubscription.referenceId:
                                orderticketSubscription.isRecentDataReceived = true;
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
            const maxRequests = 4;
            if (primarySessionRequestCount < maxRequests) {
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
            const lastUpdated = new Date(message.payload.LastUpdated);
            if (message.payload.hasOwnProperty("Quote")) {
                processQuote(message.payload.Quote);
                console.log("Price update event " + message.messageId + " received (" + bundleId + " of " + bundleCount + ") last updated " + lastUpdated.toLocaleTimeString() + ":\n" + JSON.stringify(message.payload, null, 4));
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
                case tradeLevelSubscription.referenceId:
                    handleTradeLevelMessage(message.payload);
                    console.log("Streaming trade level change event " + message.messageId + " received: " + JSON.stringify(message.payload, null, 4));
                    break;
                case orderticketSubscription.referenceId:
                    orderticketSubscription.isRecentDataReceived = true;
                    handlePriceUpdate(message, i + 1, messages.length);
                    break;
                case optionsChainSubscription.referenceId:
                    optionsChainSubscription.isRecentDataReceived = true;
                    // Ignore this update for now. But You want to upgrade the strike prices, because of the high liquidity of FxOptions.
                    break;
                default:
                    console.error("No processing implemented for message with reference id: " + message.referenceId);
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
     * This is an example of constructing the websocket connection.
     * @param {string} contextId Context for the streaming session.
     * @return {void}
     */
    function createConnection(contextId) {
        const accessToken = document.getElementById("idBearerToken").value;
        const streamerUrl = demo.streamerUrl + "?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
        if (!isWebSocketsSupportedByBrowser()) {
            console.error("This browser doesn't support WebSockets.");
            throw "This browser doesn't support WebSockets.";
        }
        if (contextId !== encodeURIComponent(contextId)) {
            console.error("Invalid characters in Context ID.");
            throw "Invalid characters in Context ID.";
        }
        try {
            connection = new window.WebSocket(streamerUrl);
            connection.binaryType = "arraybuffer";
            startListener();
            console.log("Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState + ".");
            // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
            // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        } catch (error) {
            console.error("Error creating websocket. " + error);
        }
    }

    /**
     * Change expiry and strike with data from the options chain.
     * @return {void}
     */
    function updateStrikePrice() {
        const strikePriceElm = document.getElementById("idCbxStrikePrice");
        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        priceSubscriptionObject.Arguments.StrikePrice = strikePriceElm.value;
        document.getElementById("idPriceSubscriptionObject").value = JSON.stringify(priceSubscriptionObject, null, 4);
        console.log("Changed ExpiryDate and StrikePrice.");
    }

    /**
     * Convert a date to the reqiured format for the subscription.
     * @param {Object} date Javescript Date object.
     * @return {void}
     */
    function addExpiryDateToPriceSubscriptionObject(date) {

        /**
         * Prefix number with zero, if it has one digit.
         * @param {number} n The one or two digit number representing day or month.
         * @return {string} The formatted number.
         */
        function addLeadingZero(n) {
            return (
                n > 9
                ? String(n)
                : "0" + n
            );
        }

        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        priceSubscriptionObject.Arguments.ExpiryDate = date.getFullYear() + "-" + addLeadingZero(date.getMonth() + 1) + "-" + addLeadingZero(date.getDate());
        document.getElementById("idPriceSubscriptionObject").value = JSON.stringify(priceSubscriptionObject, null, 4);
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
     * Collect the strike prices for an expiry date using the options chain request.
     * More info: https://saxobank.github.io/openapi-samples-js/websockets/options-chain/
     * @return {void}
     */
    function subscribeOptionsChain() {

        function getDisplayAndFormat(priceSubscriptionObject) {
            const uic = priceSubscriptionObject.Arguments.Uic;
            const assetType = priceSubscriptionObject.Arguments.AssetType;
            const accountKey = priceSubscriptionObject.Arguments.AccountKey;
            fetch(
                demo.apiUrl + "/ref/v1/instruments/details/" + uic + "/" + assetType + "?AccountKey=" + encodeURIComponent(accountKey) + "&ClientKey=" + encodeURIComponent(demo.user.clientKey),
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        displayAndFormat = responseJson.Format;
                        // Add Currency to the object (not really consistent, @SaxoBank!)
                        displayAndFormat.Currency = responseJson.CurrencyCode;
                        // .. and request the options chain again:
                        subscribeOptionsChain();
                    });
                } else {
                    // If you get a 404 NotFound, the order might already be executed!
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        function populateStrikes(strikes, strikeWindowStartIndex) {
            const cbxStrikePrice = document.getElementById("idCbxStrikePrice");
            let option;
            let i;
            // Clear the combobox:
            for (i = cbxStrikePrice.options.length - 1; i >= 0; i -= 1) {
                cbxStrikePrice.remove(i);
            }
            // Add new strikes:
            strikes.forEach(function (strike) {
                option = document.createElement("option");
                option.text = displayAndFormatValue(displayAndFormat, strike.Strike);
                option.value = strike.Strike;
                if (strike.Index === strikeWindowStartIndex) {
                    option.setAttribute("selected", true);  // Select most active contract
                }
                cbxStrikePrice.add(option);
            });
        }

        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        const data = {
            "ContextId": priceSubscriptionObject.ContextId,
            "ReferenceId": "MyOptionsChainReferenceId",
            "Arguments": {
                "AccountKey": demo.user.accountKey,
                "AssetType": priceSubscriptionObject.Arguments.AssetType,
                "Identifier": priceSubscriptionObject.Arguments.Uic,
                "MaxStrikesPerExpiry": 1,  // 100 will be the "All" value
                "Expiries": [{
                    "Index": 0
                }]
            }
        };
        if (optionsChainSubscription.isActive) {
            // There is an active subscription. Update that one, to spare a DELETE request.
            data.ReplaceReferenceId = optionsChainSubscription.referenceId;
        }
        if (displayAndFormat === null) {
            // First request. Displaying the StrikePrices uses the DisplayAndFormat. Get them.
            // Your app probably already did this request..
            getDisplayAndFormat(priceSubscriptionObject);
            return;
        }
        if (connection === null) {
            createConnection(priceSubscriptionObject.ContextId);
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
                optionsChainSubscription.referenceId = data.ReferenceId;
                optionsChainSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                optionsChainSubscription.isActive = true;
                response.json().then(function (responseJson) {
                    let strikesPopulated = false;
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (optionsChainSubscription.activityMonitor === null) {
                        optionsChainSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(optionsChainSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    // For this demo: show the strikes of the nearest expiry date
                    responseJson.Snapshot.Expiries.forEach(function (expiry) {
                        if (!strikesPopulated && expiry.hasOwnProperty("Strikes")) {
                            strikesPopulated = true;
                            populateStrikes(expiry.Strikes, expiry.StrikeWindowStartIndex);
                            updateStrikePrice();
                            addExpiryDateToPriceSubscriptionObject(new Date(expiry.Expiry));
                        }
                    });
                });
            } else {
                // If you get a 404 NotFound, the order might already be executed!
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Create or update a price subscription.
     * @return {void}
     */
    function subscribePriceSubscription() {
        const priceSubscriptionObject = getPriceSubscriptionObjectFromJson();
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.ContextId = priceSubscriptionObject.ContextId;
        newOrderObject.PriceReferenceId = priceSubscriptionObject.ReferenceId;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        if (orderticketSubscription.isActive) {
            // There is an active subscription. Update that one, to spare a DELETE request.
            priceSubscriptionObject.ReplaceReferenceId = orderticketSubscription.referenceId;
            document.getElementById("idPriceSubscriptionObject").value = JSON.stringify(priceSubscriptionObject, null, 4);
        }
        if (connection === null) {
            createConnection(priceSubscriptionObject.ContextId);
        }
        fetch(
            demo.apiUrl + "/trade/v1/prices/subscriptions",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(priceSubscriptionObject)
            }
        ).then(function (response) {
            if (response.ok) {
                orderticketSubscription.referenceId = priceSubscriptionObject.ReferenceId;
                orderticketSubscription.isRecentDataReceived = true;  // Start positive, will be set to 'false' after the next monitor health check.
                orderticketSubscription.isActive = true;
                response.json().then(function (responseJson) {
                    const quote = responseJson.Snapshot.Quote;
                    const instrumentPriceDetails = responseJson.Snapshot.InstrumentPriceDetails;
                    displayAndFormat = responseJson.Snapshot.DisplayAndFormat;
                    // Monitor connection every "InactivityTimeout" seconds.
                    if (orderticketSubscription.activityMonitor === null) {
                        orderticketSubscription.activityMonitor = window.setInterval(function () {
                            monitorActivity(orderticketSubscription);
                        }, responseJson.InactivityTimeout * 1000);
                    }
                    // Log before the quote processing, because that processing has output too. With F12 you can see all log lines.
                    console.log("ExpiryDate " + instrumentPriceDetails.ExpiryDate + " and StrikePrice " + instrumentPriceDetails.StrikePrice + ".\n\nResponse: " + JSON.stringify(responseJson, null, 4));
                    processQuote(quote);
                });
            } else {
                // If you get a 404 NotFound, the order might already be executed!
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of placing a single leg order.
     * @return {void}
     */
    function placeNewOrder(newOrderObject) {
        fetch(
            demo.apiUrl + "/trade/v1/positions",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4));
                    window.alert("New PositionId: " + responseJson.PositionId);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    /**
     * This is an example of placing a single leg sell order.
     * @return {void}
     */
    function placeNewSellOrder() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.BuySell = "Sell";
        newOrderObject.UserPrice = document.getElementById("idBtnPlaceNewSellOrder").dataset.price;
        placeNewOrder(newOrderObject);
    }

    /**
     * This is an example of placing a single leg buy order.
     * @return {void}
     */
    function placeNewBuyOrder() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.BuySell = "Buy";
        newOrderObject.UserPrice = document.getElementById("idBtnPlaceNewBuyOrder").dataset.price;
        placeNewOrder(newOrderObject);
    }

    /**
     * Make sure the expiry date is not in the past.
     * @return {void}
     */
    function updateExpiryDateToSomeFutureDate() {
        const today = new Date();
        const inFourWeeks = new Date(today.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);
        addExpiryDateToPriceSubscriptionObject(inFourWeeks);
    }

    /**
     * This is an example of requesting the positions.
     * @return {void}
     */
    function getPositions() {
        fetch(
            demo.apiUrl + "/port/v1/positions?FieldGroups=PositionIdOnly,PositionBase&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const cbxPositions = document.getElementById("idCbxPosition");
                    let option;
                    let i;
                    // Clear the combobox:
                    for (i = cbxPositions.options.length - 1; i >= 0; i -= 1) {
                        cbxPositions.remove(i);
                    }
                    responseJson.Data.forEach(function (position) {
                        if (position.PositionBase.AssetType === "FxVanillaOption") {
                            option = document.createElement("option");
                            option.text = position.PositionId + (
                                position.PositionBase.CanBeClosed
                                ? " - can be closed"
                                : " - cannot be closed"
                            );
                            option.value = position.PositionId;
                            cbxPositions.add(option);
                        }
                    });
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    updateExpiryDateToSomeFutureDate();
    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxStrikePrice", "func": updateStrikePrice, "funcsToDisplay": [updateStrikePrice]},
        {"evt": "click", "elmId": "idBtnGetExpiryDates", "func": getExpiryDates, "funcsToDisplay": [getExpiryDates]},
        {"evt": "click", "elmId": "idBtnGetOptionsChain", "func": subscribeOptionsChain, "funcsToDisplay": [subscribeOptionsChain]},
        {"evt": "click", "elmId": "idBtnUpdatePriceSubscription", "func": subscribePriceSubscription, "funcsToDisplay": [subscribePriceSubscription]},
        {"evt": "click", "elmId": "idBtnGetPrimarySession", "func": subscribeToTradeLevelChanges, "funcsToDisplay": [subscribeToTradeLevelChanges, requestPrimaryPriceSession]},
        {"evt": "click", "elmId": "idBtnPlaceNewSellOrder", "func": placeNewSellOrder, "funcsToDisplay": [placeNewSellOrder, placeNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewBuyOrder", "func": placeNewBuyOrder, "funcsToDisplay": [placeNewBuyOrder, placeNewOrder]},
        {"evt": "click", "elmId": "idBtnGetPositions", "func": getPositions, "funcsToDisplay": [getPositions]}
    ]);
    demo.displayVersion("trade");
}());
