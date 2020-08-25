/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

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
        "footerElm": document.getElementById("idFooter")
    });
    const fictivePrice = 70;  // SIM doesn't allow calls to price endpoint for most instruments
    let lastOrderId = 0;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Modify the order object so the elements comply to the order type.
     * @return {void}
     */
    function selectOrderType() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
        newOrderObject.AccountKey = demo.user.accountKey;
        delete newOrderObject.OrderPrice;
        delete newOrderObject.StopLimitPrice;
        delete newOrderObject.TrailingstopDistanceToMarket;
        delete newOrderObject.TrailingStopStep;
        switch (newOrderObject.OrderType) {
        case "Limit":  // A buy order will be executed when the price falls below the provided price point; a sell order when the price increases beyond the provided price point.
            fetch(
                demo.apiUrl + "/trade/v1/infoprices?AssetType=" + newOrderObject.AssetType + "&uic=" + newOrderObject.Uic,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        newOrderObject.OrderPrice = fictivePrice;  // SIM doesn't allow calls to price endpoint for most instruments, otherwise responseJson.Quote.Bid
                        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                        console.log("Result of price request due to switch to 'Limit':\n" + JSON.stringify(responseJson, null, 4));
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
            break;
        case "Market":  // Order is attempted filled at best price in the market.
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "StopIfBid":  // A buy order will be executed when the bid price increases to the provided price point; a sell order when the price falls below.
        case "StopIfOffered":  // A buy order will be executed when the ask price increases to the provided price point; a sell order when the price falls below.
        case "StopIfTraded":  // A buy order will be executed when the last price increases to the provided price point; a sell order when the price falls below.
            newOrderObject.OrderPrice = fictivePrice;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "StopLimit":  // A buy StopLimit order will turn in to a regular limit order once the price goes beyond the OrderPrice. The limit order will have a OrderPrice of the StopLimitPrice.
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.StopLimitPrice = fictivePrice + 1;  // Some other fictivePrice
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "TrailingStop":  // A trailing stop order type is used to guard a position against a potential loss, but the order price follows that of the position when the price goes up. It does so in steps, trying to keep a fixed distance to the current price.
        case "TrailingStopIfBid":
        case "TrailingStopIfOffered":
        case "TrailingStopIfTraded":
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.TrailingstopDistanceToMarket = 1;
            newOrderObject.TrailingStopStep = 0.1;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        default:
            console.error("Unsupported order type " + newOrderObject.OrderType);
        }
    }

    /**
     * Adjust the order object in the textarea so the related properties comply with the chosen order duration.
     * @return {void}
     */
    function selectOrderDuration() {
        const newOrderObject = getOrderObjectFromJson();
        const now = new Date();
        newOrderObject.OrderDuration.DurationType = document.getElementById("idCbxOrderDuration").value;
        switch (newOrderObject.OrderDuration.DurationType) {
        case "DayOrder":
        case "GoodTillCancel":
        case "FillOrKill":
        case "ImmediateOrCancel":  // The order is working for a very short duration and when the time is up, the order is canceled. What ever fills happened in the short time, is what constitute a position. Primarily used for Fx and CFDs.
            delete newOrderObject.OrderDuration.ExpirationDateTime;
            delete newOrderObject.OrderDuration.ExpirationDateContainsTime;
            break;
        case "GoodTillDate":  // Requires an explicit date. Cancellation of the order happens at some point on that date.
            now.setDate(now.getDate() + 3);  // Add 3x24 hours to now
            now.setSeconds(0, 0);
            newOrderObject.OrderDuration.ExpirationDateTime = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "T" + now.getHours() + ":" + now.getMinutes() + ":00";  // Example: 2020-03-20T14:00:00
            newOrderObject.OrderDuration.ExpirationDateContainsTime = true;
            break;
        default:
            console.error("Unsupported order duration " + newOrderObject.OrderDuration.DurationType);
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    /**
     * Add the order types which are allowed for this account to the combo box. Pre-select the type which was selected before.
     * @param {Array} orderTypes The order types to be added.
     * @param {string} selectedOrderType The order type to be selected.
     * @return {void}
     */
    function populateSupportedOrderTypes(orderTypes, selectedOrderType) {
        const cbxOrderType = document.getElementById("idCbxOrderType");
        let option;
        let isSelectedOrderTypeAllowed = false;
        let i;
        for (i = cbxOrderType.options.length - 1; i >= 0; i -= 1) {
            cbxOrderType.remove(i);
        }
        orderTypes.sort();
        for (i = 0; i < orderTypes.length; i += 1) {
            option = document.createElement("option");
            option.text = orderTypes[i];
            option.value = orderTypes[i];
            if (orderTypes[i] === selectedOrderType) {
                option.setAttribute("selected", true);  // Make the selected type the default one
                isSelectedOrderTypeAllowed = true;
            }
            cbxOrderType.add(option);
        }
        if (!isSelectedOrderTypeAllowed) {
            selectOrderType();  // The current order type is not supported. Change to a different one
        }
    }

    /**
     * This demo can be used for not only Stocks. You can change the model in the editor to Bond, SrdOnStock, etc.
     * @param {Object} responseJson The response with the references.
     * @return {string} A message pointing you at the feature to change the order object.
     */
    function getRelatedAssetTypesMessage(responseJson) {
        let result = "";
        let i;
        let relatedInstrument;

        function addAssetTypeToMessage(assetType) {
            if (relatedInstrument.AssetType === assetType) {
                result += (
                    result === ""
                    ? ""
                    : "\n\n"
                ) + "The response below indicates there is a related " + assetType + ".\nYou can change the order object to AssetType '" + assetType + "' and Uic '" + relatedInstrument.Uic + "' to test " + assetType + " orders.";
            }
        }

        if (responseJson.hasOwnProperty("RelatedInstruments")) {
            for (i = 0; i < responseJson.RelatedInstruments.length; i += 1) {
                relatedInstrument = responseJson.RelatedInstruments[i];
                addAssetTypeToMessage("Bond");
                addAssetTypeToMessage("SrdOnStock");
                // The other way around works as well. Show message for Stock.
                addAssetTypeToMessage("Stock");
            }
        }
        if (responseJson.hasOwnProperty("RelatedOptionRootsEnhanced")) {
            // Don't loop. Just take the first, for demo purposes.
            relatedInstrument = responseJson.RelatedOptionRootsEnhanced[0];
            result += (
                result === ""
                ? ""
                : "\n\n"
            ) + "The response below indicates there are related options.\nYou can use OptionRootId '" + relatedInstrument.OptionRootId + "' in the options example.";
        }
        return result;
    }

    /**
     * This is an example of getting the trading settings of an instrument.
     * @return {void}
     */
    function getConditions() {

        function checkSupportedOrderTypes(orderObject, orderTypes) {
            if (orderTypes.indexOf(orderObject.OrderType) === -1) {
                window.alert("The order type " + orderObject.OrderType + " is not supported for this instrument.");
            }
        }

        function calculateFactor(tickSize) {
            let numberOfDecimals = 0;
            if ((tickSize % 1) !== 0) {
                numberOfDecimals = tickSize.toString().split(".")[1].length;
            }
            return Math.pow(10, numberOfDecimals);
        }

        function checkTickSize(orderObject, tickSize) {
            const factor = calculateFactor(tickSize);  // Modulo doesn't support fractions, so multiply with a factor
            if (Math.round(orderObject.OrderPrice * factor) % Math.round(tickSize * factor) !== 0) {
                window.alert("The price of " + orderObject.OrderPrice + " doesn't match the tick size of " + tickSize);
            }
        }

        function checkTickSizes(orderObject, tickSizeScheme) {
            let tickSize = tickSizeScheme.DefaultTickSize;
            let i;
            for (i = 0; i < tickSizeScheme.Elements.length; i += 1) {
                if (orderObject.OrderPrice <= tickSizeScheme.Elements[i].HighPrice) {
                    tickSize = tickSizeScheme.Elements[i].TickSize;  // The price is below a threshold and therefore not the default
                    break;
                }
            }
            checkTickSize(orderObject, tickSize);
        }

        function checkMinimumTradeSize(orderObject, detailsObject) {
            if (orderObject.Amount < detailsObject.MinimumTradeSize) {
                window.alert("The order amount must be at least the minimumTradeSize of " + detailsObject.MinimumTradeSize);
            }
        }

        function checkMinimumOrderValue(orderObject, detailsObject) {
            const price = (
                orderObject.hasOwnProperty("OrderPrice")
                ? orderObject.OrderPrice
                : fictivePrice  // SIM doesn't allow calls to price endpoint for most instruments so just take something
            );
            if (orderObject.Amount * price < detailsObject.MinimumOrderValue) {
                window.alert("The order value (amount * price) must be at least the minimumOrderValue of " + detailsObject.MinimumOrderValue);
            }
        }

        function checkLotSizes(orderObject, detailsObject) {
            if (orderObject.Amount < detailsObject.MinimumLotSize) {
                window.alert("The amount must be at least the minimumLotSize of " + detailsObject.MinimumLotSize);
            }
            if (detailsObject.hasOwnProperty("LotSize") && orderObject.Amount % detailsObject.LotSize !== 0) {
                window.alert("The amount must be the lot size or a multiplication of " + detailsObject.LotSize);
            }
        }

        const newOrderObject = getOrderObjectFromJson();
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&FieldGroups=OrderSetting",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    populateSupportedOrderTypes(responseJson.SupportedOrderTypes, newOrderObject.OrderType);
                    console.log(getRelatedAssetTypesMessage(responseJson) + "\n\n" + JSON.stringify(responseJson, null, 4));
                    if (responseJson.IsTradable === false) {
                        window.alert("This instrument is not tradable!");
                    }
                    checkSupportedOrderTypes(newOrderObject, responseJson.SupportedOrderTypes);
                    if (newOrderObject.OrderType !== "Market" && newOrderObject.OrderType !== "TraspasoIn") {
                        if (responseJson.hasOwnProperty("TickSizeScheme")) {
                            checkTickSizes(newOrderObject, responseJson.TickSizeScheme);
                        } else if (responseJson.hasOwnProperty("TickSize")) {
                            checkTickSize(newOrderObject, responseJson.TickSize);
                        }
                    }
                    checkMinimumTradeSize(newOrderObject, responseJson);
                    if (newOrderObject.AssetType === "Stock") {
                        checkMinimumOrderValue(newOrderObject, responseJson);
                    }
                    if (newOrderObject.AssetType === "Stock" && responseJson.LotSizeType !== "NotUsed") {
                        checkLotSizes(newOrderObject, responseJson);
                    }
                    if (responseJson.IsComplex) {
                        // Show a warning before placing an order in a complex product.
                        switch (demo.user.language) {
                        case "fr":
                            window.alert("Votre ordre porte sur un produit ou service complexe pour lequel vous devez avoir une connaissance et une expérience appropriées. Pour plus d’informations, veuillez consulter nos vidéos pédagogiques et nos guides.\nEn validant cet ordre, vous reconnaissez avoir été informé des risques de cette transaction.");
                            break;
                        default:
                            window.alert("Your order relates to a complex product or service for which you must have appropriate knowledge and experience. For more information, please see our instructional videos and guides.\nBy validating this order, you acknowledge that you have been informed of the risks of this transaction.");
                        }
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
     * This is an example of getting the costs of this order.
     * @return {void}
     */
    function getOrderCosts() {

        function getHoldingPeriod(yearsToHold) {
            const currentDate = new Date();
            const targetDate = new Date();
            const millisecondsInOneDay = 1000 * 60 * 60 * 24;
            targetDate.setFullYear(targetDate.getFullYear() + yearsToHold);
            return Math.round(Math.abs((targetDate - currentDate) / millisecondsInOneDay));
        }

        function getCostsForLeg(holdingPeriodInDays, costs) {
            let result = "";
            let i;
            let item;
            if (costs.hasOwnProperty("TradingCost")) {
                if (costs.TradingCost.hasOwnProperty("Commissions")) {
                    for (i = 0; i < costs.TradingCost.Commissions.length; i += 1) {
                        item = costs.TradingCost.Commissions[i];
                        result += "\nCommission: " + item.Rule.Currency + " " + item.Value + " (" + item.Pct + "%)";
                    }
                }
                if (costs.TradingCost.hasOwnProperty("Spread")) {  // FxSpot
                    result += "\nSpread: " + costs.Currency + " " + costs.TradingCost.Spread.Value + " (" + costs.TradingCost.Spread.Pct + "%)";
                }
                if (costs.TradingCost.hasOwnProperty("ExchangeFee")) {  // Futures
                    result += "\nExchange fee: " + costs.TradingCost.ExchangeFee.Value + " (" + costs.TradingCost.ExchangeFee.Pct + "%)";
                }
            }
            if (costs.hasOwnProperty("FundCost")) {  // ETFs
                if (costs.FundCost.hasOwnProperty("OnGoingCost")) {
                    result += "\nOngoing costs: " + costs.Currency + " " + costs.FundCost.OnGoingCost.Value + " (" + costs.FundCost.OnGoingCost.Pct + "%)";
                }
            }
            if (costs.hasOwnProperty("HoldingCost")) {
                if (costs.HoldingCost.hasOwnProperty("Tax")) {
                    for (i = 0; i < costs.HoldingCost.Tax.length; i += 1) {
                        item = costs.HoldingCost.Tax[i];
                        result += "\n" + item.Rule.Description + ": " + item.Value + " (" + item.Pct + "%)";
                    }
                }
                if (costs.HoldingCost.hasOwnProperty("TomNext")) {
                    result += "\nTom Next: " + costs.HoldingCost.TomNext.Value + " (" + costs.HoldingCost.TomNext.Pct + "%)";
                }
            }
            if (costs.hasOwnProperty("TrailingCommission")) {
                result += "\nTrailing Commission: " + costs.TrailingCommission.Value + " (" + costs.TrailingCommission.Pct + "%)";
            }
            result += "\nTotal costs for open and close after " + holdingPeriodInDays + " days: " + costs.Currency + " " + costs.TotalCost + " (" + costs.TotalCostPct + "%)";
            return result;
        }

        function getAssumptions(assumptions) {
            let result = "Assumption(s):";
            let i;
            for (i = 0; i < assumptions.length; i += 1) {
                switch (assumptions[i]) {
                case "IncludesOpenAndCloseCost":
                    result += "\n* Includes both open and close costs.";
                    break;
                case "EquivalentOpenAndClosePrice":
                    result += "\n* Open and close price are the same (P/L=0).";
                    break;
                case "BasisOnLastClosePrice":
                    result += "\n* Based on last close price.";  // Only applicable when Price is not supplied
                    break;
                case "ConversionCostNotIncluded":
                    result += "\n* Conversion costs are excluded.";
                    break;
                case "InterbankChargesExcluded":
                    result += "\n* Excludes interbank charges.";
                    break;
                default:
                    console.debug("Unsupported assumption code: " + assumptions[i]);
                }
            }
            // Add generic assumption:
            result += "\n* Any third party payments, investment service costs or financial instrument costs not listed above are 0 (0%). These can include one-off charges, ongoing charges, costs related to transactions, charges that are related to ancillary services and incidental costs.";
            return result;
        }

        // https://www.developer.saxo/openapi/learn/mifid-2-cost-reporting
        const newOrderObject = getOrderObjectFromJson();
        const price = (
            newOrderObject.hasOwnProperty("OrderPrice")
            ? newOrderObject.OrderPrice
            : fictivePrice  // SIM doesn't allow calls to price endpoint for most instruments so just take something
        );
        fetch(
            demo.apiUrl + "/cs/v1/tradingconditions/cost/" + encodeURIComponent(demo.user.accountKey) + "/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?Amount=" + newOrderObject.Amount + "&Price=" + price + "&FieldGroups=DisplayAndFormat&HoldingPeriodInDays=" + getHoldingPeriod(1),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let description = "";
                    if (responseJson.Cost.hasOwnProperty("Long")) {
                        description += "Long costs:" + getCostsForLeg(responseJson.HoldingPeriodInDays, responseJson.Cost.Long);
                    }
                    if (responseJson.Cost.hasOwnProperty("Short")) {
                        if (description !== "") {
                            description += "\n\n";
                        }
                        description += "Short costs:" + getCostsForLeg(responseJson.HoldingPeriodInDays, responseJson.Cost.Short);
                    }
                    description += "\n\n" + getAssumptions(responseJson.CostCalculationAssumptions);
                    console.log(description + "\n\nReponse: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting the Key Investor Information Document(s) of this instrument.
     * @return {void}
     */
    function getKid() {

        /**
         * Download a file and give it a name. Source: https://stackoverflow.com/a/48968694.
         * @param {Object} blob The downloaded blob from the response.
         * @param {string} fileName The file name to use.
         * @return {void}
         */
        function saveFile(blob, fileName) {
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, fileName);  // IE, Edge
            } else {
                const a = document.createElement("a");
                const downloadUrl = window.URL.createObjectURL(blob);
                document.body.appendChild(a);
                a.href = downloadUrl;
                a.download = fileName;
                a.click();
                setTimeout(function () {
                    window.URL.revokeObjectURL(downloadUrl);  // Release memory
                    document.body.removeChild(a);
                }, 100);
            }
        }

        /**
         * If an applicable file exists, download it.
         * @param {string} uic The Uic if the instrument.
         * @param {string} assetType The AssetType.
         * @param {string} documentType The DocumentType.
         * @param {string} language The language of the KIID.
         * @param {string} fileName The file name to use for the download, including extension.
         * @return {void}
         */
        function downloadDocument(uic, assetType, documentType, language, fileName) {
            // Workaround. This problem is about to be fixed by Saxo.
            documentType = documentType.replace(" ", "_");
            fetch(
                demo.apiUrl + "/mkt/v1/instruments/" + uic + "/" + assetType + "/documents/pdf?DocumentType=" + documentType + "&LanguageCode=" + language,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.blob().then(function (responseBlob) {
                        saveFile(responseBlob, fileName);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const newOrderObject = getOrderObjectFromJson();
        fetch(
            demo.apiUrl + "/mkt/v1/instruments/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "/documents/recommended?DocumentType=" + encodeURIComponent("KIIDs,PRIIP_KIDs"),  // Request both KIIDs and PRIIP KIDs
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let i;
                    let documentDetail;
                    let fileName;
                    console.log(JSON.stringify(responseJson, null, 4));
                    /*
                     * On SIM, there are no documents available so request return 404. On production, a typical response for an Etf is this:
                     *
                     * {"DocumentDetails":[{"DocumentDateTime":"2020-07-23T13:21:17.000000Z","DocumentRelationId":98491,"DocumentType":"KIIDs","LanguageCode":"fr"}]}
                     *
                     */
                    // The recommended documents will be returned. If language is important from a legal perspective, only the applicable language is returned.
                    // Give option to download all the documents, if any:
                    for (i = 0; i < responseJson.DocumentDetails.length; i += 1) {
                        documentDetail = responseJson.DocumentDetails[i];
                        // Note that DocumentTypes might have different translations, like "EID" in the Netherlands (https://www.afm.nl/nl-nl/consumenten/themas/advies/verplichte-info/eid).
                        // This means that you might consider a different file name, for example including the instrument name.
                        fileName = newOrderObject.Uic + "_" + newOrderObject.AssetType + "_" + documentDetail.DocumentType + "_(" + documentDetail.LanguageCode + ").pdf";
                        if (window.confirm("Do you want to download " + fileName + "?")) {
                            downloadDocument(newOrderObject.Uic, newOrderObject.AssetType, documentDetail.DocumentType, documentDetail.LanguageCode, fileName);
                        }
                    }
                });
            } else {
                if (response.status === 404) {
                    // This is not really an error, there is just no document available in the language of the customer
                    console.log("There is no KID available for this instrument.");
                } else {
                    demo.processError(response);
                }
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
        // Bug: Preview doesn't check for limit outside market hours
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.AccountKey = demo.user.accountKey;
        newOrderObject.FieldGroups = ["Costs", "MarginImpactBuySell"];
        fetch(
            demo.apiUrl + "/trade/v2/orders/precheck",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Request-ID": Math.random()  // This prevents error 409 (Conflict) from identical previews within 15 seconds
                },
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have PreCheckResult property being "Ok"
                    if (responseJson.PreCheckResult === "Ok") {
                        // Secondly, you can have a PreCheckResult of "Ok", but still a (functional) error
                        // Order could be placed if the account had sufficient margin and funding.
                        // In this case all calculated cost and margin values are in the response, together with an ErrorInfo object:
                        if (responseJson.hasOwnProperty("ErrorInfo")) {
                            console.error(responseJson.ErrorInfo.Message + "\n\n" + JSON.stringify(responseJson, null, 4));
                        } else {
                            // The order can be placed
                            console.log(JSON.stringify(responseJson, null, 4));
                        }
                    } else {
                        // Order request is syntactically correct, but the order cannot be placed, as it would violate semantic rules
                        console.error(JSON.stringify(responseJson, null, 4) + "\n\nX-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation"));
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
     * This is an example of placing a single leg order.
     * @return {void}
     */
    function placeNewOrder() {
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.AccountKey = demo.user.accountKey;
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
        fetch(
            demo.apiUrl + "/trade/v2/orders",
            {
                "method": "POST",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                    lastOrderId = responseJson.OrderId;
                });
            } else {
                console.debug(response);
                if (response.status === 403) {
                    // Don't add this check to your application, but for learning purposes:
                    // An HTTP Forbidden indicates that your app is not enabled for trading.
                    // See https://www.developer.saxo/openapi/appmanagement
                    demo.processError(response, "Your app might not be enabled for trading.");
                } else {
                    demo.processError(response);
                }
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of updating a single leg order.
     * @return {void}
     */
    function modifyLastOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.AccountKey = demo.user.accountKey;
        newOrderObject.OrderId = lastOrderId;
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
        fetch(
            demo.apiUrl + "/trade/v2/orders",
            {
                "method": "PATCH",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of removing an order from the book.
     * @return {void}
     */
    function cancelLastOrder() {
        fetch(
            demo.apiUrl + "/trade/v2/orders/" + lastOrderId + "?AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "DELETE",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have an OrderId
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    document.getElementById("idCbxOrderType").addEventListener("change", function () {
        demo.run(selectOrderType);
    });
    document.getElementById("idCbxOrderDuration").addEventListener("change", function () {
        demo.run(selectOrderDuration);
    });
    document.getElementById("idBtnGetConditions").addEventListener("click", function () {
        demo.run(getConditions);
    });
    document.getElementById("idBtnPreCheckOrder").addEventListener("click", function () {
        demo.run(preCheckNewOrder);
    });
    document.getElementById("idBtnGetOrderCosts").addEventListener("click", function () {
        demo.run(getOrderCosts);
    });
    document.getElementById("idBtnGetKid").addEventListener("click", function () {
        demo.run(getKid);
    });
    document.getElementById("idBtnPlaceNewOrder").addEventListener("click", function () {
        demo.run(placeNewOrder);
    });
    document.getElementById("idBtnModifyLastOrder").addEventListener("click", function () {
        demo.run(modifyLastOrder);
    });
    document.getElementById("idBtnCancelLastOrder").addEventListener("click", function () {
        demo.run(cancelLastOrder);
    });
    demo.displayVersion("trade");
}());
