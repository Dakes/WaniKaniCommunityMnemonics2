/**
 * Miscellaneous utility function used by various functions.
 */

import { devel } from "./const";
import { getItemType } from "./page";

/**
 * calls console.log only when global devel variable is true
 * */
export function printDev(...params: any[])
{
    if (devel)
        console.log(...params);
}

/**
 * converts kanji -> k etc.
 * */
export function getShortItemType(type: ItemTypeAny): ItemTypeShort
{
    return getItemTypeLen(type, 1) as ItemTypeShort;
}

export function getMedItemType(type: ItemTypeAny): ItemTypeMed
{
    return getItemTypeLen(type, 3) as ItemTypeMed;
}

function getItemTypeLen(type: ItemTypeAny, len: Number=99): ItemType
{
    if (type === "kanji" || type === "k" || type === "kan")  // @ts-ignore
        return "kanji".substring(0, len)
    else if (type === "vocabulary" || type === "v" || type === "voc")  // @ts-ignore
        return "vocabulary".substring(0, len)
    else if (type === "radical" || type === "r" || type === "rad")  // @ts-ignore
        return "radical".substring(0, len)
    else
        throw new Error("WKCM2: getShortItemType got wrong ItemType: "+type);
}

/**
 * converts meaning -> m, reading -> r
 * */
export function getShortMnemType(type: MnemTypeAny): MnemTypeShort
{
    if (type === "reading" || type === "r")
        return "r"
    else if (type === "meaning" || type === "m")
        return "m"
    else
        throw new Error("WKCM2: getShortMnemType got wrong ItemType: "+type);
}

export function getFullMnemType(mnemType: MnemTypeAny): MnemType
{
    let fullMnemType: MnemType;
    if (mnemType == "m" || mnemType == "meaning")
        fullMnemType = "meaning";
    else if (mnemType == "r" || mnemType == "reading")
        fullMnemType = "reading";
    else
        throw new TypeError("mnemType in getFullMnemType is not valid. Value: " + mnemType);
    return fullMnemType;
}

export function addClass(id: string, className="disabled"): boolean
{
    let ele = document.getElementById(id);
    if(ele == null)
        return false;
    ele.classList.add(className);
    return true;
}

export function removeClass(id: string, className="disabled"): boolean
{
    let ele = document.getElementById(id);
    if(!ele)
        return false;
    ele.classList.remove(className);
    return true;
}

export const memoize = <T = any>(fn) => {
  const cache = new Map();
  const cached = function (this: any, val?: T|undefined) {
    return cache.has(val)
      ? cache.get(val)
      : cache.set(val, fn.call(this, val)) && cache.get(val);
  };
  cached.cache = cache;
  return cached;
};

/**
 * Adds a Event Listener for a click event to the element with id id.
 * */
export function addClickEvent(id: string, func: Function, params: any[])
{
    let div = document.getElementById(id);
    if (div)
        div.addEventListener("click", function() {func(...params);}, false);
}

/**
 * Adds the given HTML to an element searched by the querySelector search query. Checks, if the element exists.
 * @param eleOrSel Selector of element to add code to, or element directly.
 * @param html HTML to add
 * @param position InsertPosition. default: beforeend (Inside at end)
 */
export function addHTMLinEle(eleOrSel: string|HTMLElement, html: string, 
    position: InsertPosition="beforeend")
{
    let element: HTMLElement;
    if (typeof eleOrSel == "string")
    {
        if (eleOrSel[0] != "." && eleOrSel[0] != "#" && eleOrSel[1] != "#")
            eleOrSel = "#"+eleOrSel;
        element = document.querySelector(eleOrSel);
    }
    else
    {
        element = eleOrSel;
    }
    if (element)
        element.insertAdjacentHTML(position, html);
}

export function waitForEle(id: string): Promise<HTMLElement>
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
export function addGlobalStyle(css: string)
{
    let head = document.getElementsByTagName('head')[0];
    if (!head)
        return;
    let style = document.createElement('style');
    style.innerHTML = css;//css.replace(/;/g, ' !important;');
    head.appendChild(style);
}

export function getPossibleMnemTypes(): MnemType[]
{
    if (getItemType() == "radical")
        return ["meaning"];
    return ["meaning", "reading"];
}

