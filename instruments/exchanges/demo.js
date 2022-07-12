/*jslint browser: true, long: true, for: true, unordered: true */
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
    const defaultExchangeId = "EUR_AMS2";
    let exchanges = null;
    let countries = null;
    let currencies = null;
    let timeZones = null;

    /**
     * Find the country in the cached countries list.
     * @param {string} countryCode The 2-digit country code (A2 in ISO 3166 standard).
     * @return {Object} The country
     */
    function getCountry(countryCode) {
        const countryObject = countries.find(function (country) {
            return country.CountryCode === countryCode;
        });
        if (countryObject === undefined) {
            console.error("CountryCode not found in /countries: " + countryCode);
            return {
                "DisplayName": "???"
            };
        }
        return countryObject;
    }

    /**
     * Find the time zone in the cached timeZones list.
     * @param {Object} exchange The exchange containing the time zone identifier.
     * @return {Object} The timeZone object
     */
    function getTimeZone(exchange) {
        const timeZoneObject = timeZones.find(function (timeZone) {
            return timeZone.TimeZoneId === exchange.TimeZone.toString();  // Requested to be fixed at Saxo side (type & name), because this shouldn't be nessesary.
        });
        if (timeZoneObject === undefined) {
            console.error(exchange.Name + " (MIC " + exchange.Mic + ") refers to TimeZone " + exchange.TimeZone + ", which is not available in /ref/v1/timezones - TimeZoneOffset: " + exchange.TimeZoneOffset + (
                (exchange.hasOwnProperty("TimeZoneAbbreviation") && exchange.TimeZoneAbbreviation !== "")
                ? " and TimeZoneAbbreviation: " + exchange.TimeZoneAbbreviation
                : ""
            ) + " (country " + getCountry(exchange.CountryCode).Name + " - " + exchange.CountryCode + ").");
            return {
                "DisplayName": "???",
                "TimeZoneAbbreviation": exchange.TimeZoneAbbreviation,
                "TimeZoneOffset": exchange.TimeZoneOffset
            };
        }
        return timeZoneObject;
    }

    /**
     * Add options to the dropdowns.
     * @return {void}
     */
    function populateDropdowns() {

        /**
         * Remove all items from a combo box.
         * @param {Object} listElement The combo box element.
         * @return {void}
         */
        function clearList(listElement) {
            let i;
            for (i = listElement.options.length - 1; i >= 0; i -= 1) {
                listElement.remove(i);
            }
        }

        /**
         * Add an option to a combo box.
         * @param {Object} listElement The combo box element.
         * @param {string} displayText The text that will be visible.
         * @param {string} value The value.
         * @param {boolean} isSelected Default selected option.
         * @return {void}
         */
        function addOption(listElement, name, value, isSelected) {
            const option = document.createElement("option");
            option.text = name;
            option.value = value;
            if (isSelected) {
                option.setAttribute("selected", true);
            }
            listElement.add(option);
        }

        /**
         * Sort list and add to a combo box.
         * @param {Array[Array<string>}} arr The array with options.
         * @param {string} elmId The id of the element.
         * @param {string} selectedValue The value to select.
         * @return {void}
         */
        function populateSelect(arr, elmId, selectedValue) {
            const listElement = document.getElementById(elmId);
            clearList(listElement);
            arr.sort();
            arr.forEach(function (values) {
                addOption(listElement, values[0], values[1], values[1] === selectedValue);
            });
        }

        const exchangeNameArray = [];
        const micArray = [];
        const exchangeIdArray = [];
        const countryArray = [];
        const countryArrayIndex = [];
        exchanges.forEach(function (exchange) {
            exchangeNameArray.push([exchange.Name, exchange.ExchangeId]);
            micArray.push([exchange.Mic + " (" + exchange.Name + ")", exchange.ExchangeId]);
            exchangeIdArray.push([exchange.ExchangeId + " (" + exchange.Name + ")", exchange.ExchangeId]);
            if (countryArrayIndex.indexOf(exchange.CountryCode) === -1) {
                countryArrayIndex.push(exchange.CountryCode);
                countryArray.push([getCountry(exchange.CountryCode).DisplayName + " (" + exchange.CountryCode + ")", exchange.CountryCode]);
            }
        });
        populateSelect(exchangeNameArray, "idCbxExchangeName", defaultExchangeId);
        populateSelect(micArray, "idCbxOperationalMic", defaultExchangeId);
        populateSelect(exchangeIdArray, "idCbxExchangeId", defaultExchangeId);
        populateSelect(countryArray, "idCbxCountry", "NL");
    }

    /**
     * Display trading sessions and other market information.
     * @return {void}
     */
    function displayExchangeDetails(exchangeId) {

        function convertToLocalTime(utcTime, offset) {
            // A TimeSpan value can be represented as [-]hh:mm:ss, where the optional minus sign indicates a negative time interval,
            // the hh component is hours as measured on a 24-hour clock, mm is minutes, and ss is seconds.
            // Examples of offsets are "02:00:00" and "-05:00:00"
            // https://docs.microsoft.com/en-us/dotnet/api/system.timespan
            const sign = (
                offset.charAt(0) === "-"
                ? "-"
                : ""
            );
            if (sign === "-") {
                offset = offset.substring(1);
            }
            const localTime = new Date();
            const hours = parseInt(sign + offset.substring(0, 2), 10);
            const minutes = parseInt(sign + offset.substring(3, 5), 10);
            const seconds = parseInt(sign + offset.substring(6, 8), 10);
            const offsetInMs = hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
            localTime.setTime(utcTime.getTime() + offsetInMs);
            return localTime;
        }

        function collectSessions(exchangeObject, isExchangeLocalTimeRequested) {
            let result = "";
            exchangeObject.ExchangeSessions.forEach(function (session) {
                const startTime = new Date(session.StartTime);
                const endTime = new Date(session.EndTime);
                const timeZoneUtc = {
                    "timeZone": "UTC"
                };
                if (isExchangeLocalTimeRequested) {
                    result += "  " + convertToLocalTime(startTime, exchangeObject.TimeZoneOffset).toLocaleString(undefined, timeZoneUtc);
                    result += " - " + convertToLocalTime(endTime, exchangeObject.TimeZoneOffset).toLocaleString(undefined, timeZoneUtc);
                } else {
                    result += "  " + startTime.toLocaleString() + " - " + endTime.toLocaleString();
                }
                result += ": " + session.State;
                if (session.State === "AutomatedTrading") {
                    result += " (regular trading session)";
                }
                result += "\n";
            });
            return result;
        }

        // No need to request the individual exchange, they are all in cache
        const exchangeObject = exchanges.find(function (exchange) {
            return exchange.ExchangeId === exchangeId;
        });
        const currencyObject = currencies.find(function (currency) {
            return currency.CurrencyCode === exchangeObject.Currency;
        });
        const timeZoneObject = getTimeZone(exchangeObject);
        let details = "Selected Exchange: " + exchangeObject.Name + "\n";
        console.log("Collecting exchange details for ExchangeId " + exchangeId);
        details += "Country: " + getCountry(exchangeObject.CountryCode).Name + "\n";
        details += "Operational MIC (not unique): " + exchangeObject.Mic + "\n";
        details += "Currency: " + currencyObject.Name + (
            currencyObject.hasOwnProperty("Symbol")
            ? " (" + currencyObject.Symbol + ")"
            : ""
        ) + "\n";
        if (timeZoneObject.DisplayName !== "") {
            details += "TimeZone: " + timeZoneObject.DisplayName + " ";
        }
        if (timeZoneObject.TimeZoneAbbreviation !== "") {
            details += "(" + timeZoneObject.TimeZoneAbbreviation + ")";
        } else {
            details += "ZoneName: " + timeZoneObject.ZoneName;
        }
        details += "\n\nExchange Sessions (converted to your time, " + (
            exchangeObject.AllDay
            ? ""
            : "not "
        ) + "all day):\n";
        if (exchangeObject.ExchangeSessions.length === 0) {
            details += "None (is this a NAV trading platform?)\n";  // This can be the case when it is a NAV trading platform
        } else {
            details += collectSessions(exchangeObject, false);
            details += "\nExchange Sessions in Exchange Local Time using UTC-offset " + timeZoneObject.TimeZoneOffset + ":\n";
            details += collectSessions(exchangeObject, true);
        }
        console.log(details + "\n" + JSON.stringify(exchangeObject, null, 4));
    }

    /**
     * This is an example of getting Exchanges and other relevant info and wait for the last response.
     * @return {void}
     */
    function getData() {

        function requestData(urlPath) {
            return fetch(
                demo.apiUrl + urlPath,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            );
        }

        // Do multiple requests in parallel. HTTP/2 handles this.
        // IE doesn't support Promise, but there is a polyfill, if you require one.
        Promise.all([
            requestData("/ref/v1/exchanges?$top=1000"),  // Get the first 1.000 (actually there are around 225 exchanges available)
            requestData("/ref/v1/countries"),
            requestData("/ref/v1/currencies"),
            requestData("/ref/v1/timezones")
        ]).then(function (responses) {
            return Promise.all(responses.map(function (response) {
                if (response.ok) {
                    return response.json();
                }
                demo.processError(response);
            }));
        }).then(function (responsesJson) {
            let requestResult = "";
            responsesJson.forEach(function (responseJson, requestIndex) {
                switch (requestIndex) {
                case 0:
                    exchanges = responseJson.Data;
                    requestResult += "Exchanges found: " + responseJson.Data.length + "\n";
                    break;
                case 1:
                    countries = responseJson.Data;
                    requestResult += "Countries found: " + responseJson.Data.length + "\n";
                    break;
                case 2:
                    currencies = responseJson.Data;
                    requestResult += "Currencies found: " + responseJson.Data.length + "\n";
                    break;
                case 3:
                    timeZones = responseJson.Data;
                    requestResult += "TimeZones found: " + responseJson.Data.length + "\n";
                    break;
                default:
                    throw "Unexpected request index: " + requestIndex;
                }
            });
            console.log(requestResult);
            populateDropdowns();
            displayExchangeDetails(defaultExchangeId);
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Show details for the selected exchange.
     * @return {void}
     */
    function changeExchangeNameList() {
        displayExchangeDetails(document.getElementById("idCbxExchangeName").value);
    }

    /**
     * Show details for the selected MIC.
     * @return {void}
     */
    function changeMicList() {
        displayExchangeDetails(document.getElementById("idCbxOperationalMic").value);
    }

    /**
     * Show details for the selected MIC.
     * @return {void}
     */
    function changeExchangeIdList() {
        displayExchangeDetails(document.getElementById("idCbxExchangeId").value);
    }

    /**
     * Show the exchanges located in the selected country.
     * @return {void}
     */
    function changeCountryList() {
        const countryCode = document.getElementById("idCbxCountry").value;
        const exchangeNames = [];
        exchanges.forEach(function (exchange) {
            if (exchange.CountryCode === countryCode) {
                exchangeNames.push("  " + exchange.Name);
            }
        });
        exchangeNames.sort();
        console.log("Available Exchanges:\n" + exchangeNames.join("\n"));
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxExchangeName", "func": changeExchangeNameList, "funcsToDisplay": [changeExchangeNameList, displayExchangeDetails, getCountry]},
        {"evt": "change", "elmId": "idCbxOperationalMic", "func": changeMicList, "funcsToDisplay": [changeMicList, displayExchangeDetails, getCountry]},
        {"evt": "change", "elmId": "idCbxExchangeId", "func": changeExchangeIdList, "funcsToDisplay": [changeExchangeIdList, displayExchangeDetails, getCountry]},
        {"evt": "change", "elmId": "idCbxCountry", "func": changeCountryList, "funcsToDisplay": [changeCountryList]},
        {"evt": "click", "elmId": "idBtnGetData", "func": getData, "funcsToDisplay": [getData, populateDropdowns]}
    ]);
    demo.displayVersion("ref");
}());
