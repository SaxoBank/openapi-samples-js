import * as long from 'long';

var refIdCounter = 0;

class priceSubscription {
    constructor() {
        this.authTokenElm = document.getElementsByClassName('js-auth-token')[0];
        this.tokenSubmitTextElm = document.getElementsByClassName('token-submit')[0];
        this.reSubmitTextElm = document.getElementsByClassName('resubmit-status')[0];
        this.subscribeButtonElm = document.getElementsByClassName('js-btn-subscribe')[0];
        this.subscriptionDataElm = document.getElementsByClassName('js-snapshot')[0];
        this.reconnectionDataElm = document.getElementsByClassName('js-snapshot-reconnect')[0];
        this.handleTokenSubmit = this.handleTokenSubmit.bind(this);
        this.parseMessages = this.parseMessages.bind(this);
        this.checkControlMessages = this.checkControlMessages.bind(this);
        this.IsControlMessage = this.IsControlMessage.bind(this);
        this.resetSubscription = this.resetSubscription.bind(this);
        this.handleSubscribePrices = this.handleSubscribePrices.bind(this);
        this.handleDisconnection = this.handleDisconnection.bind(this);
        this.handleReconnection = this.handleReconnection.bind(this);
        this.authorizeToken = this.authorizeToken.bind(this);
        this.contextIdElem = document.getElementsByClassName('js-ctx-id')[0];
        this.referenceIdElem = document.getElementsByClassName('js-refId')[0];
        this.newAccessTokenElem = document.getElementsByClassName('js-newToken')[0];
        this.newTokenStatus = document.getElementsByClassName('newToken-status')[0];
        this.lastReceivedMessageId = "";
        this.messageIDArray = [];
        this.priceSubscriptionUrl = "https://gateway.saxobank.com/sim/openapi/trade/v1/prices/subscriptions";
        this.webSocketConnectionUrl = "wss://streaming.saxobank.com/sim/openapi/streamingws/connect";
        this.webSocketAuthorizationUrl = "https://streaming.saxobank.com/sim/openapi/streamingws/authorize";
    }

    handleTokenSubmit(e) {
        e.preventDefault();
        this.handleConnection();
    }
    handleConnection() {
        let connectionUrl;
        let self = this;
        this.accessToken = this.authTokenElm.value.trim();
        this.contextId = this.contextIdElem.value.trim();
        if (this.accessToken) {
            if (this.messageIDArray.length > 0) {
                connectionUrl = this.webSocketConnectionUrl + "?contextId=" + this.contextId + "&Authorization=BEARER%20" + this.accessToken + "&messageid=" + this.lastReceivedMessageId;
            }
            else {
                connectionUrl = this.webSocketConnectionUrl + "?contextId=" + this.contextId + "&Authorization=BEARER%20" + this.accessToken;
            }
            let connection = new WebSocket(connectionUrl);
            connection.binaryType = "arraybuffer";
            connection.onopen = function (webSocket) {
                // connection is opened and ready to use
                self.tokenSubmitTextElm.innerHTML = 'connection created';
                self.subscribeButtonElm.classList.remove('disabled');
                self.connection = connection;
                //After creation of connection we are authorizing the token if it is expired or not.
                //Start a task to renew the token when neeeded. If we don't do this the connection will be terminated once the token expires.
                self.tokenDummyExpiryTime = Date.now() + (2 * 60 * 60 * 1000);
                //Here you need to provide the correct expiry time for the token. This is just a dummy value of 2 hrs.
                self.authorizeWhenNeeded(self.tokenDummyExpiryTime);
            };
            connection.onerror = function (error) {
                // an error occurred when sending/receiving data
                console.log(error);
                self.subscribeButtonElm.classList.add('disabled');
                self.tokenSubmitTextElm.innerHTML = "Couldn't create connection";
            };

            connection.onmessage = function (message) {
                if (message.data instanceof ArrayBuffer) {
                    var messageResults = self.parseMessages(message.data, self.subscriptionDataElm);

                    console.log('Number of received messages in frame: ', messageResults.length);

                    messageResults.forEach(function(messageResult) {
                        if (self.IsControlMessage(messageResult)) {
                            self.checkControlMessages(messageResult);
                        }
                        else {
                            console.log("Messages successfully delivered: ", messageResult);
                            self.messageIDArray.push(messageResult.messageId);
                            self.lastReceivedMessageId = messageResult.messageId;
                        }
                    });
                }
                else if (typeof message.data === 'string') {
                    self.handleDisconnection(1000, "Policy Violated .GoodBye!");
                    console.log("Closing connection - Reason: received a text frame.");
                }
            };
            connection.onclose = function (event) {
                if (event.code === 1001) {
                    console.log("Server is going away! We will try to reconnect");
                    self.handleConnection();
                } else {
                    console.log("Normal Closure");
                    self.tokenSubmitTextElm.innerHTML = "Connection Closed";
                    self.messageIDArray=[];
                }
            };
        }
        else {
            this.tokenSubmitTextElm.innerHTML = "Please Enter valid access token";
        }
    }

    authorizeWhenNeeded(tokenExpiryTime) {
        var self = this;
        var tokenExpiryTimeOneMinuteBefore = tokenExpiryTime - Date.now() - 60000;
        var checkExpiryHandle = setTimeout(checkExpiry, tokenExpiryTimeOneMinuteBefore);
        function checkExpiry() {
            console.log("Token " + self.accessToken + "expired");
            var refreshedToken = self.newAccessToken || "<refreshedToken>";
            self.authorizeToken(refreshedToken).then((successMessage) => {
                console.log("New Token Authorized ", successMessage);
                // Getting new dummy expiry time  for token .Taking two hours as dummy
                self.tokenDummyExpiryTime = Date.now() + (2 * 60 * 60 * 1000);
                clearTimeout(checkExpiryHandle);
                self.authorizeWhenNeeded(self.tokenDummyExpiryTime);
            }).catch((reason) => {
                console.log("New Token not authorized with reason", reason);
                self.handleDisconnection(1000, "Token has expired.Hence Closing");
            });
        }
    }

    IsControlMessage(parsedMessage) {
        return parsedMessage.referenceId.startsWith("_");
    }

    checkControlMessages(parsedMessage) {
        if (!parsedMessage.referenceId.startsWith("_")) {
            console.log("Message With" + parsedMessage.messageId + "with reference id " + parsedMessage.referenceId + " is not a Control Message");
        }
        switch (parsedMessage.referenceId) {
            case "_heartbeat":
                // HeartBeat messages indicate that no new data is available. You do not need to do anything
                var heartBeatMessage = parsedMessage;
                console.log("HeartBeat control message received", heartBeatMessage);
                break;
            case "_resetsubscriptions":
                // Server is not able to send messages and client needs to reset subscriptions by recreating them
                console.log("Reset Susbcription Control messsage received", parsedMessage);
                // reset subscription
                this.resetSubscription(parsedMessage);
                break;
            case "_disconnect":
                // The server has disconnected the client.This messages requires This messages requires you to reauthenticate
                // if you wish to continue receiving messages.We stop the websocket here.
                this.handleDisconnection(1000, "Server Disconnected");
                break;
            default:
                console.log("Control Message with unknown referenceId is shown " + parsedMessage.referenceId);
        }
    }

    resetSubscription(controlMessage) {
        var payload = JSON.parse(controlMessage.payload);
        var referenceId = payload.ReferenceId;
        var targetReferenceIds = payload.targetReferenceIds;
        // Delete the subscriptions the server tells us need to be reconnected.
        try {
            this.deleteSubscription(targetReferenceIds);
        }
        catch (e) {
            console.log("Error in deleting subscription", e);
            return;
        }
        // Next create the subscription again.
        // You should keep track of a list of your subscriptions so you know which ones you have to recreate.
        // Here we only have one subscription to illustrate the point.
        this.handleSubscribePrices();
    }

    deleteSubscription(referenceIds) {
        // Here we are deleting the subscription for all the referenceIds passed.
        // But in this implementation only one subscription exists.
        let deleteSubscriptionUrl = this.priceSubscriptionUrl + "/" + this.contextId + "/" + this.referenceIdElem.value.trim();
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.status === 201) {
                console.log("Subscription Deleted");
                console.log(this.responseText);
            }
        };
        xhttp.onerror = function () {
            console.log("An error occurred during the http request");
        };
        xhttp.open("DELETE", deleteSubscriptionUrl, true);
        xhttp.setRequestHeader("Authorization", "BEARER " + this.accessToken);
        xhttp.send();
    }

    subscribePrice(refId) {
        let data = {
            "Arguments": {
                "Uic": 21,
                "AssetType": "FxSpot"
            },
            "ContextId": this.contextId,
            "ReferenceId": refId
        };

        let subscriptionData = JSON.stringify(data);
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.status === 201) {
                console.log(this.responseText);
            }
        };
        xhttp.onerror = function () {
            console.log(" An error occurred during the http request");
        };
        xhttp.open("POST", this.priceSubscriptionUrl, true);
        xhttp.setRequestHeader("Authorization", "BEARER " + this.accessToken);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(subscriptionData);
    }

    getNextRefId(refId) {
        return refId + ++refIdCounter;
    }

    handleSubscribePrices(refId) {
        if (this.accessToken) {
            var baseRefId = refId || this.referenceIdElem.value.trim();

            // Creating 3 subscription to test response updates contains 3 messages in one websocket frame.
            this.subscribePrice(baseRefId);
            this.subscribePrice(this.getNextRefId(baseRefId));
            this.subscribePrice(this.getNextRefId(baseRefId));
        } else {
            this.tokenSubmitTextElm.innerHTML = "Please Enter Access Token";
        }
    }

    parseMessages(data, dataElm) {
        let index = 0;

        let messages = [];

        while (index < data.byteLength)
        {
            let message = new DataView(data);
            // First 8 bytes make up the message id. A 64 bit integer.
            let messageId = long.fromBytesLE(new Uint8Array(data, 0, 8)).toString();
            index += 8;
            // 2 bytes make up the reserved field.This field is reserved for future use and it should be ignored by the client.
            let reservedField = message.getInt16(index);
            index += 2;
            // 1 byte makes up the reference id length as an 8 bit integer. The reference id has a max length og 50 chars.
            let referenceIdSize = message.getInt8(index);
            index += 1;
            // n bytes make up the reference id. The reference id is an ASCII string.
            let referenceIdBuffer = new Int8Array(data.slice(index, index + referenceIdSize));
            let referenceId = String.fromCharCode.apply(String, referenceIdBuffer);
            index += referenceIdSize;
            // 1 byte makes up the payload format. The value 0 indicates that the payload format is Json.
            let payloadFormat = message.getUint8(index);
            index++;
            // 4 bytes make up the payload length as a 32 bit integer.
            let payloadSize = message.getUint32(index, true);
            index += 4;
            // n bytes make up the actual payload. In the case of the payload format being Json, this is a UTF8 encoded string.
            let payloadBuffer = new Int8Array(data.slice(index, index + payloadSize));
            let payload;
            if (!payloadFormat) {
                payload = String.fromCharCode.apply(String, payloadBuffer);
                dataElm.innerHTML = this.prettyPrint(JSON.parse(payload));
            }

            index += payloadSize;

            messages[messages.length] = {
                    messageId,
                    reservedField,
                    referenceId,
                    payloadFormat,
                    payload
                };
        }

        return messages;

    }

    handleDisconnection(code, reason) {
        // Closing the connection by closing the socket
        this.connection.close(code || 1000, reason || "Normal Closure");
        console.log("Connection is closed  with " + code + " with " + reason);
    }

    handleReconnection() {
        let self = this;
        if (this.accessToken) {
            let connectionUrl = this.webSocketConnectionUrl + "?contextId=" + this.contextId + "&Authorization=BEARER%20" + this.accessToken + "&messageId=" + this.lastReceivedMessageId;
            this.connection2 = new WebSocket(connectionUrl);
            this.connection2.binaryType = "arraybuffer";
            this.connection2.onopen = function (ws) {
                // connection is opened and ready to use
                self.reSubmitTextElm.innerHTML = 'Reconnection created';
            };
            this.connection2.onerror = function (error) {
                // an error occurred when sending/receiving data
                console.log(error);
                self.reSubmitTextElm.innerHTML = "Couldn't create Reconnection";
            };
            this.connection2.onmessage = function (message) {
                if (message.data instanceof ArrayBuffer) {
                    var messagesParsed = self.parseMessages(message.data, self.reconnectionDataElm);
                    console.log('Number of received messages in frame: ', messagesParsed.length);

                    messagesParsed.forEach(function(messageParsed) {
                        console.log(messageParsed);
                    });
                }
            };
        }
    }

    authorizeToken(refreshedToken) {
        let self = this;
        this.newAccessToken = refreshedToken || this.newAccessTokenElem.value.trim();
        const subscriptionUrl = this.webSocketAuthorizationUrl + "?contextId=" + this.contextId;
        return new Promise((resolve, reject) => {
            let xhttp = new XMLHttpRequest();
            xhttp.open("PUT", subscriptionUrl, true);
            xhttp.setRequestHeader("Authorization", "BEARER " + this.newAccessToken);
            xhttp.setRequestHeader("Content-Type", "application/json");
            xhttp.onreadystatechange = function () {
                if (this.status === 202) {
                    self.newTokenStatus.innerHTML = "New Token is Valid";
                    self.accessToken = self.newAccessToken;
                    resolve(this.responseText);
                }
                else if (this.status === 400) {
                    self.newTokenStatus.innerHTML = "ContextId and AccessToken Missing";
                    reject(this.statusText);
                }
                else if (this.status === 401) {
                    self.newTokenStatus.innerHTML = "Access Token is not valid";
                    reject(this.statusText);
                }
            };
            xhttp.onerror = function () {
                console.log(" An error occurred during the http request");
                reject(this.statusText);
            };
            xhttp.send();
        }
        );
    }

    prettyPrint(obj) {
        if (!obj) {
            return '';
        }
        return JSON.stringify(obj, null, 3);
    }
}
// creating a new instance of class to expose handlers to html
const subscribePrices = new priceSubscription();
window.subscribePrices = subscribePrices;
