// @ts-nocheck
// ==UserScript==
// @name        WKCM2
// @namespace   wkcm2
// @description This script allows WaniKani members to contribute their own mnemonics which appear on any page that includes item info.
// @exclude     *.wanikani.com
// @include     *.wanikani.com/level/*
// @include     *.wanikani.com/kanji*
// @include     *.wanikani.com/vocabulary*
// @include     *.wanikani.com/radicals*
// @include     *.wanikani.com/review/session
// @include     *.wanikani.com/lesson/session
// @downloadURL https://raw.githubusercontent.com/Dakes/WaniKaniCommunityMnemonics2/main/WKCM2.user.js
// @version     0.1.1
// @author      Daniel Ostertag (Dakes)
// @grant       none
// ==/UserScript==

// CREDIT: This is a reimplementation of the userscript "WK Community Mnemonics" by forum user Samuel-H.
// Original Forum post: https://community.wanikani.com/t/userscript-community-mnemonics-v0978/7367
// The original stopped working some time ago and was plagued by bugs even longer.
// Due to security concerns involving XSS attacks, due to the nature of displaying user generated content,
// I decided to recode everything from scratch.
// The code is entirely my own, except for a few individual lines of code, that I will replace soon
// and HTML and CSS, that I carried over from the old version. 

/* This script is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license
*  Details: http://creativecommons.org/licenses/by-nc/4.0/ */


const WKCM2_version = "0.1.1";
const scriptName = 'WKCM2';
const scriptNameLong = 'WaniKani Community Mnemonics 2';

// Maximum number, how many mnemonics one user can submit for one item. 
const mnemMaxCount = 5;

// whether to use console logs
const devel = true;

// if current page is Review page
const isReview = (window.location.pathname.indexOf("/review/") > -1);
// if current page is Lesson page
const isLesson = (window.location.pathname.indexOf("/lesson/") > -1);

// Only true in list of items
let CMIsList = false;
if (!isReview && !isLesson)
{
    CMIsList = (
        // TODO: generalize regex, only matches 2 digit levels (in case they add more levels ... much more)
        // true if on a level page
        new RegExp("level\/[0-9]{1,2}$", "i").test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2)) ||
        // true if on a /kanji?difficulty=pleasant site
        new RegExp("[kanji|vocabulary|radicals].[difficulty=[A-Z]$|$]", "i").test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2))
    );
}

// TODO: true on individual item pages
let CMIsItem = false;

let WKUser;

// Google sheet: https://docs.google.com/spreadsheets/d/13oZkp8eS059nxsYc6fOJNC3PjXVnFvUC8ntRt8fdoCs/edit?usp=sharing
// google sheets apps script url, for sheet access
let sheetAppsScriptURL = "https://script.google.com/macros/s/AKfycbwxkCj1TIt4Nll8POcjx8qOwJTse2SUyNox5K4KfV_WmNXcIUAbZKzzLwLCuJDaVyXc-g/exec";

// colors TODO: remove from globals.
let CMColorReq = "#ff5500";
let CMColorMnemAvail = "#71aa00";
let requestColor = "#e1aa00";

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
.cm-prev, .cm-next, .cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight, .cm-form-submit, .cm-form-cancel, .cm-small-button { cursor: pointer !important }
.cm-prev, .cm-next { font-size: 50px; margin: 0px 0px 0px 0px; padding: 15px 10px 0px 0px;}
.cm-prev{float:left}
.cm-next{float:right}

.cm-prev.disabled, .cm-next.disabled { opacity: 0.25 }
.cm-prev span, .cm-next span
{
    background: -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(85, 85, 85)), to(rgb(70, 70, 70))); -webkit-background-clip: text;
}

.cm-upvote-highlight, .cm-downvote-highlight, .cm-delete-highlight, .cm-edit-highlight, .cm-submit-highlight, .cm-req-highlight, .cm-form-submit, .cm-form-cancel, .cm-small-button
{
    text-align: center; font-size: 14px; width: 75px; margin-right: 10px; float: left; background-repeat: repeat-x; cursor: help; padding: 1px 4px; color: #fff;
    text-shadow: 0 1px 0 rgba(0,0,0,0.2); white-space: nowrap; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px;
    -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; -moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset; box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset
}
.cm-upvote-highlight { background-image: linear-gradient(to bottom, #5c5, #46ad46) }

.cm-downvote-highlight { background-image: linear-gradient(to bottom, #c55, #ad4646) }

.cm-delete-highlight, .cm-edit-highlight, .cm-small-button { font-size: 12px; width: 50px; height: 12px; line-height: 1 }
.cm-delete-highlight { background-image: linear-gradient(to bottom, #811, #6d0606); margin-right: 10px }
.cm-edit-highlight { background-image: linear-gradient(to bottom, #ccc, #adadad) }
.cm-request-highlight { background-image: linear-gradient(to bottom, ${requestColor}, #d57602) }
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

// TODO: reset cache after new version (save current version to cache)

if (isReview || isLesson)
{
    if (document.readyState != "complete")
    {
        window.addEventListener('load', function()
        {
            // character div is needed for lesson & review page
            preInit();
        }, false);
    }
    else
    {
        preInit();
    }

}else // (CMIsReview || CMIsLesson)
{
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function() { preInit(); });
    else
        preInit();
}

// General and init helper functions ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

function checkWKOF()
{
    var wkof_version_needed = '1.0.53';
    if (!window.wkof)
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?'))
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return false;
    }
    else if (wkof.version.compare_to(wkof_version_needed) === 'older')
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework version '+wkof_version_needed+'.\nDo you want to be forwarded to the update page?'))
            window.location.href = 'https://greasyfork.org/en/scripts/38582-wanikani-open-framework';
        return false;
    }
    else
        return true;
}

function waitForWKOF()
{
    // https://codepen.io/eanbowman/pen/jxqKjJ
    let timeout = 2000;
    let start = Date.now();
    return new Promise(waitForFoo); // set the promise object within the ensureFooIsSet object

    // waitForFoo makes the decision whether the condition is met
    // or not met or the timeout has been exceeded which means
    // this promise will be rejected
    function waitForFoo(resolve, reject)
    {
        if (window.wkof)
            return resolve(window.wkof);
        else if (timeout && (Date.now() - start) >= timeout)
            return reject("timeout while waiting for wkof to become available");
        else
            setTimeout(waitForFoo.bind(this, resolve, reject), 50);
    }
}

/**
 * checks, if script version saved is the same. If it is not, deletes cache. 
 * */
function resetWKOFcache()
{
    wkof.file_cache.load("wkcm2-version").then(value  =>
    {
        // found

        if (WKCM2_version != value)
        {
            printDev("WKCM2: New version detected. Deleting wkcm2 cache.");
            // regex delete of all wkcm2 saves
            wkof.file_cache.delete(/^wkcm2-/);
            wkof.file_cache.save("wkcm2-version", WKCM2_version);
        }
        return value;
    }, reason =>
    {
        // version not saved, save current version
        wkof.file_cache.save("wkcm2-version", WKCM2_version);
    }
    );
}

function waitForEle(id)
{
    return new Promise(resolve =>
    {
        if (document.getElementById(id))
            return resolve(document.getElementById(id));

        const observer = new MutationObserver(mutations =>
        {
            if (document.getElementById(id))
            {
                resolve(document.getElementById(id));
                observer.disconnect();
            }
        });

        observer.observe(document.body,
        {
            childList: true,
            subtree: true
        });
    });
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

/**
 * calls console.log only when global devel variable is true
 * */
function printDev(...params)
{
    if (devel)
        console.log(...params);
}

// General and init helper functions ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Get infos from page ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

function setUsername()
{
    try
    {
        if (window.wkof)
        {
            try
            {
                WKUser = wkof.Apiv2.user;
                return WKUser;
            }
            catch (err)
            {
                console.log("WKCM2: setUsername, ", err);
                WKUser = wkof.user["username"];
                return WKUser;
            }
        }
    }
    catch (err)
    {
        console.log("WKCM2: setUsername, wkof.user  ", err);
    }

    // backup method
    let CMUserClass = "user-summary__username";

    if(isReview || isLesson)
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

    let itemIdentifier = "currentItem";
    if (isReview)
        itemIdentifier = "currentItem";
    else if (isLesson)
        itemIdentifier = "l/currentLesson";

    // $.jStorage.get("l/currentLesson")["characters"]
    // TODO: add max recursion depth???

    item = $.jStorage.get(itemIdentifier)["characters"];
    if (item == null)
        console.log("WKCM2: getItem, item is null");

    return item;
}

/**
 * Returns radical, kanji or vocabulary
 * */
function getItemType()
{
    let itemType = null;
    let itemIdentifier = "currentItem";
    if (isReview)
        itemIdentifier = "currentItem";
    else if (isLesson)
        itemIdentifier = "l/currentLesson";

    itemType = $.jStorage.get(itemIdentifier)["type"];
    if (typeof itemType === "string")
        itemType = itemType.toLowerCase()
    if (itemType == null)
        console.log("WKCM2: getItemType, itemType null");
    return itemType;
}
// Get infos from page ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Init ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * Runs checks if elements exist before running init and waits for them. Then calls init.
 * */
function preInit()
{
    waitForEle('character').then(waitForWKOF).catch(err =>
    {
        if(checkWKOF())
        {
            wkof.include('Apiv2');
            wkof.ready('Apiv2').then(init);
        }
        else
            console.log("WKCM2: there was a problem with checking for wkof. Please check if it is installed correctly and running. ");
    }).then(resp =>
    {
        checkWKOF();
        wkof.include('Apiv2');
        wkof.ready('Apiv2').then(init);
    });
}
/**
 * Runs the right code depending if the current page is Lesson, Review or List
 * */
function init()
{
    resetWKOFcache();
    setUsername();
    if (WKUser == null || typeof WKUser != "string" || WKUser == "")
        throw new Error("WKCM2 Error: WKUser not set: " + WKUser);
    
    addGlobalStyle(CMcss);
    addGlobalStyle(CMcontentCSS);
    addGlobalStyle(textareaCSS);
    addGlobalStyle(cmuserbuttonsCSS);

    if (isReview)
    {
        // initCMReview();
        addHTMLinID('item-info', CMouterHTML);

        document.getElementById("cm-meaning").innerHTML = getCMdivContent("m");
        document.getElementById("cm-reading").innerHTML = getCMdivContent("r");

        initButtons("meaning");
        initButtons("reading");
        
        let characterDiv = document.getElementById("character").firstElementChild;
        if (characterDiv != null)
            characterDiv.addEventListener('DOMSubtreeModified', function(){updateCM()});
        else
            console.log("WKCM: init, character div NOT FOUND");


    } else if (isLesson)
    {
        let type = getItemType();
        let item = getItem();

        if (item == null)
        {
            
        }

        // initCMLesson();
        addHTMLinID('supplement-info', CMouterHTML);

        document.getElementById("cm-meaning").innerHTML = getCMdivContent("m");
        // document.getElementById("cm-iframe-meaning").outerHTML = getCMForm("meaning");
        document.getElementById("cm-reading").innerHTML = getCMdivContent("r");
        // document.getElementById("cm-iframe-reading").outerHTML = getCMForm("reading");
        
        initButtons("meaning");
        initButtons("reading");

        let characterDiv = document.getElementById("character");
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

}
// Init ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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

    addClickEvent(`cm-${mnemType}-edit`,    editCM,     [mnemType]);
    addClickEvent(`cm-${mnemType}-delete`,  deleteCM,   [mnemType]);
    addClickEvent(`cm-${mnemType}-request`, requestCM,  [mnemType]);
    addClickEvent(`cm-${mnemType}-submit`,  submitCM,   [mnemType]);
    addClickEvent(`cm-${mnemType}-prev`,    prevCM,     [mnemType]);
    addClickEvent(`cm-${mnemType}-next`,    nextCM,     [mnemType]);
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
    let fullMnemType = ""
    if (mnemType == "m" || mnemType == "meaning")
        fullMnemType = "meaning";
    else if (mnemType == "r" || mnemType == "reading")
        fullMnemType = "reading";
    else
        throw new TypeError("mnemType in getFullMnemType is not valid. Value: " + mnemType);
    return fullMnemType;
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
    let fullMnemType = getFullMnemType(mnemType);

    let iframeId = "cm-iframe-" + fullMnemType;
    let iframeClass = "cm-mnem-text";
    let initialSrcdoc = getIframeSrcdoc("Loading Community Mnemonic ...");
    let userContentIframe = `<iframe sandbox referrerpolicy='no-referrer' scrolling='no' frameBorder='0' class='${iframeClass}' id='${iframeId}' srcdoc="${initialSrcdoc}"></iframe>`;
    return userContentIframe;
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
    let userContentIframe = getInitialIframe(mnemType);

    let typeHeader = "<h2>" + mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + " Mnemonic</h2>"
    let content =
        typeHeader +
        `<div id="cm-${mnemType}-prev" class="cm-prev disabled"><span>◄</span></div>
        ${userContentIframe}
        <div id="cm-${mnemType}-next" class="cm-next disabled"><span>►</span></div>
        <div id="cm-${mnemType}-info" class="cm-info">
        <div class="cm-score">Score: <span id="cm-${mnemType}-score-num" class="cm-score-num">0</span></div>
        <div id="cm-${mnemType}-upvote" class="cm-upvote-highlight disabled">Upvote ▲</div>
        <div id="cm-${mnemType}-downvote" class="cm-downvote-highlight disabled">Downvote ▼</div>
        <div id="cm-${mnemType}-user-buttons" class="cm-user-buttons">
        <div id="cm-${mnemType}-edit" class="cm-edit-highlight cm-small-button disabled" >Edit</div>
        <div id="cm-${mnemType}-delete" class="cm-delete-highlight cm-small-button disabled">Delete</div>
        <div id="cm-${mnemType}-request" class="cm-request-highlight cm-small-button disabled">Request</div>
        </div><br>
        <div id="cm-${mnemType}-submit" class="cm-submit-highlight">Submit Yours</div></div>`;

    return content;
}

function addClass(id, className="disabled")
{
    let ele = document.getElementById(id);
    if(ele == null)
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

function disableButtons(mnemType)
{
    addClass(`cm-${mnemType}-edit`);
    addClass(`cm-${mnemType}-delete`);
    addClass(`cm-${mnemType}-request`);
    addClass(`cm-${mnemType}-upvote`);
    addClass(`cm-${mnemType}-downvote`);
    addClass(`cm-${mnemType}-submit`);
    addClass(`cm-${mnemType}-prev`);
    addClass(`cm-${mnemType}-next`);
}

function editCM(mnemType)
{
    // TODO: check if CM by user

    let iframe = document.getElementById("cm-iframe-" + mnemType);
    if (!iframe)
        return;

    iframe.outerHTML = getCMForm(mnemType);

    // addClass("cm-" + mnemType + "-edit");
    // addClass("cm-" + mnemType + "-delete");
    addClass("cm-" + mnemType + "-upvote");
    addClass("cm-" + mnemType + "-downvote");
    addClass("cm-" + mnemType + "-submit");
    
    initEditButtons(mnemType);

}

function deleteCM(mnemType)
{

}

function requestCM(mnemType)
{
    
}

function submitCM(mnemType)
{
    // "Submit Yours" Button

    let iframe = document.getElementById("cm-iframe-" + mnemType);
    if (!iframe)
        return;

    iframe.outerHTML = getCMForm(mnemType);
    addClass(`cm-${mnemType}-edit`);
    addClass(`cm-${mnemType}-delete`);
    addClass(`cm-${mnemType}-upvote`);
    addClass(`cm-${mnemType}-downvote`);
    addClass(`cm-${mnemType}-submit`);

    initEditButtons(mnemType);
    disableButtons(mnemType);

}

function prevCM(mnemType)
{
    let btn = document.getElementById(`cm-${mnemType}-prev`);
    let idx = Number(btn.dataset.currentIndex);
    updateCM(false, mnemType, idx-1);
}

function nextCM(mnemType)
{
    let btn = document.getElementById(`cm-${mnemType}-prev`);
    let idx = Number(btn.dataset.currentIndex);
    updateCM(false, mnemType, idx+1);
}

function editSaveCM(mnemType)
{
    // TODO: check if CM by user

    let editForm = document.getElementById("cm-" + mnemType + "-form");
    if (!editForm)
        return;

    // TODO: submit text to DB
    editForm.outerHTML = getInitialIframe(mnemType);
    disableButtons(mnemType);
    initEditButtons(mnemType);
}

function editCancelCM(mnemType)
{
    // TODO: check if CM by user

    let editForm = document.getElementById("cm-" + mnemType + "-form");
    if (!editForm)
        return;
    editForm.outerHTML = getInitialIframe(mnemType);


    updateCM();
    
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
/**
 * @param mnemJson needed to bypass recursive getMnemonic call, once data got loaded. False because can be null, when no mnem available.
 * @param mnemType array by default to make calling the function more convenient. Will be executed for both values in array.
 * @param index index of Mnem to use
 * */
function updateCM(mnemJson=false, mnemType=["meaning", "reading"], index=0)
{
    // console.log("updateCM: ", mnemJson, mnemType);
    // sick recursive execution, to only require one fetch of data for each item. 

    // display loading message
    if (typeof mnemType == "object")
        for (let ele of mnemType)
            updateIframe(ele, "Loading Community Mnemonic ...")

    let type = getItemType();

    if (mnemJson !== false)
    {
        if (typeof mnemType === "string")
            mnemType = [mnemType];
        for (let ele of mnemType)
            updateCMelements(ele, type, mnemJson, index);
    }
    else
    {
        let item = getItem();
        getMnemonic(item, type).then((mnemJson) =>
            {
                if (typeof mnemJson == "undefined" || mnemJson == null)
                    updateCM(null, mnemType, index);
                    // setTimeout(function(){ updateCM(false, mnemType, index) }, 100);
                else
                    updateCM(mnemJson, mnemType, index);
            });
    }

    // TODO: NEXT trigger background update of item. Check if content is the same as previous before iframe update.
    // TODO: use date in cache in order to only fetch update if cached entry is older then idk what. 1d, 2d?
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

function replaceMarkup(text)
{
    let list = ["b", "i", "u", "s", "br"];
    for (const ele of list)
    {
        text = text.replaceAll("["+ ele +"]", "<"+ ele +">");
        text = text.replaceAll("[/"+ ele +"]", "</"+ ele +">");
    }
    
    text = text.replaceAll("[/span]", `</span>`);
    text = text.replaceAll("[kan]", `<span class="highlight-kanji">`);
    text = text.replaceAll("[/kan]", `</span>`);
    text = text.replaceAll("[voc]", `<span class="highlight-vocabulary">`);
    text = text.replaceAll("[/voc]", `</span>`);
    text = text.replaceAll("[rad]", `<span class="highlight-radical">`);
    text = text.replaceAll("[/rad]", `</span>`);
    text = text.replaceAll("[read]", `<span class="highlight-reading">`);
    text = text.replaceAll("[/read]", `</span>`);
    text = text.replaceAll("[request]", `<span class="request">`);
    text = text.replaceAll("[/request]", `</span>`);
    
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
    // TODO: regenerating everything makes display slower, due to CSS loading. Maybe modify srcdoc body instead?
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
    cssString = cssString.replaceAll('"', "'");
    

    // replace " by ' / \"
    // text = text.replaceAll('"', "'");
    text = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
               .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    text = replaceMarkup(text);

   // text = escape(text);
    
    let userMsg = "";
    // user can be null, if it is a system message
    if (user != null && typeof user === "string" && user != "")
    {
        user = user.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
                   .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        userMsg = "by " + getUserProfileLink(user);
    }


    let srcdoc = `<html><head>${cssString}</head><body><div class='col2'>${text}</div><div id='user-link'>${userMsg}</div></body></html>`;
    // srcdoc = escape(srcdoc);
    return srcdoc;
}
// getIframeSrcdoc ▲

function getNoMnemMsg()
{
    let msg = `No Community Mnemonic for this item exists yet. [br]Be the first to submit one.`;
    return msg;
}

function getMnemRequestedMsg(users)
{
    // TODO: make request color darker red, the more users requested
    let len = users.length;
    let msg = `A Mnemonic was [request]requested[/request] for this item. [br][request]Help the community by being the first to submit one![/request]`;
    if (len === 1)
        msg = `A Mnemonic was [request]requested[/request] by user [request]${users[0]}[/request]. [br]Help them by being the first to submit one! `;
    else if (len > 1)
        msg = `A Mnemonic was [request]requested[/request] by the users [request]${users.slice(0, -1).join(', ')+' and '+users.slice(-1)}[/request]. [br]Help them by being the first to submit one! `;
    return msg;
}

function setScore(mnemType, score)
{
    let scoreEle = document.getElementById(`cm-${mnemType}-score-num`);
    if (scoreEle != null)
    {
        if (Number(score) != 0)
            scoreEle.innerText = Number(score);
        else
            scoreEle.innerText = "0";
    }
}

/**
 * Disables or enables the arrows for prev and next mnem. Depending on amount of mnems available and active one.
 * */
function toggleArrows(mnemType, length, index)
{
    let left = `cm-${mnemType}-prev`;
    let right = `cm-${mnemType}-next`;
    // make array length match index, now both start at 0
    addClass(left);
    addClass(right);

    if (length > 0 && length != null)
        length = length - 1;
    else
        return;

    if (length > index)
        removeClass(right);
    if (length > 0 && index > 0)
        removeClass(left);
}

/**
 * Enable/Disable all buttons that depend on the Mnemonic being by the user, or not.
 * @param owner boolean. Owner of mnem: True, else False
 * */
function toggleUserButtons(mnemType, owner)
{
    if (owner == true)
    {
        removeClass(`cm-${mnemType}-edit`);
        removeClass(`cm-${mnemType}-delete`);
        addClass(`cm-${mnemType}-request`);
        addClass(`cm-${mnemType}-upvote`);
        addClass(`cm-${mnemType}-downvote`);
        addClass(`cm-${mnemType}-submit`);
    }
    else if (owner == false)
    {
        addClass(`cm-${mnemType}-edit`);
        addClass(`cm-${mnemType}-delete`);
        addClass(`cm-${mnemType}-request`);
        removeClass(`cm-${mnemType}-upvote`);
        removeClass(`cm-${mnemType}-downvote`);
    }
}

/**
 * wraps iframe update, to not update content, if it is the same as the currently displayed.
 * This reduces these annoying flashes, where the whole iframe content disappears for a moment.
 * @param text NOT the whole content, just the message, that will be visible.
 * */
function updateIframe(mnemType, text, user=null)
{
    let iframe = document.getElementById(`cm-iframe-${mnemType}`);
    if (iframe == null)
        return;

    let newIframeHtml = getIframeSrcdoc(text, user);
    let newIframeContent = /<body.*?>([\s\S]*)<\/body>/.exec(newIframeHtml)[1];
    console.log(iframe.srcdoc);
    let oldIframeContent = /<body.*?>([\s\S]*)<\/body>/.exec(iframe.srcdoc)[1];
    console.log(newIframeContent);
    console.log(oldIframeContent);
    if (newIframeContent == oldIframeContent)
        return;
    iframe.srcdoc = newIframeHtml;
}

/**
 * function that is doing the updating of the iframe contents.
 * Getting called in updateCM from data promise to reduce clutter in nested .then()
 * @param mnemType reading or meaning
 * @param type kanji, vocabulary or radical
 * @param dataJson json containing data from the DB:
 * {Type: 'k', Item: '活', Meaning_Mnem: {...}, Reading_Mnem: '!', Meaning_Score: {...}, ...}
 * @param index Index of mnemonic and user in case of multiple. 
 * */
function updateCMelements(mnemType, type, dataJson, index=0)
{
    // write index of mnem into prev button html, for lack of a better solution. For switching mnems.
    let leftBtn = document.getElementById(`cm-${mnemType}-prev`);
    // initialize and/or reset index
    leftBtn.dataset.currentIndex = index;

    // if mnemJson is undefined or null, no mnemonic exists for this item/type combo. 
    //reset score display
    setScore(mnemType, 0);

    // TODO: NEXT activate/deactivate buttons
    disableButtons(mnemType);
    removeClass(`cm-${mnemType}-submit`);

    if (dataJson != null)
    {
        let mnemSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Mnem";
        let scoreSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Score";
        let scoreJson = jsonParse(dataJson[scoreSelector]);
        let mnemJson = jsonParse(dataJson[mnemSelector]);

        toggleArrows(mnemType, getMnemCount(mnemJson), index);

        // no mnem available for current item
        if (mnemJson == null)
        {
            updateIframe(mnemType, getNoMnemMsg());
            removeClass(`cm-${mnemType}-request`);
        }
        // request JSON: {"!": ["Anonymous", "Dakes"]}
        else if (Object.keys(mnemJson)[0] == "!")
        {
            updateIframe(mnemType, getMnemRequestedMsg(mnemJson["!"]));
            removeClass(`cm-${mnemType}-request`);
        }
        // default case. Mnem available
        else
        {
            let mnemCount = getMnemCount(mnemJson);
            updateIframe(mnemType, ...getNthDataUser(mnemJson, index));  // (mnem, user)
            let score = getNthScore(scoreJson, index);
            setScore(mnemType, score);
            toggleUserButtons(mnemType, getNthDataUser(mnemJson, index)[1] == WKUser);
            // disable submit button if user submitted too many mnems
            if (getUserMnemCount(mnemJson, WKUser) > mnemMaxCount)
                addClass(`cm-${mnemType}-submit`);

        }
    }
    // no mnem available for both items
    else
    {
        updateIframe(mnemType, getNoMnemMsg());  // (mnem, user)
        removeClass(`cm-${mnemType}-request`);
    }
}
// updateCMelements ▲

// Update Mnemnic content displayed ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Sheet access ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
/**
 * Fetch data from Sheet. Returned as json. 
 * @param item required. kanji or vocabluary string
 * @param type k, v, r or empty string to fetch all for that item
 * */
async function fetchData(item, type)
{
    // TODO: sleep between failed fetches???
    let shortType = getShortItemType(type);
    let url = sheetAppsScriptURL + `?item=${item}&type=${shortType}&exec=get`;
    url = encodeURI(url);
    // TODO: handle case of malformed URL
    return fetch(url)
        .then(response => response.json()).catch(reason => {console.log("WKCM2: fetchData failed: "+reason); return null;}).then((responseJson)=>
            {
                if (responseJson == null)
                    return null;
                else
                    return responseJson;
            }
        );
}

// Sheet access ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Local data management ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

// Data caching ▼▼▼▼▼▼▼▼▼
// caching happens in getData using WaniKani Open Framework's wkof.file_cache
function getCacheId(item, type)
{
    type = getShortItemType(type);
    return "wkcm2-" + type + item;
}
// Data caching ▲▲▲▲▲▲▲▲▲

/**
 * Abstraction layer from direct data fetch, to make use of caches to make the script more responsive. 
 * */
function getData(item, type)
{
    // static miss counter, to protect from infinite cache miss loop (only triggered when an error with the apps script exists)
    if( typeof getData.misses == 'undefined' )
        getData.misses = 0;
    if (type == null || type == "")
        throw new Error("WKCM2: Error, getData got empty type");
    if (item == null || item == "")
        throw new Error("WKCM2: Error, getData got empty item");
    // TODO: NEXT redownload item after cache hit, after timeout
    let identifier = getCacheId(item, type);

    // TODO: implement cache and error handling
    // get from wkof cache
    // const data = fetchData(item, type).then(value => {
    let data = null;
    data = wkof.file_cache.load(identifier).then(value  =>
        {
            // cache hit
            // return from cache
            // console.log("getData: fullfilled:", value);
            printDev("Cache hit for", identifier, value);
            getData.misses = 0;

            // background update of cache, if date pulled is older than 2d
            const dayDiff = 2;
            cachedDate = Date.parse(wkof.file_cache.dir[identifier]["added"]);
            let pulledDiff = Math.floor((Date.now() - cachedDate) / 86400000);
            if (pulledDiff > dayDiff)
                dataBackgroundUpdate(item, type, value);
            else
                return value;

            return value;
        }, reason =>
        {
            // cache miss
            // fetch data from db, put in cache and return

            // protection against deadlock "just in case" 
            if (getData.misses > 1000)
            {
                console.log("WKCM2: There was a problem with fetching the Mnemonic Data. ");
                return null;
            }
            printDev("Cache miss for", reason);
            getData.misses++;

            fetchData(item, type).then(responseJson =>
                {
                    // fetch worked
                    wkof.file_cache.save(identifier, responseJson);
                    let reponseJsonCopy = JSON.parse(JSON.stringify(responseJson));
                    updateCM(mnemJson=reponseJsonCopy);
                    return responseJson;
                    
                }).catch(reason =>
                {
                    // fetch failed
                    // TODO: handle failed fetch
                    console.log("WKCM2: Error, getData, Fetch of data from spreadsheet failed: " + reason);
                    // create and return "Error" object, to signale failed fetch and display that.
                    return null;
                });
        }
    );
    return data;
}
// getData ▲

async function dataBackgroundUpdate(item, type, cachedData)
{
    console.log("dataBackgroundUpdate");
    var isEqualsJson = (obj1,obj2)=>
    {
        keys1 = Object.keys(obj1);
        keys2 = Object.keys(obj2);

        //return true when the two json has same length and all the properties has same value key by key
        return keys1.length === keys2.length && Object.keys(obj1).every(key=>obj1[key]==obj2[key]);
    }
    
    let identifier = getCacheId(item, type);
    fetchData(item, type).then(responseJson =>
    {
        // fetch worked
        // wkof.file_cache.save(identifier, responseJson);
        let reponseJsonCopy = JSON.parse(JSON.stringify(responseJson));
        
        // updateCM(reponseJsonCopy);

        if (!isEqualsJson(cachedData, responseJson))
        {
            wkof.file_cache.save(identifier, responseJson);
            updateCM(reponseJsonCopy);
        }
        
        return responseJson;
    }, reason =>
    {
        // fetch failed
        // TODO: handle failed fetch
        console.log("WKCM2: Error, dataBackgroundUpdate, Fetch of data from spreadsheet failed: " + reason);
    });
}
// dataBackgroundUpdate ▲

/**
 * @return promise containing json with Mnemonics for both Meaning and Reading for matching item and type
 * */
function getMnemonic(item, type)
{
    // item = "血";
    // type = "v";
    return getData(item, type);
}

/**
 * wraps JSON.parse
 * @return JSON, null if invalid
 * */
function jsonParse(jsonString)
{
    let newJson = null;
    if (jsonString != "" && typeof jsonString == "string")
    {
        try
        {
            newJson = JSON.parse(jsonString);
        }
        catch (err)
        {
            console.log("WKCM2: jsonParse, got invalid json string: " + jsonString);
        }
    }
    // I hate JavaScript so much right now. for consistency if empty json, convert to null
    if (newJson != null)
        if (typeof newJson == "object")
            if (Object.keys(newJson).length == 0)
                mnemJson = null;
    return newJson;
}

/**
 * @param mnemJson json of either Meaning or Reading mnemonic. NOT whole data json
 * @return total number of mnemonics
 * */
function getMnemCount(mnemJson)
{
    if (mnemJson == null)
        return 0;
    let mnemCount = 0;
    for (let user in mnemJson)
    {
        mnemCount = mnemCount + mnemJson[user].length;
    }
    return mnemCount;
}

/**
 * @param mnemJson json of either Meaning or Reading mnemonic. NOT whole data json
 * @param user user whose mnems to count
 * @return number of mnemonics user submitted
 * */
function getUserMnemCount(mnemJson, user)
{
    if (mnemJson == null)
        return 0;
    if (!mnemJson[user])
        return 0;
    return mnemJson[user].length;
}

/**
 * @param innerJson inner json of data. either Meaning or Reading mnemonic. Or Votes. NOT whole data json.
 * MUST be in the form: {"user": [1, 2, 3], "user2": [4, 5, 6]}
 * @param n number of mnem to get.
 * @return nth data point in json with user in Array [data, user]
 * */
function getNthDataUser(innerJson, n)
{
    if (innerJson == null)
        return null;
    count = 0;
    for (let user in innerJson)
    {
        for (let data of innerJson[user])
        {
            if (count == n)
                return [data, user];
            ++count;
        }
    }
    return null;
}

function getNthScore(scoreJson, n)
{
    try
    {
        let scoreUser = getNthDataUser(scoreJson, n);
        if (scoreUser == null)
            return 0;
        let score = scoreUser[0];
        score = (!score ? 0 : score);
        return score;
    }
    catch (err)
    {
        console.log("WKCM2: Error, getNthScore: ", err);
        return 0;
    }
}
// Local data management ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
