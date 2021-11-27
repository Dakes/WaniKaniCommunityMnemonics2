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


let WKCM2_version = "0.1";
let scriptName = 'WKCM2';
let scriptNameLong = 'WaniKani Community Mnemonics 2';


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
let WKUser;

// google sheets apps script url, for sheet access
let sheetAppsScriptURL = "https://script.google.com/macros/s/AKfycbw-A6MH6YB80nzK3xfKEegBcddSCx9-gpzH--024sv0XboDLqI7qdbh6dqD5sqKKoYW_A/exec";

// colors TODO: remove from globals.
let CMColorReq = "#ff5500";
let CMColorMnemAvail = "#71aa00";

// HTML
let CMouterHTML = /* html */`<div id="wkcm" class="cm">
<br><br> <h2 class="cm-header">Community Mnemonics</h2>
<div id="cm-meaning" class="cm-content"> </div>
<div id="cm-reading" class="cm-content"> </div>
</div>`;

// CSS
let CMcss = /* css */`
.cm-header{
text-align: left;
}
.cm-content{
    padding: 20px;
    width: 47%; height: 100%; min-height: 300px;
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

.disabled {
    opacity: 0.3;
    pointer-events: none;
}
`;

let requestColor = "#e1aa00";
let CMlistCss = /* css */`
.commnem-badge, .commnem-badge-req { position: absolute; left: 0 }
.commnem-badge:before, .commnem-badge-req:before {
content: "\\5171\"; display: block; position: absolute; top: -0.6em; left: -0.6em; width: 2em; height: 2em; color: #fff; font-size: 16px; font-weight: normal;
line-height: 2.2em; -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5); box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-webkit-border-radius: 50%; -moz-border-radius: 50%; border-radius: 50%; z-index: 999 }
ul.multi-character-grid .commnem-badge:before, ul.multi-character-grid .commnem-badge-req:before { top: 1.1em; left: -1.1em; font-size: 11px; text-align: center }
.commnem-badge:before { background-color: #71aa00; text-shadow: 0 2px 0 #1a5300; }
.commnem-badge-req:before { background-color: #e1aa00; text-shadow: 0 2px 0 ${requestColor} }`;

// TODO: on click "invert" gradient, to give sick clicky feel
let textareaCSS = /* css */`
.cm-format-btn
{
    text-align: center;
    width: 35px !important; height: 30px !important;
    font-size: 20px !important;
    line-height: 30px !important;
    color: white;
    border-radius: 3px;
    margin-left: 5px;
    padding-left: 0px !important;
    padding-right: 0px !important;
    /* background-color: #f5f5f5; */
    /* background-image: -moz-linear-gradient(top, #fff, #e6e6e6); background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#fff), to(#e6e6e6));
    background-image: -webkit-linear-gradient(top, #fff, #e6e6e6); background-image: -o-linear-gradient(top, #fff, #e6e6e6);
    background-image: linear-gradient(to bottom, #fff, #e6e6e6); background-repeat: repeat-x; width: 10px; height: 10px; margin: 0 !important; */
    /* padding: 7px 13px 13px 7px; */

    line-height: 1; float: left;

    cursor: pointer;
}

.cm-format-btn.kanji, .cm-format-btn.radical, .cm-format-btn.vocabulary, .cm-format-btn.reading
{
    font-weight: bold;
    text-shadow: 0 1px 0 rgb(0 0 0 / 30%);
    box-sizing: border-box; transition: text-shadow 0.15s linear; box-shadow: 0 -3px 0 rgb(0 0 0 / 20%) inset,
}

.cm-format-btn.cm-format-bold, .cm-format-btn.cm-format-italic, .cm-format-btn.cm-format-underline, .cm-format-btn.cm-format-strike
{
    background-color: #f5f5f5;
    background-image: -moz-linear-gradient(top, #7a7a7a, #4a4a4a); background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#fff), to(#e6e6e6));
    background-image: -webkit-linear-gradient(top, #7a7a7a, #4a4a4a); background-image: -o-linear-gradient(top, #7a7a7a, #4a4a4a);
    background-image: linear-gradient(to bottom, #7a7a7a, #4a4a4a); background-repeat: repeat-x; width: 10px; height: 10px; margin: 0
    background-image: -webkit-linear-gradient(top, #7a7a7a, #4a4a4a); background-image: -o-linear-gradient(top, #7a7a7a, #707070);
    background-image: linear-gradient(to bottom, #7a7a7a, #4a4a4a); background-repeat: repeat-x; width: 10px; height: 10px;
}

.cm-form form
{
    min-height: 300px;
}
.cm-form fieldset
{
    padding: 1px;
    height: 110px;
}
.cm-text
{
overflow: auto; word-wrap: break-word; resize: none; height: calc(100% - 30px); width: 98%;
}
.counter-note
{
    padding: 0px; margin: 0px; margin-right: 10px; margin-top: 2px;
}
.cm-mnem-text
{
    float:left;
    width: calc(100% - 120px); height: 100%; min-height: 150px;
}

.cm-form-submit, .cm-form-cancel { margin-top: 0px; background-image: linear-gradient(to bottom, #555, #464646) }
`;

let cmuserbuttonsCSS = /* css */`
.cm-user-buttons { position: absolute; margin-top: -20px }
.cm-info { margin-top: 20px; margin-left: 65px }
`

let CMcontentCSS = /* css */`
.cm-prev, .cm-next, .cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight, .cm-form-submit, .cm-form-cancel { cursor: pointer !important }
.cm-prev, .cm-next { font-size: 50px; margin: 0px 0px 0px 0px; padding: 15px 10px 0px 0px;}
.cm-prev{float:left}
.cm-next{float:right}

.cm-prev.disabled, .cm-next.disabled { opacity: 0.25 }
.cm-prev span, .cm-next span
{
    background: -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(85, 85, 85)), to(rgb(70, 70, 70))); -webkit-background-clip: text;
}

.cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight, .cm-form-submit, .cm-form-cancel
{
    text-align: center; font-size: 14px; width: 75px; margin-right: 10px; float: left; background-repeat: repeat-x; cursor: help; padding: 1px 4px; color: #fff;
    text-shadow: 0 1px 0 rgba(0,0,0,0.2); white-space: nowrap; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px;
    -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; -moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset
}
.cm-upvote-highlight { background-image: linear-gradient(to bottom, #5c5, #46ad46) }

.cm-downvote-highlight { background-image: linear-gradient(to bottom, #c55, #ad4646) }

.cm-delete-highlight, .cm-edit-highlight { font-size: 12px; width: 50px; height: 12px; line-height: 1 }
.cm-delete-highlight { background-image: linear-gradient(to bottom, #811, #6d0606); margin-right: 0 }
.cm-edit-highlight { background-image: linear-gradient(to bottom, #ccc, #adadad) }
.cm-submit-highlight, .cm-form-submit, .cm-form-cancel { margin-top: 10px; width: 100px; background-image: linear-gradient(to bottom, #555, #464646) }
.cm-submit-highlight.disabled, .cm-form-submit.disabled { color: #8b8b8b !important }
.cm-req-highlight { margin-top: 10px; width: 100px; background-image: linear-gradient(to bottom, #ea5, #d69646)}

.cm-info { display: inline-block }
.cm-info, .cm-info div { margin-bottom: 0px !important }
.cm-score { float: left; width: 80px }
.cm-score-num { color: #555 }
.cm-score-num.pos { color: #5c5 }
.cm-score-num.neg { color: #c55 }

.cm-nomnem { margin-top: -10px !important } .cm-form fieldset { clear: left }

.cm-format { margin: 0 !important }

.cm-format-bold, .cm-format-underline, .cm-format-strike { padding-left: 10px; padding-right: 10px }

.cm-delete-text { position: absolute; opacity: 0; text-align: center }
.cm-delete-text h3 { margin: 0 }
`;


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


function checkWKOF()
{
    var wkof_version_needed = '1.0.53';
    if (!window.wkof)
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?'))
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }
    if (wkof.version.compare_to(wkof_version_needed) === 'older')
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework version '+wkof_version_needed+'.\nDo you want to be forwarded to the update page?'))
            window.location.href = 'https://greasyfork.org/en/scripts/38582-wanikani-open-framework';
        return;
    }

}

/**
 * Adds css in the head
 * */
function addGlobalStyle(css)
{
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;//css.replace(/;/g, ' !important;');
    head.appendChild(style);
}


// Get infos from page ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * wraps getElementById, but waits, until element is available. "Waiting on demand"
 * */
function getEleByIdWait(id, recursions=0)
{
    let maxWaitTime = 3000;
    let recursionTime = 10;
    let ele = document.getElementById(id);
    if (ele != null)
    {
        // console.log("getEleByIdWait: return: ", id);
        return ele;
    }
    else
    {
        if (recursions > maxWaitTime/recursionTime)
        {
            console.log("WKCM2: getEleByIdWait, recursion limit reached element with id:" + id + " not found. ");
            return null;
        }
        
        // wait, until site is completely loaded
        setTimeout(function()
                   {
                       ele = getEleByIdWait(id, recursions++);
                       // console.log("getEleByIdWait recursive call");
                       return ele;
                   }, recursionTime);
    }

}

function setUsername()
{
    if (window.wkof)
    {
        WKUser = wkof.user["username"]
        return WKUser;
    }

    let CMUserClass = "user-summary__username";

    if(CMIsReview || CMIsLesson)
        WKUser = window.WaniKani.username;
    else
        try
        {
            WKUser = document.getElementsByClassName(CMUserClass)[0].innerHTML;
        }
        catch(err)
        {
            throw new Error("WKCM2 Warning: CMUser not set. \n" + err);
        }
    return WKUser;
}

function getUsername()
{
    return setUsername();
}

function getItem()
{
    // TODO: add support for list page
    let item = null;
    try
    {
        // $.jStorage.get("l/currentLesson")["characters"]
        // TODO: add max recursion depth???

        item = $.jStorage.get("l/currentLesson")["characters"];
        if (item == null)
            console.log("WKCM2: getItem, item is null");

    }
    catch (err)
    {
        setTimeout(function(){item = getItem();}, 10);
    }
    return item;
}

/**
 * Returns radical, kanji or vocabulary
 * */
function getItemType()
{
    // TODO: add max recursion depth???
    let itemType = null;
    try
    {
        itemType = $.jStorage.get("l/currentLesson")["type"];
        if (typeof itemType === "string")
            itemType = itemType.toLowerCase()
        if (itemType == null)
            console.log("WKCM2: getItemType, itemType null");
        return itemType;
    }
    // in case it has not loaded far enough wait and try again.
    catch (err)
    {
        setTimeout(function(){itemType = getItemType();}, 10);
    }

    return itemType;
}
// Get infos from page ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

/**
 * Initializes all elements. Does not add functionality yet
 * */
function init()
{
    checkWKOF();
    
    addGlobalStyle(CMcss);
    addGlobalStyle(CMcontentCSS);
    addGlobalStyle(textareaCSS);
    addGlobalStyle(cmuserbuttonsCSS);

    // setInterval(function()
    //                {
    //                    // console.log("setCMType recursive call");
    //                    console.log("item: ", getItem());
    //                }, 500);

    

    if (CMIsReview)
    {
        // initCMReview();
        addHTMLinID('item-info', CMouterHTML);

        getEleByIdWait("cm-meaning").innerHTML = getCMdivContent("m");
        getEleByIdWait("cm-reading").innerHTML = getCMdivContent("r");

        initButtons("meaning");
        initButtons("reading");

    } else if (CMIsLesson)
    {
        let type = getItemType();
        let item = getItem();
        // console.log("init: type: ", type);
        // console.log("init: item: ", item);

        if (item == null)
        {
            
        }

        // initCMLesson();
        addHTMLinID('supplement-info', CMouterHTML);

        getEleByIdWait("cm-meaning").innerHTML = getCMdivContent("m");
        // document.getElementById("cm-iframe-meaning").outerHTML = getCMForm("meaning");
        getEleByIdWait("cm-reading").innerHTML = getCMdivContent("r");
        // document.getElementById("cm-iframe-reading").outerHTML = getCMForm("reading");
        
        initButtons("meaning");
        initButtons("reading");

        let characterDiv = getEleByIdWait("character");
        if (characterDiv != null)
            characterDiv.addEventListener('DOMSubtreeModified', function(){updateCM()});
        else
            console.log("character div NOT FOUND");


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


// Button initialization ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * Initializes Button functionality with EventListener click
 * */
function initButtons(mnemType)
{
    mnemType = getFullMnemType(mnemType);

    initInteractionButtons(mnemType);
    initEditButtons(mnemType);
}

/**
 * Adds a Event Listener for a click event to the element with id.
 * */
function addClickEvent(id, func, params)
{
    let div = document.getElementById(id);
    if (div)
        div.addEventListener("click", function() {func(...params);}, false);
}

function initInteractionButtons(mnemType)
{

    addClickEvent("cm-" + mnemType + "-edit", editCM, [mnemType]);
    addClickEvent("cm-" + mnemType + "-submit", submitCM, [mnemType]);
}

function initEditButtons(mnemType)
{

    addClickEvent("cm-" + mnemType + "-save", editSaveCM, [mnemType]);
    addClickEvent("cm-" + mnemType + "-cancel", editCancelCM, [mnemType]);
    addClickEvent("cm-format-" + mnemType + "-bold", insertTag, [mnemType, "b"]);
    addClickEvent("cm-format-" + mnemType + "-italic", insertTag, [mnemType, "i"]);
    addClickEvent("cm-format-" + mnemType + "-underline", insertTag, [mnemType, "u"]);
    addClickEvent("cm-format-" + mnemType + "-strike", insertTag, [mnemType, "s"]);
    addClickEvent("cm-format-" + mnemType + "-reading", insertTag, [mnemType, "read"]);
    addClickEvent("cm-format-" + mnemType + "-rad", insertTag, [mnemType, "rad"]);
    addClickEvent("cm-format-" + mnemType + "-kan", insertTag, [mnemType, "kan"]);
    addClickEvent("cm-format-" + mnemType + "-voc", insertTag, [mnemType, "voc"]);

}

// Button initialization ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

/**
 * Adds the given HTML to an element with id. Checks, if the element with id exists.
 * */
function addHTMLinID(id, html, position="beforeend")
{
    let ele = document.getElementById(id);
    if (ele)
        ele.insertAdjacentHTML(position, html)
}

function getFullMnemType(mnemType)
{
    let CMMnemType = ""
    if (mnemType === "m")
        CMMnemType = "meaning";
    else if (mnemType === "r")
        CMMnemType = "reading";
    else if (mnemType === "meaning" || mnemType === "reading")
        CMMnemType = mnemType;
    else
        throw new TypeError("mnemType in getFullMnemType is not valid. Value: " + mnemType);
    return CMMnemType;
}

/**
 * converts kanji -> k etc.
 * */
function getShortItemType(type)
{
    if (type === "kanji" || type === "k")
        return "k"
    else if (type === "vocabulary" || type === "v")
        return "v"
    else if (type === "radical" || type === "r")
        return "r"
    else
        throw new Error("WKCM2: getShortItemType got wrong ItemType: "+type);
}

/**
 * Creates emty Iframe for CM user content later on
 * @param mnemType m, r or meaning, reading
 * */
function getInitialIframe(mnemType)
{
    let CMMnemType = getFullMnemType(mnemType);

    let CMIframeId = "cm-iframe-" + CMMnemType;
    let CMIframeClass = "cm-mnem-text";
    let CMinitialIframe = getIframeSrcdoc("Loading Community Mnemonic ...");
    let CMUserContentIframe = "<iframe sandbox referrerpolicy='no-referrer' scrolling='no' frameBorder='0' class='" + CMIframeClass + "' id='" + CMIframeId + "' srcdoc=\""+ CMinitialIframe + " \" "+// width='700' height='150' " +
        "" +
        "</iframe>";
    return CMUserContentIframe;
}

/**
 * Creates the initial HTML code for the individual Mnemonic types, including Iframes. But also all Buttons.
 * Does not include content
 */
function getCMdivContent(mnemType)
{
    /* // Radicals only have "meaning"
    if (itemType === "radical" && mnemType === "r")
        return ""
     */

    mnemType = getFullMnemType(mnemType);
    // TODO implement
    let CMItem = null;
    let CMLen = 1;
    let CMPage = 1;

    let CMUserContentIframe = getInitialIframe(mnemType);

    let CMtypeHeader = "<h2>" + mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + " Mnemonic</h2>"
    // TODO: only execute if CM available
    let CMContent =
        CMtypeHeader +
        // left arrow
        '<div id="cm-' + mnemType + '-prev" class="cm-prev' + ((CMLen > 1 && CMPage > 0) ? "" : " disabled") + '"><span>◄</span></div>' +
        // sandboxed iframe with user Mnemonic
        CMUserContentIframe +
        // right arrow
        '<div id="cm-' + mnemType + '-next" class="cm-next' + ((CMLen > 1 && CMPage < CMLen - 1) ? "" : " disabled") + '"><span>►</span></div>' +
        // Voting and submit buttons
        '<div id="cm-' + mnemType + '-info" class="cm-info">' +
        // score
        '<div class="cm-score">Score: <span id="cm-' + mnemType +
        '-score-num" class="cm-score-num' + '">' + // cm-score-num (pos/nev/"") based on score
        '0' /*TODO: add score*/ + '</span></div><div id="cm-' + mnemType + '-upvote" class="cm-upvote-highlight">Upvote ▲</div><div id="cm-' + mnemType + '-downvote" class="cm-downvote-highlight">Downvote ▼</div>' +
        // button div
        '<div id="cm-' + mnemType + '-user-buttons" class="cm-user-buttons">' +
        // edit button
        '<div id="cm-' + mnemType + '-edit" class="cm-edit-highlight disabled'/*class+( disabled) if not by user */ + '"' +
        '>Edit</div>' +
        // delete button
        '<div id="cm-' + mnemType + '-delete" class="cm-delete-highlight disabled' + /*class+( disabled) if not by user */
        '">Delete</div></div><br />' +
        // submit button
        '<div id="cm-' + mnemType + '-submit" class="cm-submit-highlight">Submit Yours</div></div>';

    // TODO: add case for no CM available
    return CMContent;
}

function addClass(id, className="disabled")
{
    let ele = document.getElementById(id);
    if(!ele)
        return false;
    ele.classList.add(className);
    return true;
}

function removeClass(id, className="disabled")
{
    let ele = document.getElementById(id);
    if(!ele)
        return false;
    ele.classList.remove(className);
    return true;
}

function getSelectedText(textArea)
{
    let text =textArea.value;
    let indexStart=textArea.selectionStart;
    let indexEnd=textArea.selectionEnd;
    return text.substring(indexStart, indexEnd);
}

// Button functionality ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
function editCM(mnemType)
{
    // TODO: check if CM by user

    let iframe = document.getElementById("cm-iframe-" + mnemType);
    if (!iframe)
        return;

    iframe.outerHTML = getCMForm(mnemType);

    // TODO: update disabled class on buttons
    // addClass("cm-" + mnemType + "-edit");
    // addClass("cm-" + mnemType + "-delete");
    addClass("cm-" + mnemType + "-upvote");
    addClass("cm-" + mnemType + "-downvote");
    addClass("cm-" + mnemType + "-submit");
    
    initEditButtons(mnemType);

    // TODO: gray out button
}

function submitCM(mnemType)
{
    // "Submit Yours" Button
    // TODO: check if CM by user

    let iframe = document.getElementById("cm-iframe-" + mnemType);
    if (!iframe)
        return;

    iframe.outerHTML = getCMForm(mnemType);
    addClass("cm-" + mnemType + "-edit");
    addClass("cm-" + mnemType + "-delete");
    addClass("cm-" + mnemType + "-upvote");
    addClass("cm-" + mnemType + "-downvote");
    addClass("cm-" + mnemType + "-submit");

    initEditButtons(mnemType);

    // TODO: gray out button
}

function editSaveCM(mnemType)
{
    // TODO: check if CM by user

    let editForm = document.getElementById("cm-" + mnemType + "-form");
    if (!editForm)
        return;

    // TODO: submit text to DB
    editForm.outerHTML = getInitialIframe(mnemType);
    removeClass("cm-" + mnemType + "-edit");
    removeClass("cm-" + mnemType + "-delete");
    removeClass("cm-" + mnemType + "-upvote");
    removeClass("cm-" + mnemType + "-downvote");
    removeClass("cm-" + mnemType + "-submit");
    initEditButtons(mnemType);
}

function editCancelCM(mnemType)
{
    // TODO: check if CM by user

    let editForm = document.getElementById("cm-" + mnemType + "-form");
    console.log(mnemType);
    if (!editForm)
        return
    editForm.outerHTML = getInitialIframe(mnemType);
    removeClass("cm-" + mnemType + "-edit");
    removeClass("cm-" + mnemType + "-delete");
    removeClass("cm-" + mnemType + "-upvote");
    removeClass("cm-" + mnemType + "-downvote");
    removeClass("cm-" + mnemType + "-submit");
    
}

/*
 * Insert the tag "tag" at current cursor position, or around highlighted text. 
 */
function insertTag(mnemType, tag)
{
    let textarea = document.getElementById("cm-" + mnemType + "-text");
    if (!textarea)
        return

    let selectedText = getSelectedText(textarea);

    let insertText = "[" + tag + "]" + selectedText + "[/" + tag + "]"
    
    if (textarea.setRangeText)
    {
        //if setRangeText function is supported by current browser
        textarea.setRangeText(insertText);
    } else
    {
        textarea.focus()
        document.execCommand('insertText', false /*no UI*/, insertText);
    }
    
}


// Button functionality ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

function getCMForm(mnemType)
{
    var CMForm = '<form id="cm-' + mnemType + '-form" class="cm-form cm-mnem-text" onsubmit="return false"><div id="cm-' + mnemType + '-format" class="cm-format">' +
        '<div id="cm-format-' + mnemType + '-bold" class="btn cm-format-btn cm-format-bold"><b>b</b></div>' +
        '<div id="cm-format-' + mnemType + '-italic" class="btn cm-format-btn cm-format-italic"><i>i</i></div>' +
        '<div id="cm-format-' + mnemType + '-underline" class="btn cm-format-btn cm-format-underline"><u>u</u></div>' +
        '<div id="cm-format-' + mnemType + '-strike" class="btn cm-format-btn cm-format-strike"><s>s</s></div>' +
        '<div id="cm-format-' + mnemType + '-reading" class="btn cm-format-btn cm-format-reading reading highlight-reading">読</div>' +
        '<div id="cm-format-' + mnemType + '-rad" class="btn cm-format-btn cm-format-rad radical">部</div>' +
        '<div id="cm-format-' + mnemType + '-kan" class="btn cm-format-btn cm-format-kan kanji" >漢</div>' +
        '<div id="cm-format-' + mnemType + '-voc" class="btn cm-format-btn cm-format-voc vocabulary">語</div></div><fieldset>' +
        // textarea
        '<textarea id="cm-' + mnemType + '-text" class="cm-text" maxlength="5000" placeholder="Submit a community mnemn' +
        'ic"></textarea>' +
        '<div class="flex items-center"><span id="cm-' + mnemType + '-chars-remaining" class="block" title="Characters Remaining">5000<i class="fa fa-pencil ml-2"></i></span>' +
        '<button type="submit" id="cm-' + mnemType + '-save" class="ml-2 p-1 bg-gray-500 border-0 rounded-none font-lessons text-white disabled:cursor-not-allowed disabled:opacity-50">Save</button>' +
        '<button type="button" id="cm-' + mnemType + '-cancel" class="btn-cancel ml-2 p-1 bg-gray-500 border-0 rounded-none font-lessons text-white disabled:cursor-not-allowed disabled:opacity-50">Cancel</button></div>'

        '</fieldset></form>';
    return CMForm;
    /*
    '<button id="cm-' + mnemType +'-form-cancel" class="cm-form-cancel">Cancel</button>' +
            '<button id="cm-' + mnemType + '-form-submit" class="cm-form-submit disabled" type="button">Submit</button><span class="counter-note"' +
        'title="Characters Remaining">5000 ✏️</span>'*/
}



// Init Functions
function initCMLesson()
{
    // CMChar = decodeURIComponent(document.getElementById("character").textContent);
    // maybe change to kan, voc, rad
    // getItemType() = (($("#main-info").attr("class") !== "radical") ? (($("#main-info").attr("class") == "kanji") ? "k" : "v") : "r");

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
    return $('<span lang="ja" ' + ((isRecent) ? ' style="top: ' + ((getItemType() == "k") ? '2.25em" ' : '1em" ') : '') + 'class="item-badge commnem-badge' + ((isReq) ? "-req" : "") + '"></span>');
}

// Update Mnemnic content displayed ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
function updateCM(mnemType=["meaning", "reading"], index=0)
{
    // sick recursive execution, until mnemType is string
    if (typeof mnemType === "object")
    {
        for (let ele of mnemType)
        {
            updateCM(ele, index);
        }
    }
    else if (typeof mnemType === "string")
    {
        let item = getItem();
        let type = getItemType();
        // TODO: function typeShorten
        getMnemonic(item, type).then(mnemJson => updateCMelements(mnemType, type, mnemJson, index));
        
    }
}

/**
 * gets all stylesheets in link tags WaniKani uses, for use in iframes.
 * Memoizes result. 
 * */
function getWKcss()
{
    if (typeof getWKcss.css == "undefined")
    {
        getWKcss.css = [];
        let allLinks = document.querySelectorAll("head link");
        for (const link of allLinks)
        {
            if (link.rel !== "stylesheet")
                continue;
            getWKcss.css.push(link);
        }
    }
    return getWKcss.css;
}

function replaceMarkup(text, list)
{
    for (const ele of list)
    {
        text = text.replaceAll("["+ ele +"]", "<"+ ele +">");
        text = text.replaceAll("[/"+ ele +"]", "</"+ ele +">");
    }
    return text;
}

function getUserProfileLink(user)
{
    // Don't give Anonymous a profile link
    if (typeof user != "string" || user == "")
        return "";
    if (user == "Anonymous")
        return `<a>Anonymous</a>`;
    else
        return `<a href="https://www.wanikani.com/users/${user}" target="_blank" >${user}</a>`;
}

function getIframeSrcdoc(text, user=null)
{
    if (typeof text != "string")
    {
        console.log("WKCM2 Error: getIframeSrcdoc, did not get text, but: " + typeof text);
        text = "";
    }

    let cssLinks = getWKcss();
    let cssString = "";
    for (const l of cssLinks)
        cssString = cssString + l.outerHTML;
    // override style to fix some oddities
    cssString = cssString + /*css*/`<style>
body
{
    font-size: 100% !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    background-color: #fff !important;
}
.request
{
    background-color: ${requestColor} !important;
    display: inline !important;
    border-radius: 3px !important;
    padding: 1px !important;
}
</style>`;
    

    // TODO: replace markup
    // replace " by '
    text = text.replaceAll('"', "'");
    text = replaceMarkup(text, ["b", "i", "u", "s", "br"]);

    text = text.replaceAll("[/span]", `</span>`);
    text = text.replaceAll("[kan]", `<span class="highlight-kanji">`);
    text = text.replaceAll("[/kan]", `</span>`);
    text = text.replaceAll("[voc]", `<span class="highlight-vocabulary">`);
    text = text.replaceAll("[/voc]", `</span>`);
    text = text.replaceAll("[rad]", `<span class="highlight-radical">`);
    text = text.replaceAll("[/rad]", `</span>`);
    text = text.replaceAll("[read]", `<span class="highlight-reading">`);
    text = text.replaceAll("[/read]", `</span>`);
    
    let userMsg = "";
    // user can be null, if it is a system message
    if (user != null && typeof user === "string" && user != "")
    {
        userMsg = "by " + getUserProfileLink(user);
        
    }


    let srcdoc = `<html><head>${cssString}</head><body><div class="col2">${text}</div><div id="user-link">${userMsg}</div></body></html>`;
    return srcdoc;
}

function getNoMnemMsg()
{
    let msg = `No Community Mnemonic for this item exists yet. <br>Be the first to submit one.`;
    return msg;
}

function getMnemRequestedMsg(users)
{
    // TODO: make request color darker red, the more users requested
    let len = users.length;
    let msg = `A Mnemonic was <div class="request">requested</div> for this item. <br><div class="request">Help the community by being the first to submit one!</div>`;
    if (len === 1)
        msg = `A Mnemonic was <div class="request">requested</div> by user <div class="request">${users[0]}</div>. <br>Help them by being the first to submit one! `;
    else if (len > 1)
        msg = `A Mnemonic was <div class="request">requested</div> by the users <div class="request">${users.slice(0, -1).join(', ')+' and '+users.slice(-1)}</div>. <br>Help them by being the first to submit one! `;
    return msg;
}

function setScore(mnemType, score)
{
    let scoreEle = getEleByIdWait("cm-" + mnemType + "-score-num");
    if (scoreEle)
    {
        if (score)
            scoreEle.innerText = score;
        else
            scoreEle.innerText = "0";
    }
}

/**
 * function that is doing the updating of the iframe contents.
 * Getting called in updateCM from data promise to reduce clutter in nested .then()
 * @param mnemType reading or meaning
 * @param type kanji, vocabulary or radical
 * @param mnemJson json containing data from the DB: {Type: 'k', Item: '活', Meaning_Mnem: '', Reading_Mnem: '!', Meaning_Score: '', …}
 * @param index Index of mnemonic and user in case of multiple. 
 * */
function updateCMelements(mnemType, type, mnemJson, index=0)
{
    // if mnemJson is undefined or null, no mnemonic exists for this item/type combo. 
    //reset score
    setScore(mnemType, 0);
    
    // TODO: handle no mnemonic available. Special Message
    let iframe = getEleByIdWait("cm-iframe-" + mnemType);
    // TODO: generate proper mnemonic content with user link and everything. Replace markup.
    if (iframe != null)
    {
        if (mnemJson != null)
        {
            // TODO: NEXT handle multiple mnems
            let mnemSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Mnem";
            let userSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_User";
            let scoreSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Score";
            let len = mnemJson[userSelector].length;

            if (len > 1)
                console.log("ALERT MORE THAN ONE MNEM ============================");
            
            // if it is "!" without array, Mnemonic is requested, multiple users possible
            if (mnemJson[mnemSelector] == "!")
                iframe.srcdoc = getIframeSrcdoc(getMnemRequestedMsg(mnemJson[userSelector]));
            else if (mnemJson[mnemSelector][0] === "" || mnemJson[mnemSelector] === "")
                iframe.srcdoc = getIframeSrcdoc(getNoMnemMsg());
            // default case. Mnem available
            else
            {
                iframe.srcdoc = getIframeSrcdoc(mnemJson[mnemSelector][index], mnemJson[userSelector][index]);
                setScore(mnemType, mnemJson[scoreSelector][index]);
            }
        }
        else
        {
            iframe.srcdoc = getIframeSrcdoc(getNoMnemMsg());
        }
    }
}

// Update Mnemnic content displayed ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Sheet access ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
/**
 * Fetch data from Sheet. Returned as json. 
 * @param item required. kanji or vocabluary string
 * @param type k, v, r or empty string to fetch all for that item
 * */
async function fetchData(item, type)
{
    let shortType = getShortItemType(type);
    let url = sheetAppsScriptURL + `?item=${item}&type=${shortType}&exec=get`;
    // console.log(url);
    // url = "https://script.google.com/macros/s/AKfycbw-A6MH6YB80nzK3xfKEegBcddSCx9-gpzH--024sv0XboDLqI7qdbh6dqD5sqKKoYW_A/exec?item=血&type=v&exec=get";
    let data = null;
    // TODO: handle case of malformed URL
    // let response = await fetch(url);
    // data = await response.json();
    /*
    data = fetch(url)
        .then(res => res.json())
        .then(out => {return out[0];/*data = out*/    /*    });

    // data = data[0];
    console.log("fetchData: ", data);


    if (data == null || Object.keys(data).length === 0)
    {
        console.log("WKCM2: Warning fetchData got empty data from Data Spreadsheet");
        return null;
    }

    return data;
                                                      */

    return fetch(url)
        .then((response)=>response.json())
        .then((responseJson)=>
            {
                if (responseJson[0] == null)
                    return null;
                else
                    return responseJson[0]
            }
        );

    // return;

}

// Sheet access ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


// Data caching ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
function getCacheId(item, type)
{
    type = getShortItemType(type);
    return "wkcm2-" + type + item;
}
// Data caching ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Local data management ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
/**
 * Abstraction layer from direct data fetch, to make use of caches to make the script more responsive. 
 * */
function getData(item, type)
{
    let identifier = getCacheId(item, type);

    // TODO: implement cache and error handling
    // get from wkof cache
    // const data = fetchData(item, type).then(value => {
    let data = wkof.file_cache.load(identifier).then(value  =>
        {
            // cache hit
            // return from cache
            // console.log("getData: fullfilled:", value);
            console.log("Cache hit: ", value);
            return value;
        }, reason =>
        {
            // cache miss
            // fetch data from db, put cache and return
            console.log("Cache miss: ", reason);
            fetchData(item, type).then(responseJson =>
                {
                    // fetch worked
                    wkof.file_cache.save(identifier, responseJson).then(updateCM());
                    return responseJson;
                }, reason =>
                {
                    // fetch failed
                    // TODO: handle failed fetch
                    console.log("WKCM2: Fetch of data from spreadsheet failed: " + reason);
                });

        }
    );
    
    // console.log("getData 2: ", data);
    // TODO: NEXT put data in cache. Then after promise fulfilled rerun and use from cache
    
    // let data = fetchData(item, type).then(result => {
    //     return result;
    // });

    // const printData = async () => {
    //     const a = await data;
    //     console.log("printData", a);
    // };

    // printData();
    return data;
}

function getMnemonic(item, type)
{
    // item = "血";
    // type = "v";
    return getData(item, type).then(splitData);

    /*
    if (dataPromise == null)
        return null;
    // TODO: make cache go brrrrrrr
    return dataPromise.then(json =>
        {
            splitData(json);
        }
    );*/

    // return splitData(data);
    
}

/**
 * Takes data as json. Splits single user and mnemonic strings at Group Separator into array.
 * JSON now contains array instead, even if only one user/mnem contained.
 * If Mnemonic is requested ONLY contains "!" string NO array.
 * */
function splitData(data)
{
    // if undefined or null, no mnemonic exist
    if (data == null || typeof data === 'undefined' || Object.keys(data).length === 0)
    {
        return null;
    }

    // TODO: currently only for single mnems. Apply to whole data
    if (data["Meaning_Mnem"] !== "!" && typeof data["Meaning_Mnem"] === "string")
        data["Meaning_Mnem"] = data["Meaning_Mnem"].replaceAll("␝", "").split("\x1D");
    if (data["Reading_Mnem"] !== "!" && typeof data["Reading_Mnem"] === "string")
        data["Reading_Mnem"] = data["Reading_Mnem"].replaceAll("␝", "").split("\x1D");

    // if (typeof data["Reading_Score"] == "number")
    //     data["Reading_Score"] = data["Reading_Score"].toString()
    data["Reading_Score"] = data["Reading_Score"].toString().replaceAll("␝", "").split("\x1D");
    // if (typeof data["Meaning_Score"] == "number")
    //     data["Meaning_Score"] = data["Meaning_Score"].toString()
    data["Meaning_Score"] = data["Meaning_Score"].toString().replaceAll("␝", "").split("\x1D");
    
    data["Meaning_User"] = data["Meaning_User"].replaceAll("␝", "").split("\x1D");
    data["Reading_User"] = data["Reading_User"].replaceAll("␝", "").split("\x1D");

    return data;
}
// Local data management ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
