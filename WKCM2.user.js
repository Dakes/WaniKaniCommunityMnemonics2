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
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @version     0.2.2
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

const WKCM2_version = "0.2.2";
const scriptName = 'WKCM2';
const scriptNameLong = 'WaniKani Community Mnemonics 2';

// Maximum number, how many mnemonics one user can submit for one item. 
const mnemMaxCount = 5;

// whether to use console logs
const devel = false;

// if current page is Review page
const isReview = (window.location.pathname.indexOf("/review/") > -1);
// if current page is Lesson page
const isLesson = (window.location.pathname.indexOf("/lesson/") > -1);

// Only true in list of items
let isList = false;
if (!isReview && !isLesson)
{
    isList = (
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
let sheetApiUrl = "https://script.google.com/macros/s/AKfycbxCxmHz_5ibnHn0un5HxaCLeJTRHxwdrS5fW4nmXBYXyA-Jw6aDPPrrHWrieir3B8kDFQ/exec";

// colors TODO: remove from globals.
let colorRequestDark = "#ff5500";
let colorRequest = "#e1aa00";
let colorRequestShadow = "#d57602";
let colorMnemAvail = "#71aa00";

// HTML
let mnemOuterHTML = /* html */`<div id="wkcm" class="cm">
<br><br> <h2 class="cm-header">Community Mnemonics</h2>
<div id="cm-meaning" class="cm-content"> </div>
<div id="cm-reading" class="cm-content"> </div>
</div>`;

// CSS
let generalCSS = /* css */`
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

let listCss = /* css */`
.commnem-badge, .commnem-badge-req { position: absolute; left: 0 }
.commnem-badge:before, .commnem-badge-req:before {
content: "\\5171\"; display: block; position: absolute; top: -0.6em; left: -0.6em; width: 2em; height: 2em; color: #fff; font-size: 16px; font-weight: normal;
line-height: 2.2em; -webkit-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-moz-box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5); box-shadow: 0 -2px 0 rgba(0,0,0,0.2) inset,0 0 10px rgba(255,255,255,0.5);
-webkit-border-radius: 50%; -moz-border-radius: 50%; border-radius: 50%; z-index: 999 }
ul.multi-character-grid .commnem-badge:before, ul.multi-character-grid .commnem-badge-req:before { top: 1.1em; left: -1.1em; font-size: 11px; text-align: center }
.commnem-badge:before { background-color: #71aa00; text-shadow: 0 2px 0 #1a5300; }
.commnem-badge-req:before { background-color: #e1aa00; text-shadow: 0 2px 0 ${colorRequest} }`;

// TODO: on click "invert" gradient, to give sick clicky feel
let textareaCSS = /* css */`
.cm-format-btn
{
    filter: contrast(0.8) !important;
    text-align: center;
    width: 35px !important; height: 30px !important;
    font-size: 20px !important;
    line-height: 30px !important;
    color: white;
    border-radius: 3px;
    margin-left: 5px;
    padding-left: 0px !important;
    padding-right: 0px !important;

    line-height: 1; float: left;

    cursor: pointer;
}

.cm-format-btn:hover
{
    filter: contrast(1.15) !important;
}

.cm-format-btn.kanji:active, .cm-format-btn.radical:active, .cm-format-btn.vocabulary:active, .cm-format-btn.reading:active
{
    filter: contrast(1.2) !important;
    box-shadow: 0 3px 0 rgb(0 0 0 / 20%) inset !important;
}

.cm-format-btn.kanji, .cm-format-btn.radical, .cm-format-btn.vocabulary, .cm-format-btn.reading
{
    font-weight: bold;
    display: inline-block;
    color: #fff;
    text-align: center;
    text-shadow: 0 1px 0 rgb(0 0 0 / 30%);
    box-sizing: border-box;
    border-radius: 3px;
    box-shadow: 0 -3px 0 rgb(0 0 0 / 20%) inset !important;
    transition: text-shadow 0.15s linear !important;
}
.cm-format-btn.radical{background-color: #0af;}
.cm-format-btn.kanji{background-color: #f0a;}
.cm-format-btn.vocabulary{background-color: #a0f;}

.cm-format-btn.cm-format-bold, .cm-format-btn.cm-format-italic, .cm-format-btn.cm-format-underline, .cm-format-btn.cm-format-newline, .cm-format-btn.cm-format-strike
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

let contentCSS = /* css */`
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
.cm-request-highlight { background-image: linear-gradient(to bottom, ${colorRequest}, ${colorRequestShadow}) }
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

.cm-format-bold, .cm-format-underline, .cm-format-strike, .cm-format-newline { padding-left: 10px; padding-right: 10px }

.cm-delete-text { position: absolute; opacity: 0; text-align: center }
.cm-delete-text h3 { margin: 0 }
`;

// all code runs from here
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

} else if (isList)
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
function resetWKOFcache(versionCheck=true)
{
    if (versionCheck === false)
    {
        wkof.file_cache.delete(/^wkcm2-/);
        wkof.file_cache.save("wkcm2-version", WKCM2_version);
        return;
    }
    
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
    let head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head)
        return;
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
    const userClass = "user-summary__username";

    if(isReview || isLesson)
        WKUser = window.WaniKani.username;
    else
        try
        {
            WKUser = document.getElementsByClassName(userClass)[0].innerHTML;
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

function getItem(short=false)
{
    // TODO: add support for list page
    let item = null;

    let itemIdentifier = "currentItem";
    if (isReview)
        itemIdentifier = "currentItem";
    else if (isLesson)
        itemIdentifier = "l/currentLesson";

    item = $.jStorage.get(itemIdentifier)["characters"];
    if (item == null)
        console.log("WKCM2: getItem, item is null");

    return item;
}

/**
 * Returns radical, kanji or vocabulary
 * @param short with short=true r, k or v
 * */
function getItemType(short=false)
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
    if (short)
        return getShortItemType(itemType);
    else
        return itemType;
}
// Get infos from page ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Init ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * Runs checks if elements exist before running init and waits for them. Then calls init.
 * */
function preInit()
{
    let elePromise = null;
    // character div only needed in Lesson & Review. For list use dummy Promise. 
    if (isList)
        elePromise = Promise.resolve(true);
    else
        elePromise = waitForEle('character');
        
    elePromise.then(waitForWKOF).catch(err =>
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
    // resets cache on new version of WKCM2
    resetWKOFcache();
    // refills whole cache, if not already filled or old.
    checkFillCacheAge();
    setUsername();
    if (WKUser == null || typeof WKUser != "string" || WKUser == "")
        throw new Error("WKCM2 Error: WKUser not set: " + WKUser);
    
    addGlobalStyle(generalCSS);
    addGlobalStyle(contentCSS);
    addGlobalStyle(textareaCSS);
    addGlobalStyle(cmuserbuttonsCSS);

    if (isReview)
    {
        initReview();
    } else if (isLesson)
    {
        initLesson();
    } else if (isList)
    {
        addGlobalStyle(listCss);
        // TODO: get rid of jquery
        $(".additional-info.level-list.legend li").parent().prepend(getCMLegend(true)).prepend(getCMLegend(false));
        $(".legend.level-list span.commnem").css("background-color", colorMnemAvail).parent().parent().parent().children("li").css("width", 188).parent().children("li:first-child, li:nth-child(6)")
            .css("width", 187);
        $(".legend.level-list span.commnem-req").css("background-color", colorRequestDark);
    } else
    {
        console.log("WKCM2: init else")
    }

}

function initLesson()
{
    let type = getItemType();
    let item = getItem();

    addHTMLinID('supplement-info', mnemOuterHTML);

    document.getElementById("cm-meaning").innerHTML = getCMdivContent("m");
    // document.getElementById("cm-iframe-meaning").outerHTML = getCMForm("meaning");
    document.getElementById("cm-reading").innerHTML = getCMdivContent("r");
    // document.getElementById("cm-iframe-reading").outerHTML = getCMForm("reading");

    initButtons("meaning");
    initButtons("reading");

    let characterDiv = document.getElementById("character");
    if (characterDiv != null)
    {
        characterDiv.addEventListener('DOMSubtreeModified', function(){updateCM()});
        updateCM();
    }
    else
        console.log("character div NOT FOUND");

}

function initReview()
{
    addHTMLinID('item-info', mnemOuterHTML);

    document.getElementById("cm-meaning").innerHTML = getCMdivContent("m");
    document.getElementById("cm-reading").innerHTML = getCMdivContent("r");

    initButtons("meaning");
    initButtons("reading");

    let characterDiv = document.getElementById("character").firstElementChild;
    if (characterDiv != null)
    {
        characterDiv.addEventListener('DOMSubtreeModified', function(){updateCM()});
        updateCM();
    }
    else
        console.log("WKCM2: init, character div NOT FOUND");
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
 * Adds a Event Listener for a click event to the element with id id.
 * */
function addClickEvent(id, func, params)
{
    let div = document.getElementById(id);
    if (div)
        div.addEventListener("click", function() {func(...params);}, false);
}

function initInteractionButtons(mnemType)
{

    addClickEvent(`cm-${mnemType}-edit`,     editCM,    [mnemType]);
    addClickEvent(`cm-${mnemType}-delete`,   deleteCM,  [mnemType]);
    addClickEvent(`cm-${mnemType}-request`,  requestCM, [mnemType]);
    addClickEvent(`cm-${mnemType}-upvote`,   voteCM,    [mnemType, "1"]);
    addClickEvent(`cm-${mnemType}-downvote`, voteCM,    [mnemType, "-1"]);
    addClickEvent(`cm-${mnemType}-submit`,   submitCM,  [mnemType]);
    addClickEvent(`cm-${mnemType}-prev`,     switchCM,  [mnemType, -1]);
    addClickEvent(`cm-${mnemType}-next`,     switchCM,  [mnemType, 1]);
}

function initEditButtons(mnemType)
{

    addClickEvent(`cm-${mnemType}-save`,             editSaveCM,   [mnemType]);
    addClickEvent(`cm-${mnemType}-cancel`,           editCancelCM, [mnemType]);
    addClickEvent(`cm-format-${mnemType}-bold`,      insertTag,    [mnemType, "b"]);
    addClickEvent(`cm-format-${mnemType}-italic`,    insertTag,    [mnemType, "i"]);
    addClickEvent(`cm-format-${mnemType}-underline`, insertTag,    [mnemType, "u"]);
    addClickEvent(`cm-format-${mnemType}-strike`,    insertTag,    [mnemType, "s"]);
    addClickEvent(`cm-format-${mnemType}-newline`,   insertText,   [mnemType, "[n]"]);
    addClickEvent(`cm-format-${mnemType}-reading`,   insertTag,    [mnemType, "read"]);
    addClickEvent(`cm-format-${mnemType}-rad`,       insertTag,    [mnemType, "rad"]);
    addClickEvent(`cm-format-${mnemType}-kan`,       insertTag,    [mnemType, "kan"]);
    addClickEvent(`cm-format-${mnemType}-voc`,       insertTag,    [mnemType, "voc"]);

}

// Button initialization ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// Generating HTML ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

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
    let userContentIframe = `<iframe sandbox referrerpolicy='no-referrer' scrolling='auto' frameBorder='0' class='${iframeClass}' id='${iframeId}' srcdoc="${initialSrcdoc}"></iframe>`;
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
        <div id="cm-${mnemType}-submit" class="cm-submit-highlight disabled">Submit Yours</div></div>`;

    return content;
}

/**
 * Create the textbox and all of its buttons for writing mnemonics
 * */
function getCMForm(mnemType)
{
    var CMForm = /*HTML*/`
<form id="cm-${mnemType}-form" class="cm-form cm-mnem-text" onsubmit="return false">
<div id="cm-${mnemType}-format" class="cm-format">
<div id="cm-format-${mnemType}-bold" class="btn cm-format-btn cm-format-bold"           title="bold"><b>b</b></div>
<div id="cm-format-${mnemType}-italic" class="btn cm-format-btn cm-format-italic"       title="italic"><i>i</i></div>
<div id="cm-format-${mnemType}-underline" class="btn cm-format-btn cm-format-underline" title="underline"><u>u</u></div>
<div id="cm-format-${mnemType}-strike" class="btn cm-format-btn cm-format-strike"       title="strikethrough"><s>s</s></div>
<div id="cm-format-${mnemType}-newline" class="btn cm-format-btn cm-format-newline"     title="newline"><div>&#92;n</div></div>
<div id="cm-format-${mnemType}-reading" class="btn cm-format-btn cm-format-reading reading highlight-reading"   title="reading">読</div>
<div id="cm-format-${mnemType}-rad" class="btn cm-format-btn cm-format-rad radical"     title="radical">部</div>
<div id="cm-format-${mnemType}-kan" class="btn cm-format-btn cm-format-kan kanji"       title="kanji">漢</div>
<div id="cm-format-${mnemType}-voc" class="btn cm-format-btn cm-format-voc vocabulary"  title="vocabulary">語</div></div>
<fieldset class="note-${mnemType} noSwipe">
<!-- Textarea (Textbox) -->
<textarea id="cm-${mnemType}-text" class="cm-text" maxlength="5000" placeholder="Submit a community mnemonic"></textarea>
<div class="flex items-center"><span id="cm-${mnemType}-chars-remaining" class="block" title="Characters Remaining">5000<i class="fa fa-pencil ml-2"></i></span>
<!-- Save and Cancel Buttons -->
<button type="submit" id="cm-${mnemType}-save" class="ml-2 p-0 bg-gray-500 border-1 rounded-l font-lessons text-white disabled:cursor-not-allowed disabled:opacity-50">Save</button>
<button type="button" id="cm-${mnemType}-cancel" class="btn-cancel ml-1 p-0 bg-gray-500 border-1 rounded-r font-lessons text-white disabled:cursor-not-allowed disabled:opacity-50">Cancel</button></div>

</fieldset>
</form>`;
    return CMForm;
}

// Generating HTML ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// General helper functions ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

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
 * converts meaning -> m, reading -> r
 * */
function getShortMnemType(type)
{
    if (type === "reading" || type === "r" || type === "Reading")
        return "r"
    else if (type === "meaning" || type === "m" || type === "Meaning")
        return "m"
    else
        throw new Error("WKCM2: getShortMnemType got wrong ItemType: "+type);
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
    let text = textArea.value;
    let indexStart = textArea.selectionStart;
    let indexEnd = textArea.selectionEnd;
    return text.substring(indexStart, indexEnd);
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

// General helper functions ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
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
    if (!updateCMelements.mnem)
        return;
    if (updateCMelements.mnem[mnemType] == null)
        return;
    if (updateCMelements.currentUser[mnemType] == null)
        return;
    if (updateCMelements.currentUser[mnemType] != WKUser)
        return;

    let iframe = document.getElementById(`cm-iframe-${mnemType}`);
    if (!iframe)
        return;

    disableButtons(mnemType);

    // save "edit" mode for submitCM function. 
    editSaveCM.editMode = "edit";

    iframe.outerHTML = getCMForm(mnemType);

    // addClass(`cm-${mnemType}-upvote`);
    // addClass(`cm-${mnemType}-downvote`);
    // addClass(`cm-${mnemType}-submit`);
    
    initEditButtons(mnemType);

    let textarea = document.getElementById(`cm-${mnemType}-text`);
    if (textarea)
    {
        // replace HTML entities, so user actually sees the sign, they used before. Like < instead of &#60;
        textarea.value = decodeHTMLEntities(updateCMelements.mnem[mnemType]);
    }
}

function deleteCM(mnemType)
{
    alert("Deleting Mnemonics is not yet implemented. ");
}

function requestCM(mnemType)
{
    let item = getItem();
    let shortType = getShortItemType(getItemType());
    let shortMnemType = getShortMnemType(mnemType);

    let url = sheetApiUrl + `?exec=request&item=${item}&type=${shortType}&user=${WKUser}&mnemType=${shortMnemType}`;
    url = encodeURI(url);

    addClass(`cm-${mnemType}-request`);
    
    fetch(url).then(response =>
        {
            if (response == "success")
            {
                // do something to celebrate the successfull insertion of the request
            }
            else if (response == "error")  // includes error, not ==
            {
                // do something to handle the failure
            }
        }).catch(reason => console.log("WKCM2: requestCM failed: ", reason)).then(dataUpdateAfterInsert());
}

function voteCM(mnemType, vote)
{
    if (!updateCMelements.currentUser)
        return;
    if (! typeof updateCMelements.currentUser[mnemType] == "string" )
        return;
    if (!updateCMelements.mnemIndex)
        return;
    if (Number.isNaN(Number(updateCMelements.mnemIndex[mnemType])))
        return;
    let item = getItem();
    let shortType = getShortItemType(getItemType());
    let shortMnemType = getShortMnemType(mnemType);

    // user=WKUser: the one who is voting
    // mnemUser: the one whose mnem is being voted
    // mnemIndex: Index of mnems by user. NOT index of the whole json, as used by updateCM.
    let url = sheetApiUrl +
        `?exec=vote&item=${item}&type=${shortType}&mnemType=${shortMnemType}&user=${WKUser}&mnemUser=${updateCMelements.currentUser[mnemType]}&mnemIndex=${voteCM.mnemIndex}&score=${vote}`;
    url = encodeURI(url);

    if (Number(vote) >= 1)
        addClass(`cm-${mnemType}-upvote`);
    else if (Number(vote) <= -1)
        addClass(`cm-${mnemType}-downvote`);

    fetch(url).then(response =>
        {
            if (response == "success")
            {
                // do something to celebrate the successfull insertion of the request
            }
            else if (response == "error")  // includes error not ==
            {
                // do something to handle the failure
            }
        }).catch(reason => console.log("WKCM2: requestCM failed: ", reason)).then(dataUpdateAfterInsert());

    if (typeof updateCMelements.currentUser != "undefined")
        updateCMelements.currentUser[mnemType] = undefined;
    if (typeof updateCMelements.mnemIndex != "undefined")
        updateCMelements.mnemIndex[mnemType] = undefined;
}

function submitCM(mnemType)
{
    // "Submit Yours" Button

    let iframe = document.getElementById("cm-iframe-" + mnemType);
    if (!iframe)
        return;

    // save edit mode (whether editing or submitting new)
    editSaveCM.editMode = "submit";

    iframe.outerHTML = getCMForm(mnemType);

    disableButtons(mnemType);
    initEditButtons(mnemType);

}

/**
 * Save button during Mnemonic writing. Submitting and edit.
 * Submit Mnemonic to Database Sheet. 
 * */
function editSaveCM(mnemType)
{
    let textarea = document.getElementById(`cm-${mnemType}-text`);
    if (!textarea)
        return;

    let newMnem = replaceInNewMnem(textarea.value);
    // if newMnem empty "", nothing to save
    if (!newMnem)
        return;
    // if updateCMelements.mnem[mnemType] wasn't set, no mnem exists for this, then set it to empty string. 
    if (typeof updateCMelements.mnem != "object")
        updateCMelements.mnem = {};
    if (typeof updateCMelements.mnem[mnemType] == "undefined")
        updateCMelements.mnem[mnemType] = "";
    // nothing to save
    if (newMnem == decodeHTMLEntities(updateCMelements.mnem[mnemType]))
        return;

    addClass(`cm-${mnemType}-save`);

    let type = getItemType();
    let shortType = getShortItemType(type);
    let item = getItem();
    let shortMnemType = getShortMnemType(mnemType);

    if (typeof editSaveCM.editMode ==  "undefined")
        editSaveCM.editMode = "submit";
    // index of the mnemonic for this user in the DB. Needed to update the correct one
    let mnemIndexDB = -1;
    if (typeof updateCMelements.userIndex != "undefined")
        mnemIndexDB = updateCMelements.userIndex[mnemType];
    // append new mnem if mode is submit
    if (editSaveCM.editMode == "submit")
        mnemIndexDB = -1;
    
    // restore iframe. needed by dataUpdate after insert. 
    let editForm = document.getElementById(`cm-${mnemType}-form`);
    if (editForm)
    {
        editForm.outerHTML = getInitialIframe(mnemType);
        disableButtons(mnemType);
    }

    // assemble url and call to put data
    newMnem = encodeURIComponent(newMnem);
    let url = sheetApiUrl +
        `?exec=put&item=${item}&type=${shortType}&user=${encodeURIComponent(WKUser)}&mnemType=${shortMnemType}&mnemIndex=${mnemIndexDB}&mnem=${newMnem}`;

    fetch(url).then().catch(reason => console.log("WKCM2: editSaveCM failed: ", reason)).then(a =>
        {
            addClass(`cm-${mnemType}-cancel`);
            // with undefined, uses default parameter. Stupid JS. Python handles this much better.
            dataUpdateAfterInsert(undefined, undefined, undefined, undefined, undefined,
                                  index=updateCMelements.currentIndex, mnemType=mnemType);
        });

    editSaveCM.editMode = undefined;
    if (typeof updateCMelements.userIndex != "undefined")
        updateCMelements.userIndex[mnemType] = undefined;
    if (typeof updateCMelements.mnem != "undefined")
        updateCMelements.mnem[mnemType] = undefined;
}

/**
 * Cancel button during Mnemonic writing. Submitting and edit.
 * Prompts for confirmation, if content is edited or not empty.
 * */
function editCancelCM(mnemType)
{
    let textarea = document.getElementById(`cm-${mnemType}-text`);
    let cancelConfirm = true;
    // only open dialog if it has content and it was edited
    if (textarea && updateCMelements.mnem)
        if (textarea.value && decodeHTMLEntities(updateCMelements.mnem[mnemType]) !== textarea.value)
            cancelConfirm = confirm("Your changes will be lost. ");

    if (cancelConfirm)
    {
        let editForm = document.getElementById(`cm-${mnemType}-form`);
        if (!editForm)
            return;
        editForm.outerHTML = getInitialIframe(mnemType);
        updateCM(mnemJson=false, mnemType=mnemType, index=updateCMelements.currentIndex);
    }
    if (typeof updateCMelements.mnem != "undefined")
        updateCMelements.mnem[mnemType] = undefined;
}

function switchCM(mnemType, summand)
{
    let idx = 0;
    if (!Number.isNaN(Number(updateCMelements.currentIndex)))
        idx = Number(updateCMelements.currentIndex);
    let dataJson = false;
    if (typeof switchCM.dataJson != "undefined")
        dataJson = switchCM.dataJson;
    updateCM(dataJson, mnemType, idx+summand);
    switchCM.dataJson = undefined;
}


/**
 * Insert the tag "tag" in mnem writing field, at current cursor position, or around highlighted text.
 * */
function insertTag(mnemType, tag)
{
    let textarea = document.getElementById(`cm-${mnemType}-text`);
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

/**
 * Insert the text in mnem writing field, at current cursor position.
 * */
function insertText(mnemType, text)
{
    let textarea = document.getElementById(`cm-${mnemType}-text`);
    if (!textarea)
        return
    if (textarea.setRangeText)
    {
        //if setRangeText function is supported by current browser
        textarea.setRangeText(text);
    } else
    {
        textarea.focus()
        document.execCommand('insertText', false /*no UI*/, text);
    }
}
// Button functionality ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Item List stuff

/**
 * Returns new elements for the legend on item list pages (.../kanji/, .../level/)
 * */
function getCMLegend(isReq) {
    // TODO: get rid of jquery, replace with my own code.
    return $('<li><div><span class="commnem' + ((isReq) ? "-req" : "") + '" lang="ja">共</span></div>' + ((isReq) ? "Mnemonic Requested" : "Community Mnemonics") + '</li>');
}

/**
 * Returns a badge for items in lists, whether a Mnemonic is available or requested
 * */
function getCMBadge(isRecent, isReq) {
    // TODO: get rid of jquery, replace with my own code.
    return $('<span lang="ja" ' + ((isRecent) ? ' style="top: ' + ((getItemType() == "k") ? '2.25em" ' : '1em" ') : '') + 'class="item-badge commnem-badge' + ((isReq) ? "-req" : "") + '"></span>');
}

// Update Mnemnic content displayed ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
/**
 * fetches Data, if not given. Will update at index given. updates both given mnemTypes, or just one, if string.
 * Then calls updateCMelements, which does the visual update of the content and buttons and stuff.
 * @param mnemJson needed to bypass recursive getMnemonic call, once data got loaded. False because can be null, when no mnem available.
 * @param mnemType array by default to make calling the function more convenient. Will be executed for both values in array.
 * @param index index of Mnem to use
 * */
function updateCM(dataJson=false, mnemType=["meaning", "reading"], index=0)
{
    // display loading message
    /*
    if (typeof mnemType == "object")
        for (let ele of mnemType)
            updateIframe(ele, "Loading Community Mnemonic ...")
    */

    let type = getItemType();

    if (dataJson !== false)
    {
        if (typeof mnemType === "string")
            mnemType = [mnemType];
        else
        {
            // reset global mnem storage for save&editing when updating both types
            // all are {} when willed with mnemType as key
            // mnemonics, for edit, save & cancel
            updateCMelements.mnem = undefined;
            // user of currently displayed mnem. (edit & vote)
            updateCMelements.currentUser = undefined;
            // Index of active mnem, of all mnems. (update & vote)
            updateCMelements.mnemIndex = undefined;
            // Index of active mnem, of the users mnems. (editSave)
            updateCMelements.userIndex = undefined;
        }
        for (let ele of mnemType)
            updateCMelements(ele, type, dataJson, index);
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
}

/**
 * Replaces HTML encoded characters with their real counterpart.
 * Only used before editing, so that the user does not see the confusing HTML entities.
 * So this only lands in the textbox, not in the HTML, or iframe. It is used for comparisons as well.
 * */
function decodeHTMLEntities(text)
{
    if (text === "")
        return "";
    if (!text || typeof text != "string")
    {
        printDev("WKCM2: decodeHTMLEntities, did not get text: ", text);
        return;
    }
    let entities = [
        ['amp', '&'], ['#x26', '&'], ['#38', '&'],
        ['apos', '\''], ['#x27', '\''], ['#39', '\''],
        ['#x2F', '/'], ['#47', '/'],
        ['lt', '<'], ['#60', '<'], ['#x3C', '<'],
        ['gt', '>'], ['#62', '>'], ['#x3E', '>'],
        ['nbsp', ' '],
        ['quot', '"'], ['#34', '"'], ['#x22', '"'],
        ['#39', "'"], ['#x27', "'"],
        ['#92', '\\'], ['#x5C', '\\'],
        ['#96', '`'], ['#x60', '`'],
        ['#35', '#'], ['#x23', '#'],
        ['#37', '%'], ['#x25', '%']
    ];

    for (let i = 0, max = entities.length; i < max; ++i)
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);

    return text;
}

// getIframeSrcdoc helpers ▼
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

/**
 * Replace stuff, that should not land in DB. Or maybe unintended input by user.
 * Technically redundant, since this is handled better by apps script. 
 * */
function replaceInNewMnem(text)
{
    // is handled by insertion apps script as well. 
    // replace newlines with markup
    text = text.replace(/\n/g,'[n]').replace(/\r/g,'[n]');
    return text;
}

/**
 * Replace custom markup with actual HTML tags for highlighting.
 * Those are the only HTML tags, that should land in the iframe. 
 * */
function replaceMarkup(text)
{
    let list = ["b", "i", "u", "s", "br"];
    for (const ele of list)
    {
        text = text.replaceAll("["+ ele +"]", "<"+ ele +">");
        text = text.replaceAll("[/"+ ele +"]", "</"+ ele +">");
    }

    // [/span] used as closing tag for legacy data in db.
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

    text = text.replaceAll("[n]", `<br>`);
    text = text.replaceAll("[br]", `<br>`);
    // legacy replace \n, that are already in the DB. (saved literally as \\n)
    text = text.replaceAll("\n", `<br>`);
    text = text.replaceAll("\\n", `<br>`);
    
    return text;
}

function getUserProfileLink(user)
{
    // Don't give Anonymous a profile link
    if (typeof user != "string" || user == "")
        return "";
    if (user == "Anonymous")
        return `<a>Anonymous</a>`;
    else if (user == "!")
        return "";
    else
        return `<a href="https://www.wanikani.com/users/${user}" target="_blank" >${user}</a>`;
}

/**
 * Generates the content of the iframe, that will be set as it's srcdoc property.
 * Needs the WaniKani CSS an the actual body content. 
 * */
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
    background-color: ${colorRequest} !important;
    display: inline !important;
    border-radius: 3px !important;
    padding: 1px !important;
}
/* The scrollbar is ugly af. At least on Chrom*. Hide scrollbar in iframe, but it is still scrolable, if mnem is long.
   TODO: display scrollbar again, only when mnem is long. (Maybe determine by line count. )
 */
::-webkit-scrollbar{display: none;}
* {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
}
</style>`;
    cssString = cssString.replaceAll('"', "'");
    

    // just to be sure replace those signs here again. But those shouldn't be in the sheet to begin with.
    text = text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
               .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    text = replaceMarkup(text);

   // text = escape(text);
    
    let userMsg = "";
    // user can be null, if it is a system message
    if (user != null && typeof user === "string" && user != "")
    {
        user = user.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
                   .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        userMsg = "by " + getUserProfileLink(user);
    }
    else if (user == "!")
        userMsg = "This is a request. It should have been deleted after submission of a mnemonic. If you are seeing this, please post in the forum, open an issue on GitHub, or just downvote it. ";

    let srcdoc = `<html><head>${cssString}</head><body><div class='col2'>${text}</div><div id='user-link'>${userMsg}</div></body></html>`;
    return srcdoc;
}
// getIframeSrcdoc ▲

// updateCMelements helpers ▼
function getNoMnemMsg()
{
    let msg = `No Community Mnemonic for this item exists yet. [br]Be the first to submit one.`;
    return msg;
}

function getRadicalReadingMessage()
{
    let msg = `Radicals have no reading. `;
    return msg;
}

function getMnemRequestedMsg(users)
{
    // TODO: make request color darker red, the more users requested
    let len = users.length;
    let msg = `A Mnemonic was [request]requested[/request] for this item. [br][request]Help the community by being the first to submit one![/request]`;
    if (len === 1)
        msg = `A Mnemonic was [request]requested[/request] by the user [request]${users[0]}[/request]. [br]Help them by being the first to submit one! `;
    else if (len > 1)
        msg = `A Mnemonic was [request]requested[/request] by the users [request]${users.slice(0, -1).join(', ')+' and '+users.slice(-1)}[/request]. [br]Help them by being the first to submit one! `;
    return msg;
}

function setScore(mnemType, score)
{
    let scoreEle = document.getElementById(`cm-${mnemType}-score-num`);
    if (scoreEle != null)
    {
        // make sure score is number and not (potentially harmful) string
        if (!Number.isNaN(Number(score)))
            scoreEle.innerText = Number(score);
        else
            scoreEle.innerText = 0;
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
 * Enables/Disables voring buttons depending on users vote
 * votesJson["mnemUser"][mnemIndex]{WKuser} <-- contains vote
 * */
function toggleVotes(mnemType, votesJson, mnemUser, mnemIndex)
{
    try
    {
        let userVote = Number(votesJson[mnemUser][mnemIndex][WKUser]);
        if (userVote >= 1)
            addClass(`cm-${mnemType}-upvote`);
        if (userVote <= -1)
            addClass(`cm-${mnemType}-downvote`);
    }
    catch (err)
    {
        // catches "TypeError: Cannot read properties of undefined", because I am too lazy for 100 nested if checks
    }
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
    let oldIframeContent = /<body.*?>([\s\S]*)<\/body>/.exec(iframe.srcdoc)[1];

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
    // Radicals only have meaning, no reading. Disable Reading buttons and update Reading message
    if(mnemType == "reading" && type == "radical")
    {
        disableButtons(mnemType);
        updateIframe(mnemType, getRadicalReadingMessage());
        return;
    }

    // write index of mnem into prev button html, for lack of a better solution. For switching mnems.
    // initialize, set and/or reset index
    updateCMelements.currentIndex = index;
    // if mnemJson is undefined or null, no mnemonic exists for this item/type combo. 
    //reset score display
    setScore(mnemType, 0);

    disableButtons(mnemType);
    removeClass(`cm-${mnemType}-submit`);

    // updateCMelements.mnem saves the last refreshed mnem globally for edit & save functions
    if (typeof updateCMelements.mnem == "undefined")
        updateCMelements.mnem = {};
    updateCMelements.mnem[mnemType] = null;
    if (typeof updateCMelements.currentUser == "undefined")
        updateCMelements.currentUser = {};
    updateCMelements.currentUser[mnemType] = null;

    if (dataJson != null)
    {
        // sanity check if Mnems are filled, or just contain empty jsons ("" keys length is 0)
        if ((Object.keys(dataJson["Meaning_Mnem"]).length == 0 || dataJson["Meaning_Mnem"] == "{}") &&
            (Object.keys(dataJson["Reading_Mnem"]).length == 0 || dataJson["Reading_Mnem"] == "{}") )
        {
            updateIframe(mnemType, getNoMnemMsg());
            removeClass(`cm-${mnemType}-request`);
            return;
        }


        let mnemSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Mnem";
        let scoreSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Score";
        let votesSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Votes";
        let scoreJson = jsonParse(dataJson[scoreSelector]);
        let mnemJson = jsonParse(dataJson[mnemSelector]);
        let votesJson = jsonParse(dataJson[votesSelector]);

        // no mnem available for current item
        if (mnemJson == null)
        {
            updateIframe(mnemType, getNoMnemMsg());
            removeClass(`cm-${mnemType}-request`);
        }
        // request JSON: {"!": ["Anonymous", "Dakes"]}
        else if (Object.keys(mnemJson)[0] == "!" && Object.keys(mnemJson).length == 1)
        {
            updateIframe(mnemType, getMnemRequestedMsg(mnemJson["!"]));
            if (mnemJson["!"].includes(WKUser))
                addClass(`cm-${mnemType}-request`);
            else
                removeClass(`cm-${mnemType}-request`);
            // disable request button, if user already requested
        }
        // default case. Mnem available
        else
        {
            toggleArrows(mnemType, getMnemCount(mnemJson), index);
            // save dataJson to pseodo global, to prevent reloading from cache. (is faster [only a bit])
            switchCM.dataJson = dataJson;
            
            let mnemCount = getMnemCount(mnemJson);
            let nDataUser = getNthDataUser(mnemJson, index);
            let mnemIndex = getUserIndex(mnemJson, index, nDataUser[1]);
            updateIframe(mnemType, ...nDataUser);  // (mnemType, mnem, user)
            let score = getNthScore(scoreJson, index);
            setScore(mnemType, score);
            toggleUserButtons(mnemType, nDataUser[1] == WKUser);
            toggleVotes(mnemType, votesJson, nDataUser[1], mnemIndex);
            updateCMelements.currentUser[mnemType] = nDataUser[1];
            if (typeof updateCMelements.mnemIndex == "undefined")
                updateCMelements.mnemIndex = {};
            updateCMelements.mnemIndex[mnemType] = mnemIndex;

            // only if the currently displayed mnem is by user
            if (nDataUser[1] == WKUser)
            {
                updateCMelements.mnem[mnemType] = nDataUser[0];
                let userMnemIndex = getUserIndex(mnemJson, index);
                // to know which mnem to edit.
                if (typeof updateCMelements.userIndex == "undefined")
                    updateCMelements.userIndex = {};
                updateCMelements.userIndex[mnemType] = userMnemIndex;
            }

            // disable submit button if user submitted too many mnems
            if (getUserMnemCount(mnemJson, WKUser) >= mnemMaxCount)
                addClass(`cm-${mnemType}-submit`);

        }
    }
    // no mnem available for both items
    else
    {
        updateIframe(mnemType, getNoMnemMsg());  // (mnem, user)
        removeClass(`cm-${mnemType}-request`);
        updateCMelements.mnem[mnemType] = null;
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
    let url = sheetApiUrl + `?item=${item}&type=${shortType}&exec=get`;
    url = encodeURI(url);
    // TODO: handle case of malformed URL
    return fetch(url)
        .then(response => response.json()).catch(reason => {console.log("WKCM2: fetchData failed: "+reason); return null;})
        .then((responseJson)=>
            {
                if (responseJson == null)
                    return null;
                else
                {
                    // Object.keys... .length on "" is 0. neat
                    if (Object.keys(responseJson["Meaning_Mnem"]).length == 0 || responseJson["Meaning_Mnem"] == "{}")
                        if (Object.keys(responseJson["Reading_Mnem"]).length == 0 || responseJson["Reading_Mnem"] == "{}")
                            return null;
                    return responseJson;
                }
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

/**
 * @param identifier wkof.file_cache identifier
 * @param daydiff days to compare
 * @return true if older than daydiff, else false
 * */
function cacheAgeOlder(identifier, dayDiff=3)
{
    // 86400000ms == 1d
    let cachedDate = 0;
    try
    {
        if (typeof wkof.file_cache.dir[identifier] == "undefined")
            return true;
        cachedDate = Date.parse(wkof.file_cache.dir[identifier]["added"]);
    }
    catch (err)
    {
        console.log("WKCM2: cacheAgeOlder, ", err);
        return true;
    }
    let pulledDiff = Math.floor((Date.now() - cachedDate) / 86400000);
    if (pulledDiff > dayDiff)
        return true
    else
        return false;
}

/**
 * Runs fillCache but firstly checks, the age of the last fillCache.
 * Only runs if last complete fill was older then, uhmm 2 weeks?? ¯\_(ツ)_/¯
 * */
function checkFillCacheAge()
{
    let identifier = "wkcm2-fillCache";
    wkof.file_cache.load(identifier).then(value  =>
        {
            // found
            let older = cacheAgeOlder(identifier, dayDiff=14);
            if (older === true)
            {
                printDev(`WKCM2: Last complete cache fill older than ${dayDiff} days. Refilling Cache. `);
                // regex delete of all wkcm2 saves
                wkof.file_cache.delete(/^wkcm2-/);
                fillCache();
                wkof.file_cache.save("wkcm2-version", WKCM2_version);
                wkof.file_cache.save(identifier, "Cache Filled");
            }
        }, reason =>
        {
            fillCache();
            wkof.file_cache.save(identifier, "Cache Filled");
        }
    );
    
}

/**
 * Fills the cache with all available items.
 * Deletes the current wkcm cache
 * runs async. in the background.
 * NOTE: Items, that are not in the DB are not fetched by getall. So they still are uncached.
 * But the No mnem available message is displayed prematurely, so it should be fine. 
 * */
async function fillCache()
{
    let url = sheetApiUrl + `?exec=getall`;
    url = encodeURI(url);
    fetch(url)
        .then(response => response.json()).catch(reason => {console.log("WKCM2: fillCache failed: ", reason); return null;})
        .then((responseJson)=>
            {
                if (responseJson == null)
                    return null;
                else
                {
                    resetWKOFcache(versionCheck=false);
                    for (let typeItem in responseJson)
                    {
                        let identifier = getCacheId(responseJson[typeItem]["Item"], responseJson[typeItem]["Type"]);
                        wkof.file_cache.save(identifier, responseJson[typeItem]);
                    }
                }
            }
        ).catch(err => console.log("WKCM2: fillCache, ", err) );
}

async function deleteCacheItem(item, type)
{
    if (type == null || type == "")
        type = getItemType(short=true);
    if (item == null || item == "")
        item = getItem();
    let identifier = getCacheId(item, type);
    return wkof.file_cache.delete(identifier);
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
        type = getItemType(short=true);
    if (item == null || item == "")
        item = getItem();
    let identifier = getCacheId(item, type);

    // get from wkof cache
    let data = null;
    data = wkof.file_cache.load(identifier).then(value  =>
        {
            // cache hit
            // return from cache
            printDev("Cache hit for", identifier, value);
            getData.misses = 0;

            // background update of cache, if date pulled is older than dayDiff. 86400000ms == 1d
            // NOTE: If too many people use WKCM2, it might be necessary to turn this up, so the API doesn't get spammed with requests.
            const dayDiff = 1;
            let cacheOlder = cacheAgeOlder(identifier, dayDiff);
            if (cacheOlder)
                dataBackgroundUpdate(item, type, value);

            return value;
        }, reason =>
        {
            // cache miss
            // fetch data from db, put in cache and return

            // protection against deadlock "just in case" something somewhere else at some point breaks. 
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

                    // only toggle visual update if the original item is still displayed. 
                    let curTyIt = getShortItemType(getItemType()) + getItem();
                    let prevTyIt = getShortItemType(type) + item;
                    if (curTyIt == prevTyIt)
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

function isEqualsJson(obj1, obj2)
{
    if (obj1 == null && obj2 == null)
        return true;
    else if (obj1 == null || obj2 == null)
        return false;
    let keys1 = Object.keys(obj1);
    let keys2 = Object.keys(obj2);

    //return true when the two json has same length and all the properties has same value key by key
    return keys1.length === keys2.length && Object.keys(obj1).every(key=>obj1[key]==obj2[key]);
}

/**
 * Update the displayed Mnemonic & cache in the background. If a new one is available. If no new one is available does noting.
 * @param item item to update (星). Will be set if null.
 * @param item type of item (kanji) Will be set if null.
 * @param cachedData old data json (currently in cache) will be updated, if new version is different.
 * @param wait number of ms to wait with execution, or false. (Because after insertion into sheet it takes a moment for the updated version to be returned. Annoyingly even when using promises. )
 * @param 
 * */
async function dataBackgroundUpdate(item=null, type=null, cachedData=null, wait=false)
{
    if (wait && typeof wait == "number")
    {
        setTimeout(function()
                {
                    dataBackgroundUpdate(item, type, cachedData, wait=false);
                }, wait);
        return;
    }

    if (item == null)
        item = getItem();
    if (type == null)
        type = getItemType();

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
                updateCMelements.curItem = item;
                updateCMelements.curType = type;
                updateCM(reponseJsonCopy);
            }

            return responseJson;
        }).catch( reason =>
        {
            // fetch failed
            // TODO: handle failed fetch
            console.log("WKCM2: Error, dataBackgroundUpdate, Fetch of data from spreadsheet failed: " + reason);
        });
}
// dataBackgroundUpdate ▲

/**
 * Update the displayed Mnemonic & cache. It will be called after an submission to the sheet.
 * So compared to dataBackgroundUpdate it expects an update, and will repeat the fetch a few times, until it gives up.
 * After the insertion into the sheet it takes a few moments (~1-2s) until the new data is returned. 
 * @param item item to update (星). Will be set if null.
 * @param item type of item (kanji) Will be set if null.
 * @param cachedData old data json (currently in cache) will be updated, if new version is different. Will be set if false. 
 * @param tries number of times to retry before giving up, waits "wait"ms between executions.
 * @param wait number of ms to wait with execution, or false. (Because after insertion into sheet it takes a moment for the updated version to be returned. Annoyingly even when using promises. )
 * @param index Index to use for displayed mnemonic. So user sees their changed mnem directly after submission. Should only be used togetcher with mnemType. 
 * @param mnemType just as index, mnemType to pass through.
 * */
function dataUpdateAfterInsert(item=null, type=null, cachedData=false, tries=10, wait=1000, index=0, mnemType=undefined)
{
    if (tries < 0)
    {
        console.log("WKCM2: dataUpdateAfterInsert, Maximum number of tries reached, giving up. Currently displayed Mnemonic will not be updated. ");
        updateCM(undefined, mnemType, index);
        return;
    }
    if (item == null)
        item = getItem();
    if (type == null)
        type = getItemType();
    let identifier = getCacheId(item, type);
    
    if (cachedData === false)
    {
        wkof.file_cache.load(identifier).then(cachedData  =>
            dataUpdateAfterInsert(item, type, cachedData, tries, wait, index, mnemType))
            .catch(err => {
                printDev("WKCM2: dataUpdateAfterInsert, cache miss: ", err);
                dataUpdateAfterInsert(item, type, cachedData=null, tries, wait, index, mnemType);
            });
        return;
    }

    fetchData(item, type).then(responseJson =>
        {
            // fetch worked
            let reponseJsonCopy = JSON.parse(JSON.stringify(responseJson));

            if (!isEqualsJson(cachedData, responseJson))
            {
                wkof.file_cache.save(identifier, responseJson);
                updateCM(reponseJsonCopy, mnemType, index);
            }
            else
            {
                // retry after "wait" ms
                setTimeout(function()
                {
                    dataUpdateAfterInsert(item, type, cachedData, --tries, wait+250, index, mnemType);
                }, wait);
            }

        }).catch( reason =>
        {
            // fetch failed
            // TODO: handle failed fetch
            console.log("WKCM2: Error, dataUpdateAfterInsert, Fetch of data from spreadsheet failed: " + reason);
        });

}
// dataUpdateAfterInsert ▲

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
            console.log("WKCM2: jsonParse, got invalid json string: ", jsonString);
            // sometimes fetch was faster then score calculation => #ERROR!
            // if found retry. But only a few times. (There may really be #ERROR! in DB)
            if (jsonString.includes("#ERROR!"))
            {
                if (typeof jsonParse.refetchCounter == "undefined")
                    jsonParse.refetchCounter = 5;
                if (jsonParse.refetchCounter > 0)
                    deleteCacheItem(item=null, type=null).then(r => { getData(item=null, type=null); jsonParse.refetchCounter--; });
            }
        }
    }
    // I hate JavaScript so much right now. for consistency if empty json, convert to null
    if (newJson != null)
        if (typeof newJson == "object")
            if (Object.keys(newJson).length == 0)
                newJson = null;
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
        return [null, null];
    let count = 0;
    for (let user in innerJson)
    {
        for (let data of innerJson[user])
        {
            if (count == n)
                return [data, user];
            ++count;
        }
    }
    return [null, null];
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

/**
 * Get the index of the users individual mnem from the global mnem index.
 * Relevant for editing mnem, to overwrite the correct one in the sheet.
 * */
function getUserIndex(mnemJson, n, user=null)
{
    if (user == null)
        user = WKUser;
    if (mnemJson == null)
        return 0;
    if (mnemJson[user] == null)
        return 0;

    let count = 0;
    for (let currentUser in mnemJson)
    {
        let userCount = 0;
        for (let data of mnemJson[currentUser])
        {
            if (count == n && currentUser == user)
                return userCount;
            ++userCount;
            ++count;
        }
    }
    return 0;
}
// Local data management ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
