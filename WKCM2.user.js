// ==UserScript==
// @name        WKCM2
// @namespace   wkcm
// @description This script allows WaniKani members to contribute their own mnemonics which appear on any page that includes item info.
// @exclude		*.wanikani.com
// @exclude		*.wanikani.com/level/radicals*
// @include     *.wanikani.com/level/*
// @include     *.wanikani.com/kanji*
// @include     *.wanikani.com/vocabulary*
// @include     *.wanikani.com/review/session
// @include     *.wanikani.com/lesson/session
// @version     0.1
// @author      Daniel Ostertag (Dakes)
// @grant       none

/* This script is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license
*  Details: http://creativecommons.org/licenses/by-nc/4.0/ */

console.log("WKCM2 log start ==========")

let WKCM2_version = "0.1";

// if current page is Review page
let CMIsReview = (window.location.pathname.indexOf("/review/") > -1);
// if current page is Lesson page
let CMIsLesson = (window.location.pathname.indexOf("/lesson/") > -1);

// Only true in list of items
let CMIsList = false;
if (!CMIsReview && !CMIsLesson)
{
    CMIsList = (
        // TODO: generalize regex, only matches 2 digit levels (in case they add more levels ... much more)
        // true if on a level page
        new RegExp("level\/[0-9]{1,2}$", "i").test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2)) ||
        // true if on a /kanji?difficulty=pleasant site
        new RegExp("[kanji|vocabulary].[difficulty=[A-Z]$|$]", "i").test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2))
    );
}

// TODO: true on individual item pages
let CMIsItem = false;


// global variables
let CMUserClass = "user-summary__username";
let CMUser;
let CMChar = "";
let CMType = ""; // k, v, r (kanji, vocabluary, radical)

// colors
let CMColorReq = "#ff5500";
let CMColorMnemAvail = "#71aa00";

// HTML
let CMouterHTML = /* html */`<div id="wkcm" class="cm">
<br><br> <h2 class="cm-header">Community Mnemonics</h2>
<div id="cm-meaning" class="cm-content"> </div>
<div id="cm-reading" class="cm-content"> </div>
</div>`;

let CMcss = /* css */`
.cm-header{
text-align: left;
}
.cm-content{
    padding: 20px;
    width: 40%;
    text-align: left;
}
#cm-meaning{
    display: inline-block;
    margin-left: auto;
    vertical-align: top;
}
#cm-reading{
    display: inline-block;
    margin-right: auto;
    vertical-align: top;
}
.cm{
    overflow: auto;
    text-align: center;
}
`;

let CMlistCss = /* css */`
.commnem-badge, .commnem-badge-req { position: absolute; left: 0 }
.commnem-badge:before, .commnem-badge-req:before {
content: "\\5171\"; display: block; position: absolute; top: -0.6em; left: -0.6em; width: 2em; height: 2em; color: #fff; font-size: 16px; font-weight: normal;
line-height: 2.2em; -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5); box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-webkit-border-radius: 50%; -moz-border-radius: 50%; border-radius: 50%; z-index: 999 }
ul.multi-character-grid .commnem-badge:before, ul.multi-character-grid .commnem-badge-req:before { top: 1.1em; left: -1.1em; font-size: 11px; text-align: center }
.commnem-badge:before { background-color: #71aa00; text-shadow: 0 2px 0 #1a5300; }
.commnem-badge-req:before { background-color: #e1aa00; text-shadow: 0 2px 0 #7a5300 }`;

let CMcontentCSS = /* css */`
.cm-prev, .cm-next, .cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight { cursor: pointer !important }
.cm-prev, .cm-next { font-size: 50px; margin: 0px 0px 0px 0px; padding: 15px 10px 0px 0px;}
.cm-prev{float:left}
.cm-next{float:right}
.cm-mnem-text{float:left; width: calc(100% - 120px); height: calc(100% - 200px)}
.cm-prev.disabled, .cm-next.disabled { opacity: 0.25 }
.cm-prev span, .cm-next span
{
    background: -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(85, 85, 85)), to(rgb(70, 70, 70))); -webkit-background-clip: text;
}
.cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight
{
    text-align: center; font-size: 14px; width: 75px; margin-right: 10px; float: left; background-repeat: repeat-x; cursor: help; padding: 1px 4px; color: #fff;
    text-shadow: 0 1px 0 rgba(0,0,0,0.2); white-space: nowrap; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px;
    -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; -moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset
}
.cm-upvote-highlight { background-image: linear-gradient(to bottom, #5c5, #46ad46) }

.cm-downvote-highlight { background-image: linear-gradient(to bottom, #c55, #ad4646) }
.cm-user-buttons { position: absolute; margin-top: -34px }
.cm-delete-highlight, .cm-edit-highlight { font-size: 12px; width: 50px; height: 12px; line-height: 1 }
.cm-delete-highlight { background-image: linear-gradient(to bottom, #811, #6d0606); margin-right: 0 }
.cm-edit-highlight { background-image: linear-gradient(to bottom, #ccc, #adadad) }
.cm-delete-highlight.disabled, .cm-edit-highlight.disabled { display: none; pointer-events: none }
.cm-submit-highlight { margin-top: 10px; width: 100px; background-image: linear-gradient(to bottom, #555, #464646) }
.cm-submit-highlight.disabled { color: #8b8b8b !important }
.cm-req-highlight { margin-top: 10px; width: 100px; background-image: linear-gradient(to bottom, #ea5, #d69646)}

.cm-info { display: inline-block }
.cm-info, .cm-info div { margin-bottom: 0px !important }
.cm-score { float: left; width: 80px }
.cm-score-num { color: #555 }
.cm-score-num.pos { color: #5c5 }
.cm-score-num.neg { color: #c55 }


`;

// data
let CMDummyData = {
    "女": {
        "meaning_mne": "meaning mnemonic content",
        "reading_mne": "reading mnemonic content",
        "rating": 3,
        "author": "Dakes"
    }
};


// fetch username
if(CMIsReview || CMIsLesson)
    CMUser = window.WaniKani.username;
else
    try
    {
        CMUser = document.getElementsByClassName(CMUserClass)[0].innerHTML;
    }
    catch(err)
    {
        throw new Error("CM Warning: CMUser not set. \n" + err);
    }


if (CMIsReview || CMIsLesson)
{

    window.addEventListener('load', function() {
        init();
    }, false);

}
else // (CMIsReview || CMIsLesson)
{
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function() { init();/*checkCMNewestVersion(0);*/ });
    else
        init();
        //checkCMNewestVersion(0);
}

/**
 * Adds css in the head
 * */
function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css.replace(/;/g, ' !important;');
    head.appendChild(style);
}

/**
 * Initializes all elements. Does not add functionality yet
 * */
function init()
{
    addGlobalStyle(CMcss);
    addGlobalStyle(CMcontentCSS);

    if (CMIsReview)
    {
        CMType = document.getElementById("character").className;
        // initCMReview();
        addHTMLinID('item-info', CMouterHTML);
        
        document.getElementById("cm-meaning").innerHTML = getContentIframe("m", CMType);
        document.getElementById("cm-reading").innerHTML = getContentIframe("r", CMType);
        
    } else if (CMIsLesson)
    {
        CMType = document.getElementById("character").className;
        // initCMLesson();
        addHTMLinID('supplement-info', CMouterHTML);

        document.getElementById("cm-meaning").innerHTML = getContentIframe("m", CMType);
        document.getElementById("cm-reading").innerHTML = getContentIframe("r", CMType);
    } else if (CMIsList)
    {
        addGlobalStyle(CMlistCss);
        // TODO: get rid of jquery
        $(".additional-info.level-list.legend li").parent().prepend(getCMLegend(true)).prepend(getCMLegend(false));
        $(".legend.level-list span.commnem").css("background-color", CMColorMnemAvail).parent().parent().parent().children("li").css("width", 188).parent().children("li:first-child, li:nth-child(6)")
            .css("width", 187);
        $(".legend.level-list span.commnem-req").css("background-color", CMColorReq);
    } else
    {
        console.log("init else")
    }

    // TODO: init spreadsheet connection, or whatever


}

/**
 * Adds the given HTML to an element with id. Checks, if the element with id exists.
 * */
function addHTMLinID(id, html, position="beforeend")
{
    let ele = document.getElementById(id);
    if (ele)
        ele.insertAdjacentHTML(position, html)
}

/**
 * Creates the initial HTML code for the individual Mnemonic types, including Iframes.
 * Does not include content
 */
function getContentIframe(mnemType, itemType)
{
    /* // Radicals only have "meaning"
    if (itemType === "radical" && mnemType === "r")
        return ""
     */
    
    let CMMnemType = (mnemType === "m") ? "meaning" : "reading";
    // TODO implement
    let CMItem = null;
    let CMLen = 1;
    let CMPage = 1;
    
    // TODO: fix dynamic resizing of iframe
    // create iframe
    let CMIframeClass = "cm-mnem-text";
    // CMIframeClass += " cm-mnem-text-" + CMMnemType;
    let CMIframeId = "cm-iframe-" + CMMnemType;

    let CMinitialIframe = "<html><head></head><body><div>Loading Community Mnemonic ...</div></body></html>";
    let CMUserContentIframe = "<iframe class='" + CMIframeClass + "' id='" + CMIframeId + "' srcdoc=\""+ CMinitialIframe + " \" src=''"+// width='700' height='150' " +
        "sandbox scrolling='no' frameBorder='0' >" +
        "</iframe>";

    let CMtypeHeader = "<h2>" + CMMnemType.charAt(0).toUpperCase() + CMMnemType.slice(1) + " Mnemonic</h2>"
    // TODO: only execute if CM available
    let CMContent =
        CMtypeHeader +
        // left arrow
        '<div id="cm-' + CMMnemType + '-prev" class="cm-prev' + ((CMLen > 1 && CMPage > 0) ? "" : " disabled") + '"><span>◄</span></div>' +
        // sandboxed iframe with user Mnemonic
        CMUserContentIframe +
        // right arrow
        '<div id="cm-' + CMMnemType + '-next" class="cm-next' + ((CMLen > 1 && CMPage < CMLen - 1) ? "" : " disabled") + '"><span>►</span></div>' +
        // Voting and submit buttons
        '<div id="cm-' + CMMnemType + '-info" class="cm-info">' +
        // score
        '<div class="cm-score">Score: <span id="cm-' + CMMnemType +
        '-score-num" class="cm-score-num' + '">' + // cm-score-num (pos/nev/"") based on score
        '0' /*TODO: add score*/ + '</span></div><div class="cm-upvote-highlight">Upvote</div><div class="cm-downvote-highlight">Downvote</div>' +
        // edit button
        '<div id="cm-' + CMMnemType + '-user-buttons" class="cm-user-buttons"><div class="cm-edit-highlight'/*class+( disabled) if not by user */ + '">Edit</div>' +
        // delete button
        '<div class="cm-delete-highlight' + /*class+( disabled) if not by user */
        '">Delete</div></div><br />' +
        // submit button
        '<div id="cm-' + CMMnemType + '-submit" class="cm-submit-highlight">Submit Yours</div></div>';

    // TODO: add case for no CM available
    return CMContent;
}
// Init Functions

function initCMLesson()
{
    // CMChar = decodeURIComponent(document.getElementById("character").textContent);
    // maybe change to kan, voc, rad
    // CMType = (($("#main-info").attr("class") !== "radical") ? (($("#main-info").attr("class") == "kanji") ? "k" : "v") : "r");

    // addHTMLinID('supplement-info', CMLoadingHTML)
    

}

function initCMReview()
{
    // addHTMLinID('item-info', CMLoadingHTML)
}


// Item List stuff

/**
 * Returns new elements for the legend on item list pages (.../kanji/, .../level/)
 * */
function getCMLegend(isReq) {
    // TODO: get rid of jquery
    return $('<li><div><span class="commnem' + ((isReq) ? "-req" : "") + '" lang="ja">共</span></div>' + ((isReq) ? "Mnemonic Requested" : "Community Mnemonics") + '</li>');
}

/**
 * Returns a badge for items in lists, whether a Mnemonic is available or requested
 * */
function getCMBadge(isRecent, isReq) {
    // TODO: get rid of jquery
    return $('<span lang="ja" ' + ((isRecent) ? ' style="top: ' + ((CMType == "k") ? '2.25em" ' : '1em" ') : '') + 'class="item-badge commnem-badge' + ((isReq) ? "-req" : "") + '"></span>');
}


