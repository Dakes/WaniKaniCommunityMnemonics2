/**
 * Functions to get information about the currently loaded page/item
 */

import { initItem, initLesson, initList, initReview } from ".";
import { isItem, isLesson, isList, isReview, setPageVars } from "./const";
import { getShortItemType } from "./utils";

interface Window {
    // @ts-ignore
    $: JQueryStatic
}

// @ts-ignore
export const { $ } = unsafeWindow;

/**
 * @returns The current item. (説得, stick, etc.)
 */
export function getItem(): string
{
    let item: string|null = null;

    if (isItem)
    {
        item = document.querySelector(".page-header__icon--kanji,.page-header__icon--vocabulary,.page-header__icon--radical,.vocabulary-icon")?.textContent?.trim();
        if (!item)
            item = null
        // image radical case
        if (getShortItemType(getItemType()) === "r" && item == null)
        {
            let radImg = document.querySelector(".radical-image") as HTMLImageElement;
            if (radImg != null && radImg?.alt)
                item = radImg.alt.trim().toLowerCase();
        }
        if (getShortItemType(getItemType()) === "r" && item == null)
            item = decodeURIComponent( window.location.pathname.slice(window.location.pathname.lastIndexOf("/")+1 ) );
    }
    else if (isReview)
    {
        item = $.jStorage.get("currentItem")["characters"];
        // image radical case, two methods, if one breaks
        if (getShortItemType(getItemType()) === "r" && item == null)
        {
            let jstorageEn = $.jStorage.get("currentItem")["en"];
            if (jstorageEn != null)
                item = jstorageEn[0].toLowerCase();
        }
        if (getShortItemType(getItemType()) === "r" && item == null)
        {
            let imgRad = document.querySelector("#item-info-col1 section");
            if (imgRad != null)
                item = imgRad.childNodes[2].textContent.trim().toLowerCase();
        }
    }
    else if (isLesson)
    {
        item = $.jStorage.get("l/currentLesson")["characters"];
        // image radical case
        if (getShortItemType(getItemType()) === "r" && item == null)
        {
            let jstorageEn = $.jStorage.get("l/currentLesson")["en"];
            if (jstorageEn != null)
                item = jstorageEn[0].toLowerCase();
        }
        if (getShortItemType(getItemType()) === "r" && item == null)
        {
            let imgRad = document.querySelector("#meaning");
            if (imgRad != null)
                item = imgRad.textContent.trim().toLowerCase();
        }
        
    }

    if (item == null)
    {
        let msg = "Error: getItem, item is null. ";
        console.log("WKCM2: " + msg);
        // this unfortunately doesn't work. Gets overwritten instantly with "No mnem available"
        // TODO: maybe add flag, that marks the iframe for this item "unupdatable", after an error display
        // updateIframe(null, msg, user=null);
    }

    return item;
}

/**
 * Returns radical, kanji or vocabulary
 * */
export function getItemType(): ItemType
{
    let itemType = null;
    if (isReview)
        itemType = $.jStorage.get("currentItem")["type"];
    else if (isLesson)
        itemType = $.jStorage.get("l/currentLesson")["type"];
    else if (isItem)
        itemType = window.location.pathname.slice(1, window.location.pathname.lastIndexOf("/"));
    else if (isList)
        itemType = window.location.pathname.slice(1);


    
    if (typeof itemType === "string")
        itemType = itemType.toLowerCase()
    if (itemType == null)
        console.log("WKCM2: getItemType, itemType null");
    
    if (itemType === "radicals")
        itemType = "radical";
    
    return itemType;
}

/**
 * When URL changes calls right init function
 * // callback with delay of "delay" ms
 * @param delay delay after URL change, to call functions. 
 * @param callback Optional callback, extra function to execute. 
 */
export function detectUrlChange(delay: number=250, callback: Function=function(){})
{
    const observer = new MutationObserver((mutations) =>
    {
        if (window.location.href !== observerUrl.previousUrl)
        {
            setPageVars();
            observerUrl.previousUrl = window.location.href;

            setTimeout(function () {
                if (isList)
                    initList();
                else if (isItem)
                    initItem();
                callback();
            }, delay);
        }
    });
    const config = { subtree: true, childList: true };

    // start listening to changes
    observer.observe(document, config);
}

namespace observerUrl {
    export let previousUrl = "";
}

/**
 * Reexecutes callback function every "timeout" ms until classname exists.
 * @param selector selector to get element by id or classname
 * @param callback Callback function, that would create element found by selector
 * @param interval 
 */
export function waitForClass(selector: string, callback: Function, interval=250, firstTimeout=0)
{
    if (timer.iter[selector] == undefined)
        timer.iter[selector] = 0;
    // other timer is still running
    if (timer.timer[selector])
        return;

    let callbackWrapper = async function () {
        let timeout = 0;
        let ele = document.querySelector(selector);
        timer.iter[selector]++;
        if (timer.iter[selector] <= 1)
            timeout = firstTimeout;
        if (ele || timer.iter[selector] >= timer.maxIter)
        {
            timer.iter[selector] = 0;
            timer.timer[selector] = clearInterval(timer.timer[selector]);
            return;
        }
        else
            setTimeout(async () => {
                await callback();
            }, timeout);
    };
    timer.timer[selector] = setInterval(callbackWrapper, interval);
}


namespace timer {
    // Array of timers with selector as key
    export let timer: {string?: NodeJS.Timer} = {};
    export let iter: {string?: number} = {};
    export const maxIter = 25;
}

