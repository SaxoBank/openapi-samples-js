/*jslint this: true, browser: true, for: true, long: true */
/*global window console WebSocket accountKey run processError */

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
    document.getElementById("idResponse").innerText = "Connection created. ReadyState: " + connection.readyState;
    // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
    // 0 = CONNECTING, 1 = OPEN
}

/**
 * This is an example of getting the trading settings of an instrument.
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
            console.log("Message " + messageId + " parsed with referenceId " + refId + " and payload: " + payload);
            block.ReferenceId = refId;
            block.MessageID = messageId;
            switch (refId) {
            case "MyTradeLevelChangeEvent":
                document.getElementById("idResponse").innerText = "Streaming message received: " + payload;
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
        }
    }

    connection.onmessage = function (event) {
        // Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
        const reader = new FileReader();
        console.log("Streaming message received");
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
    document.getElementById("idResponse").innerText = "Connection subscribed to events. ReadyState: " + connection.readyState;
}

/**
 * This is an example of setting the trading settings of an instrument.
 * @return {void}
 */
function subscribe() {
    const data = {
        "ContextId": document.getElementById("idContextId").value,
        "ReferenceId": "MyTradeLevelChangeEvent"
    };

    fetch(
        apiUrl + "/root/v1/sessions/events/subscriptions",
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
            document.getElementById("idResponse").innerText = "Subscription created with data '" + JSON.stringify(data) + "'. ReadyState: " + connection.readyState;
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of making the current app primary, so real time prices can be shown. Other apps are notified and get delayed prices.
 * @return {void}
 */
function becomePrimary() {
    fetch(
        apiUrl + "/root/v1/sessions/capabilities",
        {
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Content-Type": "application/json; charset=utf-8"
            },
            "body": JSON.stringify({
                "TradeLevel": "FullTradingAndChat"
            }),
            "method": "PUT"
        }
    ).then(function (response) {
        if (response.ok) {
            document.getElementById("idResponse").innerText = "Requested to become primary";
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of making the current app primary, so real time prices can be shown again. Other apps are notified and get delayed prices.
 * @return {void}
 */
function becomePrimaryAgain() {
    fetch(
        apiUrl + "/root/v1/sessions/capabilities",
        {
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Content-Type": "application/json; charset=utf-8"
            },
            "body": JSON.stringify({
                "TradeLevel": "FullTradingAndChat"
            }),
            "method": "PATCH"
        }
    ).then(function (response) {
        if (response.ok) {
            document.getElementById("idResponse").innerText = "Requested to become primary";
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idContextId").value = "MyApp_" + Date.now();  // Some unique value
    document.getElementById("idBtnCreateConnection").addEventListener("click", function () {
        run(createConnection);
    });
    document.getElementById("idBtnStartListener").addEventListener("click", function () {
        run(startListener);
    });
    document.getElementById("idBtnSubscribe").addEventListener("click", function () {
        run(subscribe);
    });
    document.getElementById("idBtnBecomePrimary").addEventListener("click", function () {
        run(becomePrimary);
    });
    document.getElementById("idBtnBecomePrimaryAgain").addEventListener("click", function () {
        run(becomePrimaryAgain);
    });
}());
