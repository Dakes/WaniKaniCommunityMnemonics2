/**
 * Functions to get information about the currently loaded page/item
 */

import { infoInjectorInit, initList } from ".";
import { isItem, isList, setPageVars, win } from "./const";
import { updateIframe } from "./html/iframe";
import { getMedItemType } from "./utils";
import { ItemData } from "./wkof_types";
import Item = ItemData.Item;


/**
 * @returns The current item. (説得, stick, etc.)
 */
export function getItem(): string {
  let item: string | null = null;

  item = win.wkItemInfo.currentState.characters;
  if (item == undefined)
    item = win.wkItemInfo.currentState.meaning[0].toLowerCase()

  if (item == null) {
    let msg = "Error: getItem, item is null. ";
    console.log("WKCM2: " + msg);
    // TODO: maybe add flag, that marks the iframe for this item "unupdatable", after an error display
    updateIframe(null, msg, null);
  }
  return item;
}

/**
 * Returns radical, kanji or vocabulary
 * */
export function getItemType(): ItemType {
  let itemType: string;
  if (isList)
    itemType = window.location.pathname.slice(1);
  else
    itemType = win.wkItemInfo.currentState.type

  if (itemType == null) {
    console.error("WKCM2: getItemType, itemType null");
    return null;
  }

  if (itemType.toLowerCase().includes("vocabulary"))
    itemType = "vocabulary";

  if (itemType === "radicals")
    itemType = "radical";

  return itemType as ItemType;
}

/**
 * When URL changes calls right init function
 * // callback with delay of "delay" ms
 * @param delay delay after URL change, to call functions.
 * @param callback Optional callback, extra function to execute.
 */
export function detectUrlChange(delay: number = 250, callback: Function = function () {
}) {
  const observer = new MutationObserver((mutations) => {
    if (window.location.href !== observerUrl.previousUrl) {
      setPageVars();
      observerUrl.previousUrl = window.location.href;

      setTimeout(function () {
        if (isList)
          initList();
        else if (isItem) {
          infoInjectorInit("meaning");
          if (getItemType() != "radical")
            infoInjectorInit("reading");

        }
        callback();
      }, delay);
    }
  });
  const config   = { subtree: true, childList: true };

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
export function waitForClass(selector: string, callback: Function, interval = 250, firstTimeout = 0) {
  if (timer.iter[selector] == undefined)
    timer.iter[selector] = 0;
  // other timer is still running
  if (timer.timer[selector])
    return;

  let callbackWrapper   = async function () {
    let timeout = 0;
    let ele     = document.querySelector(selector);
    timer.iter[selector]++;
    if (timer.iter[selector] <= 1)
      timeout = firstTimeout;
    if (ele || timer.iter[selector] >= timer.maxIter) {
      timer.iter[selector]  = 0;
      timer.timer[selector] = clearInterval(timer.timer[selector]);
      return;
    } else
      setTimeout(async () => {
        await callback();
      }, timeout);
  };
  timer.timer[selector] = setInterval(callbackWrapper, interval);
}


namespace timer {
  // Array of timers with selector as key
  export let timer: { string?: number } = {};
  export let iter: { string?: number }  = {};
  export const maxIter                  = 25;
}

/**
 * Observe if meaning/reading tabs are activated in Lessons
 * @param callback requires param MnemType. Initializes HTML
 */
export function observeLessonTabs(callback: Function) {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      let ele = mutation.target as HTMLElement;
      if (ele.id.includes("supplement-") && mutation.addedNodes.length != 0) {
        let addedNode = mutation.addedNodes[0] as HTMLElement;
        if (addedNode.id.includes("meaning")) {
          callback("meaning");
        } else if (addedNode.id.includes("reading")) {
          callback("reading");
        }
      }
    });
  });

  const target = document.getElementById(`supplement-${getMedItemType(getItemType())}`);
  observer.observe(target,
    { attributes: false, childList: true, subtree: true }
  );
}
