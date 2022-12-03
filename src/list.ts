/**
 * Functions for the item lists
 * (wanikani.com/vocabulary)
 */

import { getItemType } from "./page";

interface Window {
    // @ts-ignore
    $: JQueryStatic
}

// @ts-ignore
export const { $ } = unsafeWindow;

/**
 * Returns new elements for the legend on item list pages (.../kanji/, .../level/)
 * */
export function getCMLegend(isReq) {
    // TODO: get rid of jquery, replace with my own code.
    return $('<li><div><span class="commnem' + ((isReq) ? "-req" : "") + '" lang="ja">共</span></div>' + ((isReq) ? "Mnemonic Requested" : "Community Mnemonics") + '</li>');
}

/**
 * Returns a badge for items in lists, whether a Mnemonic is available or requested
 * */
export function getCMBadge(isRecent, isReq) {
    // TODO: get rid of jquery, replace with my own code.
    return $('<span lang="ja" ' + ((isRecent) ? ' style="top: ' + ((getItemType() == "kanji") ? '2.25em" ' : '1em" ') : '') + 'class="item-badge commnem-badge' + ((isReq) ? "-req" : "") + '"></span>');
}