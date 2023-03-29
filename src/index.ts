import { fillCacheIfExpired } from "./cache";
import { isList, isItem, win } from "./const";
import { getCMdivContent, getHeader } from "./html/mnem_div";
import { initButtons, updateCM } from "./mnemonic";
import { getItemType, detectUrlChange, waitForClass} from "./page";
import { setApiKey, setUsername } from "./user";
import { waitForEle, addGlobalStyle } from "./utils";
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
    // Runs checks if elements exist before running init and waits for them. Then calls init.
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

    if (isList)
    {
        fillCacheIfExpired();
        initList();
    }
    else
    {
        infoInjectorInit("meaning");
        infoInjectorInit("reading");
    }

    if (isList || isItem)
        detectUrlChange(500);
}

/**
 * Usese WKItemInfoInjector to inject HTML into page and call init
 * @param mnemType 
 */
export function infoInjectorInit(mnemType: MnemType)
{
    if (isInitialized())
        return;
    let cm_div = document.createElement("div");
    cm_div.innerHTML = getCMdivContent(mnemType);

    // insert HTML Elements
    win.wkItemInfo
        //.on("lesson,lessonQuiz,review,extraStudy,itemPage")
        //.forType("radical,kanji,vocabulary")
        .under(mnemType).spoiling(mnemType)
        .appendSubsection(getHeader(mnemType), cm_div);//, { injectImmediately: true });

    // callback to initialize HTML Elements inserted above
    const wkItemInfoSelector = win.wkItemInfo.on("lesson,lessonQuiz,review,extraStudy,itemPage")
        .forType("radical,kanji,vocabulary").under(mnemType).spoiling(mnemType);
    let notify: Function = wkItemInfoSelector.notifyWhenVisible || wkItemInfoSelector.notify
    // wkItemInfoSelector.notifyWhenVisible(o => {console.log("here")})
    notify(o =>
        {
            // console.log(o);
            waitForEle(`cm-${mnemType}`).then(() =>
            {
                initCM(mnemType);
            })
        }
    );
}

/**
 * initializes Buttons and starts first content update.
 */
function initCM(mnemType: MnemType)
{
    initButtons(mnemType);
    updateCM(undefined, mnemType);
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
        if (getItemType() == "radical")
            return isInitialized("meaning")
        else
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
