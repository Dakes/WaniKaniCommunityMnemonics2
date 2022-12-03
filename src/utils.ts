/**
 * Miscellaneous utility function used by various functions.
 */

import { devel } from "./const";

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
 */
export function addHTMLinEle(selector: string, html: string, position: InsertPosition="beforeend")
{
    if (selector[0] != "." && selector[1] != "#")
        selector = "#"+selector;
    let ele = document.querySelector(selector);
    if (ele)
        ele.insertAdjacentHTML(position, html);
    
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
    style.type = 'text/css';
    style.innerHTML = css;//css.replace(/;/g, ' !important;');
    head.appendChild(style);
}



