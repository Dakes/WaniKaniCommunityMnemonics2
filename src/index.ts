import { checkFillCacheAge } from "./cache";
import { isList, isItem, isReview, isLesson } from "./const";
import { getCMdivContent, getMnemOuterHTML } from "./html/mnem_div";
import { initButtons, updateCM } from "./mnemonic";
import { getItemType, getItem } from "./page";
import { setUsername } from "./user";
import { waitForEle, addGlobalStyle, addHTMLinEle } from "./utils";
import { waitForWKOF, wkof, resetWKOFcache, checkWKOF_old } from "./wkof";
import { getLegendLi } from "./html/list";

// ? Legacy imports?
import * as generalCss from "./css/general.scss"
import * as listCss from "./css/list.scss"
import * as buttonCss from "./css/button.scss"
import * as formatButtonCss from "./css/formatButton.scss"
import * as textareaCss from "./css/textarea.scss"
import * as contentCss from "./css/content.scss"
import * as highlightCss from "./css/highlight.scss"


// CREDIT: This is a reimplementation of the userscript "WK Community Mnemonics" by forum user Samuel-H.
// Original Forum post: https://community.wanikani.com/t/userscript-community-mnemonics-v0978/7367
// The original stopped working some time ago and was plagued by bugs even longer.
// Due to security concerns involving XSS attacks, due to the nature of displaying user generated content,
// I decided to recode everything from scratch.
// The code is entirely my own, except for a few individual lines of code, that I will replace soon
// and HTML and CSS, that I carried over from the old version. 


run();

// all code runs from here
function run()
{
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

    } else if (isList || isItem)
    {
        if (document.readyState === "loading")
            document.addEventListener("DOMContentLoaded", function() { preInit(); });
        else
            preInit();
    }
}

// CSS
const generalCSS = generalCss.stylesheet;
const listCSS = listCss.stylesheet;
const buttonCSS = buttonCss.stylesheet;
const formatButtonCSS = formatButtonCss.stylesheet;
const textareaCSS = textareaCss.stylesheet;
const contentCSS = contentCss.stylesheet;
const highlightCSS = highlightCss.stylesheet;


// Init ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * Runs checks if elements exist before running init and waits for them. Then calls init.
 * */
export function preInit()
{
    let elePromise = null;
    // character div only needed in Lesson & Review. For list use dummy Promise.
    if (isList || isItem)
        elePromise = Promise.resolve(true);
    else
        elePromise = waitForEle('character');

    elePromise.then(/*waitForWKOF().then()*/
        waitForWKOF().then(exists => {
            if(exists)
            {
                wkof.include('Apiv2');
                wkof.ready('Apiv2').then(init);
            }
            else
                console.log("WKCM2: there was a problem with checking for wkof. Please check if it is installed correctly and running. ");
        }).catch(exists => {
            console.log("WKCM2: ERROR. WKOF not found.");
            checkWKOF_old();
        })


    ).catch(err =>
    {
        // Ele "character" does not exist.
        console.log("WKCM2: Error. The div with the id character does not exist. Exiting");

    });
    // !delete
    /*
    .then(resp =>
    {
        console.log("here2");
        checkWKOF();
        wkof.include('Apiv2');
        wkof.ready('Apiv2').then(init);
    });*/
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

    addGlobalStyle(generalCSS);
    addGlobalStyle(buttonCSS);
    addGlobalStyle(formatButtonCSS);
    addGlobalStyle(contentCSS);
    addGlobalStyle(textareaCSS);
    addGlobalStyle(highlightCSS);

    if (isReview)
    {
        initReview();
    } else if (isLesson)
    {
        initLesson();
    } else if (isList)
    {
        initList();

    }
    else if (isItem)
    {
        initItem();
    }
    else
    {
        console.log("WKCM2: init else")
    }

}

function initLesson()
{
    let type = getItemType();
    let item = getItem();

    addHTMLinEle('supplement-info', getMnemOuterHTML());

    document.getElementById("cm-meaning").innerHTML = getCMdivContent("meaning");
    // document.getElementById("cm-iframe-meaning").outerHTML = getCMForm("meaning");
    document.getElementById("cm-reading").innerHTML = getCMdivContent("reading");
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
    addHTMLinEle('item-info', getMnemOuterHTML());

    document.getElementById("cm-meaning").innerHTML = getCMdivContent("meaning");
    document.getElementById("cm-reading").innerHTML = getCMdivContent("reading");

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

function initItem()
{
    if (getItemType() == "radical")
    {
        addHTMLinEle('.subject-section', getMnemOuterHTML(true), "afterend");
    }
    if (getItemType() != "radical")
    {
        addHTMLinEle('reading', getMnemOuterHTML(), "afterend");
        document.getElementById("cm-reading").innerHTML = getCMdivContent("reading");
        initButtons("reading");
        updateCM();
    }

    document.getElementById("cm-meaning").innerHTML = getCMdivContent("meaning");
    initButtons("meaning");
    updateCM(undefined, "meaning");
}

function initList()
{
    console.log("hey, this is a list");
    addGlobalStyle(listCSS);
    addHTMLinEle(".subject-legend__items", getLegendLi(), "beforeend");
    
    // $(".legend.level-list span.commnem-req").css("background-color", colorRequestDark);
}

// Init ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
