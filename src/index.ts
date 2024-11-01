import { fillCacheIfExpired } from "./cache";
import { isItem, isList, win } from "./const";
import { getCMdivContent, getHeader } from "./html/mnem_div";
import { initButtons, updateCM } from "./mnemonic";
import { detectUrlChange, getItemType, waitForClass } from "./page";
import { setApiKey, setUsername } from "./user";
import { sleep, waitForEle } from "./utils";
import { checkWKOF_old, resetWKOFcache, waitForWKOF, wkof } from "./wkof";
import { getBadgeBaseClass, getBadgeClassAvail } from "./html/list";

import { addBadgeToItems, initHeader } from "./list";

import "./css/general.scss"
import "./css/list.scss"
import "./css/button.scss"
import "./css/formatButton.scss"
import "./css/textarea.scss"
import "./css/content.scss"
import "./css/highlight.scss"

run();

// all code runs from here
function run() {
  // Runs checks if elements exist before running init and waits for them. Then calls init.
  waitForWKOF().then(exists => {
    if (exists) {
      wkof.include('Apiv2').then(() => {
        wkof.ready('Apiv2').then(() => {
          init();
        });
      });
    } else
      console.log("WKCM2: there was a problem with checking for wkof. Please check if it is installed correctly and running. ");
  }).catch(exists => {
    console.log("WKCM2: ERROR. WKOF not found.");
    checkWKOF_old();
  })
}

// Init ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

/**
 * Runs the right code depending if the current page is Lesson, Review or List
 * */
function init() {
  // resets cache on new version of WKCM2
  resetWKOFcache();
  // refills whole cache, if not already filled or old.
  fillCacheIfExpired();
  setUsername();
  setApiKey();

  if (isInitialized())
    return;

  if (isList) {
    fillCacheIfExpired();
    initList();
  } else {
    void infoInjectorInit("meaning");
    void infoInjectorInit("reading");
  }

  if (isList || isItem)
    detectUrlChange(500);
}

/**
 * Usese WKItemInfoInjector to inject HTML into page and call init
 * @param mnemType
 */
export async function infoInjectorInit(mnemType: MnemType) {
  if (isInitialized())
    return;
  await sleep(100);

  let cm_div       = document.createElement("div");
  cm_div.innerHTML = getCMdivContent(mnemType);

  // Create a handle for this injection
  const handle = win.wkItemInfo
    .under(mnemType)
    .spoiling(mnemType)
    .appendSubsection(getHeader(mnemType), cm_div);

  if (handle) {
    // Set up notification using the same selector configuration
    const wkItemInfoSelector = win.wkItemInfo
      .under(mnemType)
      .spoiling(mnemType);

    let notify: Function = wkItemInfoSelector.notifyWhenVisible || wkItemInfoSelector.notify;
    notify(o => {
      waitForEle(`cm-${mnemType}`).then(() => {
        initCM(mnemType);
      });
    });
  }
}

/**
 * initializes Buttons and starts first content update.
 */
function initCM(mnemType: MnemType) {
  initButtons(mnemType);
  updateCM(undefined, mnemType);
}

export function initList() {
  if (isInitialized())
    return;

  waitForClass("." + getBadgeClassAvail(true), initHeader, 250);
  waitForClass(`[class*='${getBadgeBaseClass()}']`, addBadgeToItems, 100, 25);
}

/**
 * return true if initialized. False else
 * @param mnemType can be null. If null uses both.
 * @returns
 */
function isInitialized(mnemType: MnemType | null = null): Boolean {
  if (!isList) {
    if (mnemType == null)
      if (getItemType() == "radical")
        return isInitialized("meaning")
      else
        return isInitialized("reading") && isInitialized("meaning")

    if (document.querySelector("#wkcm2"))
      return true;
    if (document.querySelector(`#cm-${mnemType}`))
      return true;
  } else  // For list
  {
    if (document.querySelector(".wkcm-list-badge-cm-request"))
      return true;
    if (document.querySelector(".wkcm-list-badge-cm-available"))
      return true;
  }
  return false;
}
