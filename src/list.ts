/**
 * Functions for the item lists
 * (wanikani.com/vocabulary)
 */

import { cacheFillIfExpired } from "./cache";
import { getBadge, getLegendLi } from "./html/list";
import { addHTMLinEle } from "./utils";


export function displayContent()
{
    initHeader();
    cacheFillIfExpired();

    getBadge(false)

}

export function initHeader()
{
    addHTMLinEle(".subject-legend__items", getLegendLi(), "beforeend");
}