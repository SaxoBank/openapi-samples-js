/*jslint this: true, browser: true, for: true, long: true */
/*global window console WebSocket accountKey run processError processNetworkError */

var connection;

/**
 * This is an example of getting the trading settings of an instrument.
 * @return {void}
 */
function createConnection() {
    var accessToken = document.getElementById("idBearerToken").value;
    var contextId = encodeURIComponent(document.getElementById("idContextId").value);
    var streamerUrl = "wss://gateway.saxobank.com/sim/openapi/streamingws/connect?authorization=" + encodeURIComponent("BEARER " + accessToken) + "&contextId=" + contextId;
    if (contextId !== document.getElementById("idContextId").value) {
        throw "Invalid characters in Context ID.";
    }
    connection = new WebSocket(streamerUrl);
    document.getElementById("idResponse").innerText = "Connection created. ReadyState: " + connection.readyState;
    // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
    // 0 = CONNECTING, 1 = OPEN
}

/**
 * This is an example of parsing event messages.
 * @return {void}
 */
function startListener() {

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
            case "MyOrderEvent":
                document.getElementById("idResponse").innerText = "Streaming message received: " + payload;
                console.log("Order event to be processed:");
                break;
            case "MyPositionEvent":
                document.getElementById("idResponse").innerText = "Streaming message received: " + payload;
                console.log("Position event to be processed:");
                break;
            case "_heartbeat":
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
            throw error;
        }
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
    connection.onmessage = function (event) {
        // Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
        var reader = new FileReader();
        console.log("Streaming message received");
        reader.readAsArrayBuffer(event.data);
        reader.onloadend = function () {
            var beginAt;
            var data = reader.result;
            var parsedMessage;
            do {
                parsedMessage = parseStreamingMessage(data);
                beginAt = parsedMessage.segmentEnd;
                data = data.slice(beginAt);
            } while (data.byteLength > 0);
        };
    };
    document.getElementById("idResponse").innerText = "Connection subscribed to events. ReadyState: " + connection.readyState;
}

/**
 * This is an example of subscribing to changes in active orders.
 * @return {void}
 */
function subscribeOrders() {
    var data = {
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
        "https://gateway.saxobank.com/sim/openapi/ens/v1/activities/subscriptions",
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
            document.getElementById("idResponse").innerText = "Subscription for order changes created with data '" + JSON.stringify(data) + "'. ReadyState: " + connection.readyState;
        } else {
            processError(response);
        }
    }).catch(function (error) {
        processNetworkError(error);
    });
}

/**
 * This is an example of subscribing to changes in net positions.
 * @return {void}
 */
function subscribePositions() {
    var data = {
        "ContextId": document.getElementById("idContextId").value,
        "ReferenceId": "MyPositionEvent",
        "Arguments": {
            "AccountKey": accountKey
        }
    };
    fetch(
        "https://gateway.saxobank.com/sim/openapi/port/v1/netpositions/subscriptions",
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
            document.getElementById("idResponse").innerText = "Subscription for position changes created with data '" + JSON.stringify(data) + "'. ReadyState: " + connection.readyState;
        } else {
            processError(response);
        }
    }).catch(function (error) {
        processNetworkError(error);
    });
}

/**
 * This is an example of extending the websocket session, when a token refresh took place.
 * @return {void}
 */
function extendSubscription() {
    fetch(
        "https://gateway.saxobank.com/sim/openapi/streamingws/authorize?contextid=" + encodeURIComponent(document.getElementById("idContextId").value),
        {
            "method": "PUT",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + accessToken
            }
        }
    ).then(function (response) {
        if (response.ok) {
            document.getElementById("idResponse").innerText = "Subscription extended";
        } else {
            processError(response);
        }
    }).catch(function (error) {
        processNetworkError(error);
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
}());
