/**
 * Functions to get information about the currently loaded page/item
 */

import { isItem, isLesson, isReview } from "./const";
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
 * // @param short with short=true returns r, k or v
 * */
export function getItemType(/*short: boolean=true*/): ItemType
{
    let itemType = null;
    if (isReview)
        itemType = $.jStorage.get("currentItem")["type"];
    else if (isLesson)
        itemType = $.jStorage.get("l/currentLesson")["type"];
    else if (isItem)
    {
        itemType = window.location.pathname.slice(
            window.location.pathname.indexOf("com/") + 2,
            window.location.pathname.lastIndexOf("/")
        )
        if (itemType === "radicals")
            itemType = "radical";
    }

    
    if (typeof itemType === "string")
        itemType = itemType.toLowerCase()
    if (itemType == null)
        console.log("WKCM2: getItemType, itemType null");
    
    // if (short)
        // return getShortItemType(itemType);
    // else
    return itemType;
}

