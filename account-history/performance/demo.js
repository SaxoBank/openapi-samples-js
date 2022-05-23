/*jslint this: true, browser: true, for: true, long: true, unordered: true */
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



    /**
     * Reads the selected value of the dropdowns with relevant Currency-AmountTypeId, ExchangeId, or AmountTypeSource values. 
     * @param {String} identifier 
     * @returns 
     */
    function read(identifier) {
        var selected = document.getElementById("idCbx" + identifier).selectedOptions
        if (selected.length > 1) {
            var fieldGroups = ""
            for (var i = 0; i < selected.length; i++) {
                if (selected[i].value === "All") {
                    fieldGroups = "All"
                    break
                }
                fieldGroups += selected[i].value + ","
            }
            return fieldGroups.slice(0, -1)
        } else if (document.getElementById("idCbx" + identifier).selectedOptions[0]) {
            return document.getElementById("idCbx" + identifier).selectedOptions[0].value
        } else {
            return "All"
        }
    }

    /**
     * Parse key information out of response and format for display
     * @param {*} response 
     * @param {*} requestType 
     * @param {*} requestUrl 
     * @param {*} params 
     * @returns 
     */
    function parseResponse(response, requestUrl) {
        return "Endpoint: \n\t" + requestUrl.split("?")[0].split(".com")[1] + "\nParameters: \n\t?" + requestUrl.split("?")[1] + "\n"

    }

    /**
     * Get the performance summary for a client entity in the specified date range
     * @return {void}
     */
    function getClientTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + demo.user.clientKey)
    }
    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + demo.user.clientKey + "&AccountKey=" + demo.user.accountKey)
    }
    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getTimeseries(url) {
        var param = "&StandardPeriod=" + read("TimeseriesStandardPeriod") + "&FieldGroups=" + read("TimeseriesFieldGroups")
        fetch(
            url + param,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, url + param) + JSON.stringify(responseJson, null, 2))
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }


    /**
     * Get the performance summary for a client entity in the specified date range
     * @return {void}
     */
    function getClientSummary() {
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + demo.user.clientKey)
    }
    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountSummary() {
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + demo.user.clientKey + "&AccountKey=" + demo.user.accountKey)
    }
    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getSummary(url) {
        var param = "&StandardPeriod=" + read("SummaryStandardPeriod") + "&FieldGroups=" + read("SummaryFieldGroups")
        fetch(
            url + param,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, url + param) + JSON.stringify(responseJson, null, 2))
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        { "evt": "click", "elmId": "idBtnGetClientSummary", "func": getClientSummary, "funcsToDisplay": [getClientSummary] },
        { "evt": "click", "elmId": "idBtnGetAccountSummary", "func": getAccountSummary, "funcsToDisplay": [getAccountSummary] },
        { "evt": "click", "elmId": "idBtnGetClientTimeseries", "func": getClientTimeseries, "funcsToDisplay": [getClientTimeseries] },
        { "evt": "click", "elmId": "idBtnGetAccountTimeseries", "func": getAccountTimeseries, "funcsToDisplay": [getAccountTimeseries] },
    ]);
    demo.displayVersion("hist");
}());
