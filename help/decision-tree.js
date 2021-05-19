/*jslint browser: true, long: true */
/*global $ */

/*
 * Developed by Leah Scheide for the UW KnowledgeBase at the University of Wisconsin-Madison
 */

$(document).ready(function () {

    $("ul#tree li ul").addClass("choices-collapsed");  // Hides subquestions at start

    $("#tree li label").click(function (event) {
        // Reveals subquestions for selected choice, hides choices not selected
        const targetElm = $(event.target).parent();
        if (targetElm.is("label")) {
            targetElm.parent().addClass("choice-selected");
            targetElm.nextAll().removeClass("choices-collapsed");
            targetElm.parent().nextAll().addClass("choices-collapsed");
            targetElm.parent().prevAll().addClass("choices-collapsed");
        }
    });

    $("#goBack").click(function () {
        // Undoes last selection
        $("li.choice-selected:last").children("ul").addClass("choices-collapsed");
        $("li.choice-selected:last").nextAll().removeClass("choices-collapsed");
        $("li.choice-selected:last").prevAll().removeClass("choices-collapsed");
        $("li.choice-selected:last").removeClass("choice-selected").children("input").prop("checked", false);
    });

    $("#reset").click(function () {
        // Resets to initial state
        $("#tree li").removeClass("choices-collapsed");
        $("#tree li").removeClass("choice-selected");
        $("#tree input").prop("checked", false);
        $("ul#tree li ul").addClass("choices-collapsed");
    });

    // Not currently using showAll function
        //$("#showAll").click(function(event) {
        //    $("*").removeClass("choices-collapsed");
        //    $("*").removeClass("choice-selected");
        //});

});