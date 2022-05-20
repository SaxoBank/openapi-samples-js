/*jslint this: true, browser: true, long: true, unordered: true */
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
     * Upload a file to Saxo using POST with JSON object.
     * @return {void}
     */
    function uploadSingleFile() {

        /**
         * Upload the document(s) to Saxo.
         * @param {string} file The base64 encoded file.
         * @return {void}
         */
        function performUpload(base64StringFile, fileName) {
            const requestBody = {
                "ClientKey": demo.user.clientKey,
                "Documents": [{
                    "Data": base64StringFile,
                    "DocumentType": "PensionTransferRequest",
                    "FileName": fileName
                }]
            };
            fetch(
                demo.apiUrl + "/cm/v1/documents",
                {
                    "method": "POST",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    "body": JSON.stringify(requestBody)
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        const rep = "Response: " + JSON.stringify(responseJson, null, 4);
                        console.log(rep);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        /**
         * Convert a single JavaScript File object to a base64 encoded string.
         * @param {Object} file The JavaScript file object.
         * @return {void}
         */
        function getFile(file) {
            const reader = new FileReader();
            reader.onerror = function () {
                reader.abort();
                console.error("Error parsing file " + file.name);
            };
            reader.onload = function () {
                // This will result in an array that will be recognized by C#.NET WebApi as a byte[]
                const bytes = Array.from(new Uint8Array(this.result));
                // Create the base64encoded string:
                const base64StringFile = window.btoa(bytes.map(function (item) {
                    return String.fromCharCode(item);
                }).join(""));
                performUpload(base64StringFile, file.name);
            };
            reader.readAsArrayBuffer(file);
        }

        // The sample below using Promise and multiple files can be used as well, but for completeness, this is the code without Promise.
        const files = document.getElementById("idBtnSelectFile").files;
        if (files.length === 0) {
            console.error("No file selected.");
        } else {
            getFile(files[0]);
        }
    }

    /**
     * Upload documents to Saxo using POST with JSON object.
     * Based on https://stackoverflow.com/a/51543922
     * @return {void}
     */
    function uploadMultipleFiles() {

        /**
         * Upload the document(s) to Saxo.
         * @param {Array<Object>} files The base64 encoded file object array.
         * @return {void}
         */
        function performUpload(files) {
            const requestBody = {
                "ClientKey": demo.user.clientKey,
                "Documents": []
            };
            files.forEach(function (file) {
                requestBody.Documents.push({
                    "Data": file.base64StringFile,
                    "DocumentType": "PensionTransferRequest",
                    "FileName": file.fileName
                });
            });
            fetch(
                demo.apiUrl + "/cm/v1/documents",
                {
                    "method": "POST",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    "body": JSON.stringify(requestBody)
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        const rep = "Response: " + JSON.stringify(responseJson, null, 4);
                        console.log(rep);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        /**
         * Convert a single JavaScript File object to a base64 encoded string.
         * @param {Object} file The JavaScript file object.
         * @return {void}
         */
        function getFile(file) {
            const reader = new FileReader();
            // IE doesn't support Promise, but there is a polyfill, if you require one.
            return new Promise(function (resolve, reject) {
                reader.onerror = function () {
                    reader.abort();
                    reject(new Error("Error parsing file " + file.name));
                };
                reader.onload = function () {
                    // This will result in an array that will be recognized by C#.NET WebApi as a byte[]
                    const bytes = Array.from(new Uint8Array(this.result));
                    // Create the base64encoded string:
                    const base64StringFile = window.btoa(bytes.map(function (item) {
                        return String.fromCharCode(item);
                    }).join(""));
                    // Resolve the promise with a custom file structure
                    resolve({
                        "base64StringFile": base64StringFile,
                        "fileName": file.name,
                        "fileType": file.type
                    });
                };
                reader.readAsArrayBuffer(file);
            });
        }

        /**
         * Convert an array of JavaScript File objects to base64 encoded strings.
         * @param {Array<Object>} files The JavaScript file object array.
         * @return {void}
         */
        function getFiles(files) {
            return Promise.all(Array.from(files).map(function (file) {
                return getFile(file);
            })).then(function (jsonFiles) {
                performUpload(jsonFiles);
            }).catch(function (error) {
                console.error(error);
            });
        }

        const files = document.getElementById("idBtnSelectFiles").files;
        if (files.length === 0) {
            console.error("No file(s) selected.");
        } else {
            getFiles(files);
        }
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnUploadFile", "func": uploadSingleFile, "funcsToDisplay": [uploadSingleFile]},
        {"evt": "click", "elmId": "idBtnUploadFiles", "func": uploadMultipleFiles, "funcsToDisplay": [uploadMultipleFiles]}
    ]);
    demo.displayVersion("cm");
}());
