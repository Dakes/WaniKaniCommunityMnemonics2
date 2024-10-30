/**
 * Global constant values
 */

export const WKCM2_VERSION  = "0.3.3";
export const SCRIPT_NAME      = 'WKCM2';
export const SCRIPT_NAME_LONG = 'WaniKani Community Mnemonics 2';

// Google sheet: https://docs.google.com/spreadsheets/d/13oZkp8eS059nxsYc6fOJNC3PjXVnFvUC8ntRt8fdoCs/edit?usp=sharing
// google sheets apps script url, for sheet access
export const SHEET_API_URL = "https://script.google.com/macros/s/AKfycby_Kqff92G40TGXr0PSulvQ2gqx6bkHVEl6LplZ-zc5ZIHhJGwe7AA8I4nDErKMiu2GEw/exec";

// "https://script.google.com/macros/s/AKfycbxCxmHz_5ibnHn0un5HxaCLeJTRHxwdrS5fW4nmXBYXyA-Jw6aDPPrrHWrieir3B8kDFQ/exec";

// Maximum number, how many mnemonics one user can submit for one item.
export const MNEM_MAX_COUNT = 5;

// If date of cached item is older than this number of days, re-fetch.
// NOTE: If too many people use WKCM2, it might be necessary to turn this up, so the API doesn't get spammed with requests.
export const CACHE_DAY_MAX_AGE = 7;
// Only execute getall, if last getall is older than this number of days.
export const GET_ALL_CACHE_MAX_AGE = 60;

export const CACHE_FILL_IDENTIFIER = "wkcm2-fillCache";

// getData refetch timeout. How long to wait with new execution of updateCM after previous getData fetch.
// Especially, if the apps script is overloaded it can take a while (~5s). So it has to be enough time,
// to allow for the data to arrive and prevent spamming of the apps script.
export const REFETCH_TIMEOUT = 10_000;  // in ms

// whether to use console logs
export const DEVEL = false;

export let isList = false;
export let isItem = false;

// @ts-ignore;  A wrapper for the window, because unsafeWindow doesn't work in Firefox
// @ts-ignore;  and window does not have access to wkof in some browsers?? (How even? idk, it worked before)
export let win: Window = typeof unsafeWindow != 'undefined' ? unsafeWindow : window;

export function setPageVars() {
  isList = (
    // true if on a level page
    /level\/[0-9]{1,3}/gi.test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2)) ||
    // true if on a /kanji?difficulty=pleasant site
    /(kanji|vocabulary|radicals)\?(difficulty=[A-Za-z].*)/gi
    .test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2) + window.location.search)
  );

  isItem = /(kanji|vocabulary|radicals)\/.*/gi
  .test(window.location.pathname.slice(window.location.pathname.indexOf("com/") + 2));
}

setPageVars();

