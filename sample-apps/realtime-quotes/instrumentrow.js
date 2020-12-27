/*jslint this: true, browser: true, for: true, long: true, single: true */
/*global window $ console PubSubManager InstrumentCell */

/**
 * An instrument row
 *
 * @constructor
 * @param {Object} containerElm The element which will contain the rows to be created
 * @param {string} name Name of the instrument
 * @param {Object} initialQuoteMessage The initial price state from the response
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

    /**
     * Get the given title, which is probably the instrument name.
     * @return {string} Title - Contents of the first column
     */
    this.getTitle = function () {
        return instrumentNameCell.innerText;
    };

    /**
     * Update the title.
     * @param {string} title The new title.
     * @return {void}
     */
    this.setTitle = function (title) {
        instrumentNameCell.innerText = title;
    };

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
                if (quoteMessage.Quote.hasOwnProperty("MarketState") && quoteMessage.Quote.MarketState === "Closed") {
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

        let lastUpdated;
        if (quoteMessage.Uic === initialQuoteMessage.Uic) {
            lastUpdated = (
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
        }
    }

    /**
     * Stop listening and remove row.
     * @return {void}
     */
    function removeRow() {
        // This function can be made for a specific Uic..
        lastCell.stop();
        bidCell.stop();
        askCell.stop();
        openCell.stop();
        closeCell.stop();
        highCell.stop();
        lowCell.stop();
        volumeCell.stop();
        instrumentNameCell.remove();
        elmMain.remove();
        PubSubManager.unsubscribe("RemoveInstrumentList", removeRow);
        PubSubManager.unsubscribe("NewQuote", processQuoteMessage);
    }

    /**
     * Initialize the row, by creating the cells and append them to the container.
     * @return {void}
     */
    function init() {
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
        // Subscribe to new price broadcasts
        PubSubManager.subscribe("NewQuote", processQuoteMessage);
        PubSubManager.subscribe("RemoveInstrumentList", removeRow);
    }

    init();
}
