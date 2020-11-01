/*jslint this: true, browser: true, for: true, long: true */
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
     * Request a report and download it.
     * @param {string} url The URL including the query parameters.
     * @param {string} fileName Desired file name.
     * @param {string} acceptHeader Accept header indicating which file type to download.
     * @return {void}
     */
    function getReport(url, fileName, acceptHeader) {

        /**
         * Download a file and give it a name. Source: https://stackoverflow.com/a/48968694.
         * @param {Object} blob The downloaded blob from the response.
         * @return {void}
         */
        function saveFile(blob) {
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

        fetch(
            url,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Accept": acceptHeader
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.blob().then(function (responseBlob) {
                    saveFile(responseBlob);
                    console.log("The file '" + fileName + "' is being downloaded.");
                });
            } else if (response.status === 404) {
                // Remove this check - only for demonstration
                console.error("Reports are not available on the SIM test environment.");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request an account statement with the activity of this year, as PDF file.
     * @return {void}
     */
    function getAccountStatementPdf() {
        const currentYear = (new Date()).getFullYear();
        getReport(
            demo.apiUrl + "/cr/v1/reports/AccountStatement/" + encodeURIComponent(demo.user.clientKey) + "?FromDate=" + currentYear + "-01-01&ToDate=" + currentYear + "-12-31&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "AccountStatement-" + currentYear + ".pdf",
            "application/pdf"
        );
    }

    /**
     * Request an account statement with the activity of this year, as XLSX file.
     * @return {void}
     */
    function getAccountStatementExcel() {
        const currentYear = (new Date()).getFullYear();
        getReport(
            demo.apiUrl + "/cr/v1/reports/AccountStatement/" + encodeURIComponent(demo.user.clientKey) + "?FromDate=" + currentYear + "-01-01&ToDate=" + currentYear + "-12-31&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "AccountStatement-" + currentYear + ".xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnAccountStatementPdf", "func": getAccountStatementPdf, "funcsToDisplay": [getAccountStatementPdf, getReport]},
        {"evt": "click", "elmId": "idBtnAccountStatementExcel", "func": getAccountStatementExcel, "funcsToDisplay": [getAccountStatementExcel, getReport]}
    ]);
    demo.displayVersion("cr");
}());
