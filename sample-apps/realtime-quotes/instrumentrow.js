/*jslint browser: true, long: true */
/*global console InstrumentCell */

/**
 * An instrument row
 *
 * @constructor
 * @param {Object} containerElm The element which will contain the rows to be created
 * @param {string} name Name of the instrument
 * @param {Object} initialQuoteMessage The initial price state from the response
 * @return {Object} The object with destroy function
 */
function InstrumentRow(containerElm, name, initialQuoteMessage) {

    const elmMain = document.createElement("DIV");
    const instrumentNameCell = document.createElement("SPAN");
    let lastCell;
    let lastTimeCell;
    let bidCell;
    let askCell;
    let highCell;
    let lowCell;
    let openCell;
    let closeCell;
    let volumeCell;

    function logMissedProperties(quoteMessage) {
        const hasQuote = quoteMessage.hasOwnProperty("Quote");
        const hasPriceInfo = quoteMessage.hasOwnProperty("PriceInfo");
        const hasPriceInfoDetails = quoteMessage.hasOwnProperty("PriceInfoDetails");
        const hasInstrumentPriceDetails = quoteMessage.hasOwnProperty("InstrumentPriceDetails");
        const originalObject = JSON.stringify(quoteMessage, null, 4);
        let unknownProperties;
        delete quoteMessage.LastUpdated;
        delete quoteMessage.Uic;
        if (hasQuote) {
            delete quoteMessage.Quote.Ask;
            delete quoteMessage.Quote.Bid;
            delete quoteMessage.Quote.Mid;
            delete quoteMessage.Quote.PriceTypeAsk;
            delete quoteMessage.Quote.PriceTypeBid;
            delete quoteMessage.Quote.MarketState;
            delete quoteMessage.Quote.Amount;
            if (JSON.stringify(quoteMessage.Quote) === "{}") {
                delete quoteMessage.Quote;
            }
        }
        if (hasPriceInfo) {
            delete quoteMessage.PriceInfo.High;
            delete quoteMessage.PriceInfo.Low;
            delete quoteMessage.PriceInfo.NetChange;
            delete quoteMessage.PriceInfo.PercentChange;
            if (JSON.stringify(quoteMessage.PriceInfo) === "{}") {
                delete quoteMessage.PriceInfo;
            }
        }
        if (hasPriceInfoDetails) {
            delete quoteMessage.PriceInfoDetails.AskSize;
            delete quoteMessage.PriceInfoDetails.BidSize;
            delete quoteMessage.PriceInfoDetails.LastTraded;
            delete quoteMessage.PriceInfoDetails.LastClose;
            delete quoteMessage.PriceInfoDetails.Volume;
            if (JSON.stringify(quoteMessage.PriceInfoDetails) === "{}") {
                delete quoteMessage.PriceInfoDetails;
            }
        }
        if (hasInstrumentPriceDetails) {
            delete quoteMessage.InstrumentPriceDetails.IsMarketOpen;
            delete quoteMessage.InstrumentPriceDetails.MidYield;
            delete quoteMessage.InstrumentPriceDetails.ValueDate;
            delete quoteMessage.InstrumentPriceDetails.AccruedInterest;
            delete quoteMessage.InstrumentPriceDetails.OpenInterest;
            if (JSON.stringify(quoteMessage.InstrumentPriceDetails) === "{}") {
                delete quoteMessage.InstrumentPriceDetails;
            }
        }
        unknownProperties = JSON.stringify(quoteMessage, null, 4);
        if (unknownProperties !== "{}") {
            console.error("Detected missed PriceInfo: " + unknownProperties + "\nOriginal: " + originalObject);
        }
    }

    /**
     * Update the appropriate cell with the new price.
     * @param {Object} quoteMessage The new data to display.
     * @return {void}
     */
    function processQuoteMessage(quoteMessage) {
        const hasQuote = quoteMessage.hasOwnProperty("Quote");
        const hasPriceInfo = quoteMessage.hasOwnProperty("PriceInfo");
        const hasPriceInfoDetails = quoteMessage.hasOwnProperty("PriceInfoDetails");

        function processForLastPrice(quoteMessageToBroadcast) {
            let price = 0;
            if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("LastTraded")) {
                price = quoteMessage.PriceInfoDetails.LastTraded;
            } else if (hasQuote && quoteMessage.Quote.hasOwnProperty("Mid")) {
                // Fallback to mid price
                price = quoteMessage.Quote.Mid;
            }
            if (price !== 0) {
                quoteMessageToBroadcast.prc = price;
                if (hasPriceInfoDetails) {
                    if (quoteMessage.PriceInfoDetails.hasOwnProperty("LastTradedSize")) {
                        quoteMessageToBroadcast.vol = quoteMessage.PriceInfoDetails.LastTradedSize;
                    } else if (quoteMessage.PriceInfoDetails.hasOwnProperty("MidSize")) {
                        quoteMessageToBroadcast.vol = quoteMessage.PriceInfoDetails.MidSize;
                    }
                }
                if (hasQuote && quoteMessage.Quote.hasOwnProperty("MarketState") && quoteMessage.Quote.MarketState === "Closed") {
                    quoteMessageToBroadcast.tags = "M";  // Indicative price
                }
                lastCell.update(quoteMessageToBroadcast);
                lastTimeCell.update(quoteMessageToBroadcast);
            }
        }

        function processForAskPrice(quoteMessageToBroadcast) {
            if (hasQuote && quoteMessage.Quote.hasOwnProperty("Ask")) {
                quoteMessageToBroadcast.prc = quoteMessage.Quote.Ask;
                if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("AskSize")) {
                    quoteMessageToBroadcast.vol = quoteMessage.PriceInfoDetails.AskSize;
                }
                if (hasPriceInfo && quoteMessage.PriceInfo.hasOwnProperty("PriceTypeAsk") && quoteMessage.PriceInfo.PriceTypeAsk === "Indicative") {
                    quoteMessageToBroadcast.tags = "M";  // Indicative price
                }
                askCell.update(quoteMessageToBroadcast);
            }
        }

        function processForBidPrice(quoteMessageToBroadcast) {
            if (hasQuote && quoteMessage.Quote.hasOwnProperty("Bid")) {
                quoteMessageToBroadcast.prc = quoteMessage.Quote.Bid;
                if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("BidSize")) {
                    quoteMessageToBroadcast.vol = quoteMessage.PriceInfoDetails.BidSize;
                }
                if (hasPriceInfo && quoteMessage.PriceInfo.hasOwnProperty("PriceTypeBid") && quoteMessage.PriceInfo.PriceTypeBid === "Indicative") {
                    quoteMessageToBroadcast.tags = "M";  // Indicative price
                }
                bidCell.update(quoteMessageToBroadcast);
            }
        }

        function processForHighPrice(quoteMessageToBroadcast) {
            if (hasPriceInfo && quoteMessage.PriceInfo.hasOwnProperty("High")) {
                quoteMessageToBroadcast.prc = quoteMessage.PriceInfo.High;
                highCell.update(quoteMessageToBroadcast);
            }
        }

        function processForLowPrice(quoteMessageToBroadcast) {
            if (hasPriceInfo && quoteMessage.PriceInfo.hasOwnProperty("Low")) {
                quoteMessageToBroadcast.prc = quoteMessage.PriceInfo.Low;
                lowCell.update(quoteMessageToBroadcast);
            }
        }

        function processForOpenPrice(quoteMessageToBroadcast) {
            if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("Open")) {
                quoteMessageToBroadcast.prc = quoteMessage.PriceInfoDetails.Open;
                openCell.update(quoteMessageToBroadcast);
            }
        }

        function processForClosePrice(quoteMessageToBroadcast) {
            if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("LastClose")) {
                quoteMessageToBroadcast.prc = quoteMessage.PriceInfoDetails.LastClose;
                closeCell.update(quoteMessageToBroadcast);
                lastCell.update(quoteMessageToBroadcast);  // Do this to be able to calculate difference
            }
        }

        function processForVolume(quoteMessageToBroadcast) {
            // Cumulative volume
            if (hasPriceInfoDetails && quoteMessage.PriceInfoDetails.hasOwnProperty("Volume")) {
                quoteMessageToBroadcast.vol = quoteMessage.PriceInfoDetails.Volume;
                volumeCell.update(quoteMessageToBroadcast);
            }
        }

        const lastUpdated = (
            quoteMessage.hasOwnProperty("LastUpdated")
            ? new Date(quoteMessage.LastUpdated)
            : new Date()
        );
        processForAskPrice({
            "typ": "ask",
            "dt": lastUpdated
        });
        processForBidPrice({
            "typ": "bid",
            "dt": lastUpdated
        });
        processForLastPrice({
            "typ": "lst",
            "dt": lastUpdated
        });
        processForHighPrice({
            "typ": "hgh",
            "dt": lastUpdated
        });
        processForLowPrice({
            "typ": "low",
            "dt": lastUpdated
        });
        processForOpenPrice({
            "typ": "opn",
            "dt": lastUpdated
        });
        processForClosePrice({
            "typ": "cls",
            "dt": lastUpdated
        });
        processForVolume({
            "typ": "vol",
            "dt": lastUpdated
        });

        logMissedProperties(quoteMessage);
    }

    /**
     * Stop listening and remove row.
     * @return {void}
     */
    function remove() {
        lastCell.stop();
        lastCell = null;
        bidCell.stop();
        bidCell = null;
        askCell.stop();
        askCell = null;
        openCell.stop();
        openCell = null;
        closeCell.stop();
        closeCell = null;
        highCell.stop();
        highCell = null;
        lowCell.stop();
        lowCell = null;
        volumeCell.stop();
        volumeCell = null;
        instrumentNameCell.remove();
        elmMain.remove();
    }

    /**
     * Initialize the row, by creating the cells and append them to the container.
     * @return {void}
     */
    function setupInstrumentRow() {
        instrumentNameCell.classList.add("instrumentName");
        instrumentNameCell.innerText = name;
        elmMain.append(instrumentNameCell);
        // Add different cells
        lastCell = new InstrumentCell(elmMain, "lst", "price", true, initialQuoteMessage);
        bidCell = new InstrumentCell(elmMain, "bid", "price", true, initialQuoteMessage);
        askCell = new InstrumentCell(elmMain, "ask", "price", true, initialQuoteMessage);
        highCell = new InstrumentCell(elmMain, "hgh", "price", true, initialQuoteMessage);
        lowCell = new InstrumentCell(elmMain, "low", "price", true, initialQuoteMessage);
        openCell = new InstrumentCell(elmMain, "opn", "price", false, initialQuoteMessage);
        closeCell = new InstrumentCell(elmMain, "cls", "price", false, initialQuoteMessage);
        volumeCell = new InstrumentCell(elmMain, "vol", "volume", false, initialQuoteMessage);
        lastTimeCell = new InstrumentCell(elmMain, "lst", "time", true, initialQuoteMessage);
        containerElm.append(elmMain);
        return Object.freeze({
            initialQuoteMessage,
            processQuoteMessage,
            remove
        });
    }

    return setupInstrumentRow();
}
