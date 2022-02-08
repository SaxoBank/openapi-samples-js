/*jslint browser: true, for: true, long: true, unordered: true */
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
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "Stock",  // Is required when assetTypesList is available
        "footerElm": document.getElementById("idFooter")
    });
    const instrumentList = {};

    /**
     * Example of formatting a value according to the DisplayAndFormat.
     * @param {Object} displayAndFormat The format rules.
     * @param {number} value The value to be formatted.
     * @return {string} The formatted number.
     */
    function displayAndFormatValue(displayAndFormat, value) {

        /**
         * Round a value to a number of decimals.
         * @return {number} The rounded value.
         */
        function round(valueToRound, decimalPlaces) {
            const factorOfTen = Math.pow(10, decimalPlaces);
            return Math.round(valueToRound * factorOfTen) / factorOfTen;
        }

        /**
         * Return the value as a string, using the DecimalPips display format.
         * @return {string} The formatted value.
         */
        function displayWithDecimalPips() {
            const pipsCodes = [8304, 185, 178, 179, 8308, 8309, 8310, 8311, 8312, 8313];  // Unicode superscript codes of 0..9
            const positionOfDecimalSeparator = String(value).indexOf(".");
            const roundedValue = round(value, displayAndFormat.Decimals + 1);  // Round, so the correct value is shown.
            // Truncate value to allowed decimals:
            const truncatedValue = Math.trunc(roundedValue * Math.pow(10, displayAndFormat.Decimals)) / Math.pow(10, displayAndFormat.Decimals);
            const fractionPart = (
                positionOfDecimalSeparator === -1
                ? String(roundedValue)
                : String(roundedValue).slice(positionOfDecimalSeparator + 1)
            );
            const pipsSymbol = (
                fractionPart.length > displayAndFormat.Decimals
                ? String.fromCharCode(pipsCodes[parseInt(fractionPart.charAt(displayAndFormat.Decimals), 10)])
                : String.fromCharCode(pipsCodes[0])
            );
            return truncatedValue.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals}) + pipsSymbol + " " + displayAndFormat.Currency;
        }

        /**
         * Return the value as a string, using the Fractions display format.
         * @return {string} The formatted value.
         */
        function displayWithFractions() {
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            const numeratorText = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            return integerPart + " " + numeratorText + "/" + Math.pow(2, displayAndFormat.Decimals) + " " + displayAndFormat.Currency;
        }

        /**
         * Return the value as a string, using the ModernFractions display format.
         * @return {string} The formatted value.
         */
        function displayWithModernFractions() {
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            const numeratorText = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            return integerPart + " " + numeratorText + "/" + (
                displayAndFormat.Decimals === -5
                ? "32"
                : "128"
            ) + " " + displayAndFormat.Currency;
        }

        if (value === undefined || value === null) {
            return "(not available)";
        }
        if (displayAndFormat.hasOwnProperty("Format")) {
            switch (displayAndFormat.Format) {
            case "Normal":  // Standard decimal formatting is used with the Decimals field indicating the number of decimals.
                return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + " " + displayAndFormat.Currency;
            case "Percentage":  // Display as percentage, e.g. 12.34%.
                return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + "%";
            case "AllowDecimalPips":  // Display the last digit smaller than the rest of the numbers. Note that this digit is not included in the number of decimals, effectively increasing the number of decimals by one. E.g. 12.345 when Decimals is 2 and DisplayFormat is AllowDecimalPips.
                return displayWithDecimalPips();
            case "Fractions":  // Display as regular fraction i.e. 3 1/4 where 1=numerator and 4=denominator.
                return displayWithFractions();
            case "ModernFractions":  // Special US Bonds futures fractional format (1/32s or 1/128s without nominator). If PriceDecimals = -5 then the nominator is 32, else 128.
                return displayWithModernFractions();
            default:
                console.error("Unsupported format: " + displayAndFormat.Format);
                throw "Unsupported format";
            }
        } else {
            // No format returned, use "Normal":
            return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + " " + displayAndFormat.Currency;
        }
    }

    /**
     * Request new price data, when input has been changed - better to use a streaming connection for this.
     * @return {void}
     */
    function updateCurrencyList() {

        /**
         * Lookup the related currency in the object array.
         * @param {Array<Object>} list The array with Currency objects.
         * @param {string} uic Uic to be found.
         * @return {Object} The related currency, if found - otherwise null.
         */
        function findByUic(list, uic) {
            const match = list.filter(function (item) {
                return item.Uic === uic;
            });
            return (
                match.length > 0
                ? match[0]
                : null
            );
        }

        function isToday(date) {
            const today = new Date();
            return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        }

        const selectedCurrency = document.getElementById("idCbxCurrencyFrom").value;
        const data = {
            "ContextId": "123",
            "ReferenceId": "456",
            "ReplaceReferenceId": "456",
            "RefreshRate": 300,
            "Arguments": {
                "Uics": "",
                "AssetType": "FxSpot",
                "FieldGroups": ["DisplayAndFormat", "InstrumentPriceDetails", "PriceInfo", "PriceInfoDetails", "Quote"]
            }
        };
        const uics = [];
        instrumentList[selectedCurrency].forEach(function (relatedCurrency) {
            uics.push(relatedCurrency.Uic);
        });
        data.Arguments.Uics = uics.join(",");
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
                response.json().then(function (responseJson) {
                    const amount = document.getElementById("idAmount").value;
                    let responseText = "";
                    responseJson.Snapshot.Data.forEach(function (instrument) {
                        const relatedCurrency = findByUic(instrumentList[selectedCurrency], instrument.Uic);
                        const lastUpdated = new Date(instrument.LastUpdated);
                        let value;
                        if (amount >= 10) {
                            instrument.DisplayAndFormat.Format = "Normal";
                        }
                        if (relatedCurrency.Conversion === "reversed") {
                            value = instrument.Quote.Mid / amount;
                            instrument.DisplayAndFormat.Currency = relatedCurrency.CurrencyCode;
                        } else {
                            value = instrument.Quote.Mid * amount;
                        }
                        responseText += amount + " " + selectedCurrency + " = " + displayAndFormatValue(instrument.DisplayAndFormat, value) + " (last update " + (
                            isToday(lastUpdated)
                            ? lastUpdated.toLocaleTimeString()
                            : lastUpdated.toLocaleString()
                        ) + ")\n";
                    });
                    console.log(responseText);
                });
            } else {
                // This can be something like: {"Message":"One or more properties of the request are invalid!","ModelState":{"Orders":["Stop leg of OCO order must have OrderType of either: TrailingStopIfTraded, StopIfTraded, StopLimit"]},"ErrorCode":"InvalidModelState"}
                // The developer (you) must fix this.
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Collect all currency pairs and show them in the html dropdown.
     * @return {void}
     */
    function initialize() {

        /**
         * Lookup the related currency in the object array.
         * @param {Array<Object>} list The array with Currency objects.
         * @param {string} currencyCode Currency to be found.
         * @return {Object} The related currency, if found - otherwise null.
         */
        function findByCurrency(list, currencyCode) {
            const match = list.filter(function (item) {
                return item.CurrencyCode === currencyCode;
            });
            return (
                match.length > 0
                ? match[0]
                : null
            );
        }

        function addCurrencyToHtmlList(cbxCurrencyFrom, currencyCode) {
            // Add currency to list with available currencies
            const option = document.createElement("option");
            option.text = currencyCode;
            option.value = currencyCode;
            if (option.value === "EUR") {
                option.setAttribute("selected", true);
            }
            cbxCurrencyFrom.add(option);
        }

        function addRelatedCurrencies(currencyPair) {
            // Add the currencies to the available conversions
            const relatedCurrencies = [];
            currencyPair.RelatedCurrencies.forEach(function (relatedCurrency) {
                relatedCurrencies.push({
                    "Uic": relatedCurrency.Uic,
                    "CurrencyCode": relatedCurrency.CurrencyCode,
                    "Conversion": "none"
                });
            });
            instrumentList[currencyPair.CurrencyCode] = relatedCurrencies;
        }

        function addReversedRelatedCurrencies(targetCurrencyCode, responseData) {
            // And finally, add the reversed currency pairs
            const targetRelatedCurrencies = instrumentList[targetCurrencyCode];
            // Search in every collection, except the existing one:
            responseData.forEach(function (currencyPair) {
                let reversedRelatedCurrency;
                // Only applicable when currency is not the same and currency is not already available
                if (targetCurrencyCode !== currencyPair.CurrencyCode && findByCurrency(targetRelatedCurrencies, currencyPair.CurrencyCode) === null) {
                    reversedRelatedCurrency = findByCurrency(currencyPair.RelatedCurrencies, targetCurrencyCode);
                    if (reversedRelatedCurrency !== null) {
                        // Found!
                        targetRelatedCurrencies.push({
                            "Uic": reversedRelatedCurrency.Uic,
                            "CurrencyCode": currencyPair.CurrencyCode,
                            "Conversion": "reversed"
                        });
                    }
                }
            });
        }

        fetch(
            demo.apiUrl + "/ref/v1/currencypairs",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const cbxCurrencyFrom = document.getElementById("idCbxCurrencyFrom");
                    let i;
                    // Clear the list with currencies
                    for (i = cbxCurrencyFrom.options.length - 1; i >= 0; i -= 1) {
                        cbxCurrencyFrom.remove(i);
                    }
                    responseJson.Data.forEach(function (currencyPair) {
                        addCurrencyToHtmlList(cbxCurrencyFrom, currencyPair.CurrencyCode);
                        addRelatedCurrencies(currencyPair);
                        addReversedRelatedCurrencies(currencyPair.CurrencyCode, responseJson.Data);
                    });
                    updateCurrencyList();
                });
            } else {
                // This can be something like: {"Message":"One or more properties of the request are invalid!","ModelState":{"Orders":["Stop leg of OCO order must have OrderType of either: TrailingStopIfTraded, StopIfTraded, StopLimit"]},"ErrorCode":"InvalidModelState"}
                // The developer (you) must fix this.
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxCurrencyFrom", "func": updateCurrencyList, "funcsToDisplay": [updateCurrencyList, displayAndFormatValue]},
        {"evt": "input", "elmId": "idAmount", "func": updateCurrencyList, "funcsToDisplay": [updateCurrencyList, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnInitialize", "func": initialize, "funcsToDisplay": [initialize]}
    ]);
    demo.displayVersion("ref");
}());
