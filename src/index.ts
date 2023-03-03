import { fillCacheIfExpired } from "./cache";
import { isList, isItem, isReview, isLesson } from "./const";
import { getCMdivContent, getMnemOuterHTMLList } from "./html/mnem_div";
import { initButtons, updateCM } from "./mnemonic";
import { getItemType, detectUrlChange, waitForClass, observeLessonTabs, observeReviewInfo } from "./page";
import { setApiKey, setUsername } from "./user";
import { waitForEle, addGlobalStyle, addHTMLinEle, getMedItemType } from "./utils";
import { waitForWKOF, wkof, resetWKOFcache, checkWKOF_old } from "./wkof";
import { getBadgeBaseClass, getBadgeClassAvail } from "./html/list";

// ? Legacy imports?
import * as generalCss from "./css/general.scss"
import * as listCss from "./css/list.scss"
import * as buttonCss from "./css/button.scss"
import * as formatButtonCss from "./css/formatButton.scss"
import * as textareaCss from "./css/textarea.scss"
import * as contentCss from "./css/content.scss"
import * as highlightCss from "./css/highlight.scss"
import { addBadgeToItems, initHeader } from "./list";


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
    fillCacheIfExpired();
    setUsername();
    setApiKey();
    
    if (isInitialized())
        return;

    addGlobalStyle(generalCSS);
    addGlobalStyle(buttonCSS);
    addGlobalStyle(formatButtonCSS);
    addGlobalStyle(contentCSS);
    addGlobalStyle(textareaCSS);
    addGlobalStyle(highlightCSS);

    if (isReview)
    {
        observeReviewInfo();
    } else if (isLesson)
    {
        observeLessonTabs(initLesson);
    } else if (isList)
    {
        fillCacheIfExpired();
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

    // call right init functions, after page has changed (without proper reload)
    detectUrlChange(500);

}

export function initLesson(mnemType: MnemType)
{
    if (isInitializedReviewLesson(mnemType))
        return;

    const selector = `h2`
    let headers = document.querySelectorAll<HTMLElement>(selector);
    for (let i=0; i<headers.length; i++)
        if (headers[i].innerText.includes("Notes"))
        {
            addHTMLinEle(headers[i], "<br>", "beforebegin");
            addHTMLinEle(headers[i], getCMdivContent(mnemType), "beforebegin");
            initButtons(mnemType);
            updateCM(undefined, mnemType);
        }

}

export function initReview(mnemType: MnemType)
{
    if (isInitializedReviewLesson(mnemType))
        return;

    // Add before note
    const selector = `#note-${mnemType}`;
    addHTMLinEle(selector, getCMdivContent(mnemType), "beforebegin");

    initButtons(mnemType);

    updateCM(undefined, mnemType);

    /*
    let characterDiv = document.getElementById("character").firstElementChild;
    if (characterDiv != null)
    {
        characterDiv.addEventListener('DOMSubtreeModified', function(){updateCM()});
    }
    else
        console.log("WKCM2: init, character div NOT FOUND");
    */
}

export function initItem()
{
    if (isInitialized())
        return;

    if (getItemType() == "radical")
    {
        addHTMLinEle('.subject-section', getMnemOuterHTMLList(true), "afterend");
    }
    // if (getItemType() != "radical")
    else
    {
        addHTMLinEle('.subject-section--reading', getMnemOuterHTMLList(), "afterend");
        // document.getElementById("cm-reading").innerHTML = getCMdivContent("reading");
        initButtons("reading");
    }

    // document.getElementById("cm-meaning").innerHTML = getCMdivContent("meaning");
    initButtons("meaning");
    updateCM();
}

export function initList()
{
    if (isInitialized())
        return;

    addGlobalStyle(listCSS);
    waitForClass("."+getBadgeClassAvail(true), initHeader, 250);
    waitForClass(`[class*='${getBadgeBaseClass()}']`, addBadgeToItems, 100, 25);
}

/**
 * return true if initialized. False else
 * @param mnemType can be null. If null uses both.
 * @returns 
 */
function isInitialized(mnemType: MnemType|null=null): Boolean
{
    if (mnemType == null)
        return isInitialized("reading") && isInitialized("meaning")

    if (document.querySelector("#wkcm2"))
        return true;
    if (document.querySelector(`#cm-${mnemType}`))
        return true;
    // For list
    if (document.querySelector(".character-item__badge__cm-request"))
        return true;
    if (document.querySelector(".character-item__badge__cm-available"))
        return true;
    return false;
}

function isInitializedReviewLesson(mnemType: MnemType|null=null): Boolean
{
    if (mnemType == null)
        return isInitialized("reading") && isInitialized("meaning")

    if (document.querySelector(`#cm-${mnemType}`))
        return true;
}

// Init ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
