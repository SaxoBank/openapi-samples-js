/*jslint browser: true, for: true, long: true, unordered: true */
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

    const changePositionNettingProfileButton = document.getElementById("idBtnChangePositionNettingProfile");
    const getOpenNetPositionsButton = document.getElementById("idBtnGetOpenNetPositions");
    const getOpenPositionsButton = document.getElementById("idBtnGetOpenPositions");
    const getClosedPositionsButton = document.getElementById("idBtnGetClosedPositions");
    const getOrdersButton = document.getElementById("idBtnGetOrders");
    const getEnsEventsButton = document.getElementById("idBtnHistoricalEnsEvents");
    let positionNettingProfiles = {};
    let positionNettingProfile = "?";

    /**
     * Example of PositionNettingProfile retrieval.
     * @return {void}
     */
    function getPositionNettingProfiles() {
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let description = "Position netting profile is set to: " + responseJson.PositionNettingProfile + ".";

                    positionNettingProfiles = responseJson.AllowedNettingProfiles;

                    if(positionNettingProfiles.length > 0) {
                        description += "\n\nAllowed position netting profiles:"
                        
                        for(i = 0; i < positionNettingProfiles.length; i++){
                            description += "\n   " + positionNettingProfiles[i];
                        }
                    }

                    positionNettingProfile = responseJson.PositionNettingProfile;

                    console.log(description + "\n\nResponse:\n" + JSON.stringify(responseJson, null, 4));
                    changePositionNettingProfileButton.style.display = "inline-block";
                    getOpenNetPositionsButton.style.display = "inline-block";
                    getOpenPositionsButton.style.display = "inline-block";
                    getClosedPositionsButton.style.display = "inline-block";
                    getOrdersButton.style.display = "inline-block";
                    getEnsEventsButton.style.display = "inline-block";
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of changing position netting profile.
     * @return {void}
     */
    function changePositionNettingProfile() {
        if(positionNettingProfiles.length === 0) {
            console.log("It seems like the client configuration is incorrect, given that it has no available position netting profiles.")
            return;
        }

        if(positionNettingProfiles.length === 1) {
            console.log("The client only has one position netting profile available: " + positionNettingProfiles[0] + ".\nIt is therefore not possible to change position netting profile.");
            return;
        }

        let position = positionNettingProfiles.indexOf(positionNettingProfile);
        let newPositionNettingProfile = positionNettingProfiles[(position + 1) % positionNettingProfiles.length];
        
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
            {
                "method": "PATCH",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "NewPositionNettingProfile": newPositionNettingProfile
                })
            }
        ).then(function (response) {
            if (response.ok) {
                positionNettingProfile = newPositionNettingProfile;
                console.log("position netting profile set to " + newPositionNettingProfile + ".");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
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
            return displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals});
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
            return displayAndFormat.Currency + " " + truncatedValue.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals}) + pipsPart;
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
            return displayAndFormat.Currency + " " + integerPart + " " + numeratorText + "/" + Math.pow(2, displayAndFormat.Decimals);
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
            return displayAndFormat.Currency + " " + integerPart + "'" + numeratorText;
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
     * Example of getting all netted formatted positions for your clientKey.
     * @return {void}
     */
    function getOpenNetPositions() {
        fetch(
            demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let list = "";
                    responseJson.Data.forEach(function (position) {
                        list += position.NetPositionBase.Amount + "x " + position.NetPositionBase.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.MarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.AverageOpenPrice) + "\n";
                    });
                    console.log("All (netted) positions for client '" + demo.user.clientKey + "' using position netting profile " + positionNettingProfile + ".\n\n" + (
                        list === ""
                        ? "No positions found."
                        : list
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
     * Example of getting all formatted positions for your clientKey.
     * @return {void}
     */
    function getOpenPositions() {
        fetch(
            demo.apiUrl + "/port/v1/positions?FieldGroups=PositionBase,PositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let list = "";
                    responseJson.Data.forEach(function (position) {
                        list += position.PositionBase.Amount + "x " + position.PositionBase.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.PositionView.MarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.PositionView.AverageOpenPrice) + "\n";
                    });
                    console.log("All positions for client '" + demo.user.clientKey + "' using position netting profile " + positionNettingProfile + ".\n\n" + (
                        list === ""
                        ? "No positions found."
                        : list
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
     * Example of getting all formatted positions for your clientKey.
     * @return {void}
     */
    function getClosedPositions() {
        fetch(
            demo.apiUrl + "/port/v1/closedpositions?FieldGroups=ClosedPosition,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let list = "";
                    if (responseJson.hasOwnProperty("Data")) {
                        responseJson.Data.forEach(function (position) {
                            list += position.ClosedPosition.Amount + "x " + position.ClosedPosition.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.ClosedPosition.ClosingMarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.ClosedPosition.OpenPrice) + "\n";
                        });
                    }
                    console.log("All closed positions for client '" + demo.user.clientKey + "' using position netting profile " + positionNettingProfile + ".\n\n" + (
                        list === ""
                        ? "No positions found."
                        : list
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
     * Example of getting all formatted open orders for the your clientKey.
     * @return {void}
     */
    function getOrders() {
        // Only open orders will be shown.
        fetch(
            demo.apiUrl + "/port/v1/orders?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let list = "";
                    responseJson.Data.forEach(function (order) {
                        list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + order.DisplayAndFormat.Description + " @ price " + displayAndFormatValue(order.DisplayAndFormat, order.Price) + " (status " + order.Status + ")" + (
                            order.hasOwnProperty("ExternalReference")
                            ? " reference: " + order.ExternalReference
                            : ""
                        ) + (
                            order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                            ? " partially filled: " + order.FilledAmount
                            : ""
                        ) + "\n";
                    });
                    console.log("All open orders for client '" + demo.user.clientKey + "'.\n\n" + (
                        list === ""
                        ? "No orders found."
                        : list
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
     * Position changes are broadcasted via ENS. Retrieve the overnight events to see what you can expect.
     * @return {void}
     */
    function getHistoricalEnsEvents() {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 1);
        fetch(
            demo.apiUrl + "/ens/v1/activities?Activities=Positions&FromDateTime=" + fromDate.toISOString(),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let list = "";
                    responseJson.Data.forEach(function (ensEvent) {
                        if (ensEvent.PositionEvent === "Updated") {
                            // More info: https://www.developer.saxo/openapi/learn/position-events
                            list += "Account " + ensEvent.AccountId + ": Update on " + ensEvent.AssetType + " " + ensEvent.Symbol + " received at " + new Date(ensEvent.ActivityTime).toLocaleString() + "\n";
                        }
                    });
                    if (list === "") {
                        list = "No PositionEvents of type 'Update' found in the last 24 hours.\n";
                    } else {
                        list = "Historical events of the last 24 hours, including the nightly rollover:\n" + list;
                    }
                    console.log(list + "\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetAllowedPositionNettingProfiles", "func": getPositionNettingProfiles, "funcsToDisplay": [getPositionNettingProfiles]},
        {"evt": "click", "elmId": "idBtnGetOpenNetPositions", "func": getOpenNetPositions, "funcsToDisplay": [getOpenNetPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOpenPositions", "func": getOpenPositions, "funcsToDisplay": [getOpenPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetClosedPositions", "func": getClosedPositions, "funcsToDisplay": [getClosedPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOrders", "func": getOrders, "funcsToDisplay": [getOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnChangePositionNettingProfile", "func": changePositionNettingProfile, "funcsToDisplay": [changePositionNettingProfile]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]}
    ]);
    demo.displayVersion("port");
}());
