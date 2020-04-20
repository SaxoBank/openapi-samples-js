/*jslint this: true, browser: true, for: true, long: true */
/*global window console WebSocket accountKey clientKey run processError apiUrl displayVersion */

let connection;

/**
 * This is an example of getting the trading settings of an instrument.
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
    console.log("Connection created. ReadyState: " + connection.readyState);
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
            const message = new DataView(data);
            const bytes = new Uint8Array(data);
            const messageId = message.getInt8();
            const refBeginIndex = 10;
            const refIdLength = message.getInt8(refBeginIndex);
            const refId = String.fromCharCode.apply(String, bytes.slice(refBeginIndex + 1, refBeginIndex + 1 + refIdLength));
            const payloadBeginIndex = refBeginIndex + 1 + refIdLength;
            const payloadLength = message.getUint32(payloadBeginIndex + 1, true);
            const segmentEnd = payloadBeginIndex + 5 + payloadLength;
            const payload = String.fromCharCode.apply(String, bytes.slice(payloadBeginIndex + 5, segmentEnd));
            const block = JSON.parse(payload);
            console.debug("Message " + messageId + " parsed with referenceId " + refId + " and payload: " + payload);
            switch (refId) {
            case "MyOrderEvent":
                console.log("Streaming message received: " + JSON.stringify(block, null, 4));
                break;
            case "MyPositionEvent":
                console.log("Streaming message received: " + JSON.stringify(block, null, 4));
                console.debug("Position event to be processed:");
                break;
            case "_heartbeat":
                break;
            default:
                console.debug("No processing implemented for message with reference " + refId);
            }
            block.ReferenceId = refId;
            block.MessageID = messageId;
            return {
                "segmentEnd": segmentEnd,
                "messages": block
            };
        } catch (error) {
            console.error("Parse message failed: " + error);
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
        const reader = new FileReader();
        console.debug("Streaming message received");
        reader.readAsArrayBuffer(event.data);
        reader.onloadend = function () {
            let beginAt;
            let data = reader.result;
            let parsedMessage;
            do {
                parsedMessage = parseStreamingMessage(data);
                beginAt = parsedMessage.segmentEnd;
                data = data.slice(beginAt);
            } while (data.byteLength > 0);
        };
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
