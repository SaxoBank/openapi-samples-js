/*jslint this: true, browser: true, long: true, single: true */
/*global console window */

/**
 * An instrument cell, part of a row
 *
 * @constructor
 * @param {Object} containerElm The element which will contain the cells to be created.
 * @param {string} cellType The type of price for this cell.
 * @param {string} infoToShow Show price, volume, time, or order count.
 * @param {boolean} hasHighlighting Do changes lead to highlighting?
 * @param {Object} initialQuoteMessage The initial price state from the response
 */
function InstrumentCell(containerElm, cellType, infoToShow, hasHighlighting, initialQuoteMessage) {

    const elm = document.createElement("SPAN");
    let timer;
    let currentPrice = 0;
    let previousDayClosePrice = 0;
    let lastUpdateDateTime = new Date(0);

    /**
     * Get time as a locale string. Add date if different day.
     * @param {Date} updateDateTime The timestamp.
     * @return {string} Formatted time, in format of the browser (might differ from the language of the customer!)
     */
    function getTimeString(updateDateTime) {

        /**
         * Validate if the price is generated today.
         * @return {boolean} Yes, if it is a quote of today
         */
        function isQuoteFromToday() {
            const today = new Date();
            return updateDateTime.getDate() === today.getDate() && updateDateTime.getMonth() === today.getMonth() && updateDateTime.getYear() === today.getYear();
        }

        let timeString;
        if (isQuoteFromToday(updateDateTime)) {
            // Today. Just display the time:
            timeString = updateDateTime.toLocaleTimeString();
        } else {
            // Not a quote from today. Include date:
            timeString = updateDateTime.toLocaleString();
        }
        return timeString;
    }

    /**
     * Update background and font color.
     * @param {string} backgroundColor The CSS background-color.
     * @param {string} fontColor The CSS font-color.
     * @return {void}
     */
    function changeColor(backgroundColor, fontColor) {
        elm.style.backgroundColor = backgroundColor;
        elm.style.color = fontColor;
    }

    /**
     * Undo the highlighting, after a few milliseconds.
     * @param {string} fontColor The new CSS font-color.
     * @return {void}
     */
    function resetHighlighting(fontColor) {
        changeColor("white", fontColor);
    }

    /**
     * The font starts black, but if we compare it with open, we can give color.
     * @param {number} lastPrice The current last price.
     * @return {void}
     */
    function giveValueColor(lastPrice) {
        // Do this only for the cells displaying last prices
        if (cellType === "lst" && infoToShow === "price" && lastPrice !== 0 && previousDayClosePrice !== 0) {
            // We are able to give color, because we have a last price to compare with the open price
            if (lastPrice > previousDayClosePrice) {
                // Make text green
                resetHighlighting("green");
            } else if (lastPrice < previousDayClosePrice) {
                // Make text red
                resetHighlighting("red");
            } else {
                // Make text black, the default
                resetHighlighting("black");
            }
        } else {
            // No close arrived for this instrument
            resetHighlighting("black");
        }
    }

    /**
     * Initialize the cell, by appending it to the containing row.
     * @return {void}
     */
    function init() {
        const hasPriceInfo = initialQuoteMessage.hasOwnProperty("PriceInfo");
        const hasPriceInfoDetails = initialQuoteMessage.hasOwnProperty("PriceInfoDetails");
        let textToDisplay = "";
        let eventDateTime;
        switch (cellType) {
        case "ask":
            if (initialQuoteMessage.Quote.hasOwnProperty("Ask")) {
                currentPrice = initialQuoteMessage.Quote.Ask;
            } else if (initialQuoteMessage.Quote.hasOwnProperty("PriceTypeAsk") && initialQuoteMessage.Quote.PriceTypeAsk === "NoAccess") {
                // You are not setup for a price feed on this instrument. No price will be provided. If you believe this is an error, please contact Saxo to be set up for prices on this instrument.
                textToDisplay = "NoAccess";
            }
            break;
        case "bid":
            if (initialQuoteMessage.Quote.hasOwnProperty("Bid")) {
                currentPrice = initialQuoteMessage.Quote.Bid;
            } else if (initialQuoteMessage.Quote.hasOwnProperty("PriceTypeBid") && initialQuoteMessage.Quote.PriceTypeBid === "NoAccess") {
                textToDisplay = "NoAccess";
            }
            break;
        case "lst":
            if (hasPriceInfoDetails && initialQuoteMessage.PriceInfoDetails.hasOwnProperty("LastTraded")) {
                if (infoToShow === "volume") {
                    currentPrice = initialQuoteMessage.PriceInfoDetails.LastTradedSize;
                } else {
                    currentPrice = initialQuoteMessage.PriceInfoDetails.LastTraded;
                }
            }
            // Fallback is the mid price:
            if (infoToShow === "price" && currentPrice === 0 && initialQuoteMessage.Quote.hasOwnProperty("Mid")) {
                currentPrice = initialQuoteMessage.Quote.Mid;
            }
            // Use previous day close price for coloring the price green or red:
            if (hasPriceInfoDetails && initialQuoteMessage.PriceInfoDetails.hasOwnProperty("LastClose")) {
                previousDayClosePrice = initialQuoteMessage.PriceInfoDetails.LastClose;
            }
            break;
        case "cls":
            if (hasPriceInfoDetails && initialQuoteMessage.PriceInfoDetails.hasOwnProperty("LastClose")) {
                currentPrice = initialQuoteMessage.PriceInfoDetails.LastClose;
            }
            break;
        case "opn":
            if (hasPriceInfoDetails && initialQuoteMessage.PriceInfoDetails.hasOwnProperty("Open")) {
                currentPrice = initialQuoteMessage.PriceInfoDetails.Open;
            }
            break;
        case "hgh":
            if (hasPriceInfo && initialQuoteMessage.PriceInfo.hasOwnProperty("High")) {
                currentPrice = initialQuoteMessage.PriceInfo.High;
            }
            break;
        case "low":
            if (hasPriceInfo && initialQuoteMessage.PriceInfo.hasOwnProperty("Low")) {
                currentPrice = initialQuoteMessage.PriceInfo.Low;
            }
            break;
        case "vol":
            if (hasPriceInfoDetails && initialQuoteMessage.PriceInfoDetails.hasOwnProperty("Volume")) {
                currentPrice = initialQuoteMessage.PriceInfoDetails.Volume;
            }
            break;
        }
        switch (infoToShow) {
        case "price":
        case "volume":
            elm.classList.add("price");
            break;
        case "time":
            elm.classList.add("dateTime");
            break;
        }
        if (infoToShow === "time") {
            eventDateTime = new Date(initialQuoteMessage.LastUpdated);
            if (eventDateTime.getTime() > Date.now() - (300 * 24 * 60 * 60 * 1000)) {
                textToDisplay = getTimeString(eventDateTime);
            }
        } else if (currentPrice !== 0) {
            textToDisplay = currentPrice.toFixed(initialQuoteMessage.DisplayAndFormat.Decimals);
        }
        if (textToDisplay === "") {
            elm.innerHTML = "&nbsp;";
        } else {
            elm.innerText = textToDisplay;
        }
        giveValueColor(currentPrice);
        containerElm.append(elm);
    }

    /**
     * If a previous update was in progress, kill it.
     * @return {void}
     */
    function stopHighlightTimer() {
        window.clearInterval(timer);
    }

    /**
     * Display the updated price in red or green, depending on the direction.
     * @param {boolean} isHigher Green if price is higher than before.
     * @return {void}
     */
    function highlightUpdate(isHigher) {
        let fontColor;
        let backgroundColor;
        stopHighlightTimer();
        if (infoToShow === "time") {
            backgroundColor = "silver";
            fontColor = "black";
        } else if (isHigher) {
            backgroundColor = "green";
            fontColor = "white";
        } else {
            backgroundColor = "red";
            fontColor = "white";
        }
        changeColor(backgroundColor, fontColor);
        // Start timer to remove highlighting
        timer = window.setInterval(function () {
            if (cellType === "lst" && infoToShow === "price") {
                giveValueColor(currentPrice);
            } else {
                resetHighlighting("black");
            }
        }, 240);
    }

    /**
     * Determine if update must be highlighted (red or green).
     * @param {number} priceAsNumber The new price.
     * @return {boolean} Yes, if applicable for highlighting
     */
    function isHighlightingRequired(priceAsNumber) {
        // Only highlight updates
        return (hasHighlighting && priceAsNumber !== currentPrice && currentPrice !== 0);
    }

    /**
     * A message can have certain tags, if there is a special meaning.
     * @param {Object} quoteMessage The new data to display.
     * @return {boolean} Yes, if tagged for a special reason, like 'Cancel'
     */
    function isTaggedAndNeedsNoFurtherProcessing(quoteMessage) {

        function displayCustomText(newText) {
            elm.innerText = newText;
            resetHighlighting("black");
        }

        if (quoteMessage.hasOwnProperty("tags")) {
            if (quoteMessage.tags.indexOf("C") >= 0) {
                // Cancel all current quotes, because a new cycle starts.
                displayCustomText("");
                return true;
            }
            if (quoteMessage.tags.indexOf("M") >= 0) {
                // This is a market quote message. Show this indication (in the bid/ask cell).
                displayCustomText("mkt");
                return true;
            }
            if (quoteMessage.tags.indexOf("O") >= 0) {
                // Process open indicator.
                displayCustomText("open");
                return true;
            }
            if (quoteMessage.tags.indexOf("X") >= 0) {
                // Exclude this quote from intraday charts, but show in overview lists.
                console.log("Received price tagged with 'X'. Shown in overview, but to be ignored in charts.");
            }
        }
        return false;
    }

    /**
     * Update the text of the title attribute.
     * @param {Object} quoteMessage The new data to display.
     * @param {Date} updateDateTime The timestamp.
     * @return {void}
     */
    function updateTitleAttribute(quoteMessage, updateDateTime) {
        if (cellType !== "vol") {
            // Cumulative volume doesn't come with date/time
            if (!quoteMessage.hasOwnProperty("vol") || quoteMessage.vol === 0) {
                elm.title = getTimeString(updateDateTime);
            } else if ((cellType === "bid" || cellType === "ask") && quoteMessage.hasOwnProperty("ord") && quoteMessage.ord !== 0) {
                elm.title = "Volume " + quoteMessage.vol + "/" + quoteMessage.ord + " @ " + getTimeString(updateDateTime);
            } else {
                elm.title = "Volume " + quoteMessage.vol + " @ " + getTimeString(updateDateTime);
            }
        }
    }

    /**
     * Process the price (or volume) update.
     * @param {Object} quoteMessage The new data to display.
     * @return {void}
     */
    this.update = function (quoteMessage) {

        function truncate(number) {
            return (
                number > 0
                ? Math.floor(number)
                : Math.ceil(number)
            );
        }

        const currentUpdateDateTime = quoteMessage.dt;
        let price;
        let priceAsNumber;
        if (isTaggedAndNeedsNoFurtherProcessing(quoteMessage)) {
            return;
        }
        if (cellType === "vol" && quoteMessage.vol === 0) {
            // Don't show the cumulative volume of an index.
            return;
        }
        if (infoToShow === "volume") {
            priceAsNumber = quoteMessage.vol;
            if (priceAsNumber > 1800000) {
                price = truncate(quoteMessage.vol / 1000000) + " M";
            } else if (priceAsNumber > 2000) {
                price = truncate(quoteMessage.vol / 1000) + " K";
            } else {
                price = quoteMessage.vol;
            }
        } else if (infoToShow === "time") {
            price = getTimeString(currentUpdateDateTime);
            priceAsNumber = currentUpdateDateTime.getTime();
        } else if (infoToShow === "orders") {
            // Some instruments don't have the order count enabled
            price = (
                quoteMessage.ord !== 0
                ? quoteMessage.ord
                : ""
            );
            priceAsNumber = quoteMessage.ord;
        } else {
            // Price
            price = quoteMessage.prc.toFixed(initialQuoteMessage.DisplayAndFormat.Decimals);
            if (quoteMessage.typ === "thp") {
                // This is a theoretical price, determined during an auction cycle. Give an indication of this, by surrounding the price with brackets.
                price = "[" + price + "]";
            }
            priceAsNumber = quoteMessage.prc;
        }
        elm.innerText = price;
        if (isHighlightingRequired(priceAsNumber)) {
            // A new last arrived, indicate if higher or lower.
            highlightUpdate(currentPrice < priceAsNumber);
        }
        currentPrice = priceAsNumber;
        lastUpdateDateTime = currentUpdateDateTime;
        updateTitleAttribute(quoteMessage, lastUpdateDateTime);
    };

    /**
     * Stop highlighting prices.
     * @return {void}
     */
    this.stop = function () {
        stopHighlightTimer();
        elm.remove();
    };

    init();
}
