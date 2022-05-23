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
     * Reads the selected value of the dropdowns to return the relevant input for the request.
     * @param {string} identifier
     * @returns
     */
    function read(identifier) {
        const selected = document.getElementById("idCbx" + identifier).selectedOptions;
        if (selected.length > 1) {
            let fieldGroups = "";
            let i;
            // forEach cannot be applied to this object, for reasons.
            for (i = 0; i < selected.length; i += 1) {
                //if All is included in selected, only return that entry.
                if (selected[i].value === "All") {
                    return "All";
                }
                fieldGroups += selected[i].value + ",";
            }
            return fieldGroups.slice(0, -1);
        }
        if (document.getElementById("idCbx" + identifier).selectedOptions[0]) {
            return document.getElementById("idCbx" + identifier).selectedOptions[0].value;
        }
        //default All case
        return "All";
    }

    /**
     * Parse key information out of response and return formatted text for display
     * @param {Object} response
     * @param {string} requestType
     * @param {string} requestUrl
     * @param {string} params
     * @returns
     */
    function parseResponse(requestUrl) {
        return "Endpoint: \n\t" + requestUrl.split("?")[0].split(".com")[1] + "\nParameters: \n\t?" + requestUrl.split("?")[1] + "\n";
    }

    /**
     * Get the performance summary for a client entity in the specified date range
     * @return {void}
     */
    function getClientTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + demo.user.clientKey);
    }

    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + demo.user.clientKey + "&AccountKey=" + demo.user.accountKey);
    }

    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getTimeseries(url) {
        const param = "&StandardPeriod=" + read("TimeseriesStandardPeriod") + "&FieldGroups=" + read("TimeseriesFieldGroups");
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
                    console.log(parseResponse(url + param) + JSON.stringify(responseJson, null, 2));
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
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + demo.user.clientKey);
    }

    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountSummary() {
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + demo.user.clientKey + "&AccountKey=" + demo.user.accountKey);
    }

    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getSummary(url) {
        const param = "&StandardPeriod=" + read("SummaryStandardPeriod") + "&FieldGroups=" + read("SummaryFieldGroups");
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
                    console.log(parseResponse(url + param) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetClientSummary", "func": getClientSummary, "funcsToDisplay": [getClientSummary]},
        {"evt": "click", "elmId": "idBtnGetAccountSummary", "func": getAccountSummary, "funcsToDisplay": [getAccountSummary]},
        {"evt": "click", "elmId": "idBtnGetClientTimeseries", "func": getClientTimeseries, "funcsToDisplay": [getClientTimeseries]},
        {"evt": "click", "elmId": "idBtnGetAccountTimeseries", "func": getAccountTimeseries, "funcsToDisplay": [getAccountTimeseries]}
    ]);
    demo.displayVersion("hist");
}());
