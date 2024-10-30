/**
 * Functions related to local data update and processing
 */

import * as api from "./api";
import { cacheExpired, deleteCacheItem, getCacheId } from "./cache";
import { updateCM } from "./mnemonic";
import { getItem, getItemType } from "./page";
import { printDev } from "./utils";
import { wkof } from "./wkof";


/**
 * Update the displayed Mnemonic & cache in the background.
 * If a new one is available. If no new one is available does noting.
 * @param item item to update (星). Will be set if null.
 * @param item type of item (kanji) Will be set if null.
 * @param cachedData old data json (currently in cache) will be updated, if new version is different.
 * @param wait number of ms to wait with execution, or false. (Because after insertion into sheet it takes a moment for the updated version to be returned. Annoyingly even when using promises. )
 * */
export async function dataBackgroundUpdate(item: string | null = null, type: ItemTypeAny | null = null,
                                           cachedData: DataJson | null                          = null, wait             = false) {
  if (wait && typeof wait == "number") {
    setTimeout(function () {
      dataBackgroundUpdate(item, type, cachedData, wait = false);
    }, wait);
    return;
  }

  if (item == null)
    item = getItem();
  if (type == null)
    type = getItemType();

  let identifier = getCacheId(item, type);
  if (cacheExpired(identifier)) {
    api.getItemApi(item, type).then(responseJson => {
      // fetch worked
      // wkof.file_cache.save(identifier, responseJson);
      let reponseJsonCopy = JSON.parse(JSON.stringify(responseJson));

      // updateCM(reponseJsonCopy);

      if (!isEqualsJson(cachedData, responseJson)) {
        wkof.file_cache.save(identifier, responseJson);
        updateCM(reponseJsonCopy);
      }

      return responseJson;
    }).catch(reason => {
      // fetch failed
      // TODO: handle failed fetch
      console.log("WKCM2: Error, dataBackgroundUpdate, Fetch of data from spreadsheet failed: " + reason);
    });
  }
}

// dataBackgroundUpdate ▲

/**
 * Update the displayed Mnemonic & cache. It will be called after an submission to the sheet.
 * So compared to dataBackgroundUpdate it expects an update, and will repeat the fetch a few times, until it gives up.
 * After the insertion into the sheet it takes a few moments (~1-2s) until the new data is returned.
 * @param item item to update (星). Will be set if null.
 * @param type of item (kanji) Will be set if null.
 * @param cachedData old data json (currently in cache) will be updated, if new version is different. Will be set if false.
 * @param tries number of times to retry before giving up, waits "wait"ms between executions.
 * @param wait number of ms to wait with execution, or false. (Because after insertion into sheet it takes a moment for the updated version to be returned. Annoyingly even when using promises. )
 * @param index Index to use for displayed mnemonic. So user sees their changed mnem directly after submission. Should only be used togetcher with mnemType.
 * @param mnemType just as index, mnemType to pass through.
 * */
export function dataUpdateAfterInsert(item: string | null                                                           = null, type: ItemType | null = null,
                                      cachedData: DataJson | boolean | null = false, tries = 10, wait = 1000, index = 0,
                                      mnemType: MnemType | undefined                                                = undefined): Promise<void> {
  if (tries < 0) {
    console.log("WKCM2: dataUpdateAfterInsert, Maximum number of tries reached, giving up. Currently displayed Mnemonic will not be updated. ");
    updateCM(undefined, mnemType, index);
    return Promise.resolve();
  }
  if (item == null)
    item = getItem();
  if (type == null)
    type = getItemType();
  let identifier = getCacheId(item, type);

  if (cachedData === false) {
    wkof.file_cache.load(identifier).then(cachedData =>
      dataUpdateAfterInsert(item, type, cachedData, tries, wait, index, mnemType))
    .catch(err => {
      printDev("WKCM2: dataUpdateAfterInsert, cache miss: ", err);
      dataUpdateAfterInsert(item, type, null, tries, wait, index, mnemType);
    });
    return Promise.resolve();
  } else if (typeof cachedData != "boolean") {
    api.getItemApi(item, type).then(responseJson => {
      // fetch worked
      let reponseJsonCopy = JSON.parse(JSON.stringify(responseJson));
      // @ts-ignore
      if (!isEqualsJson(cachedData, responseJson)) {
        wkof.file_cache.save(identifier, responseJson);
        updateCM(reponseJsonCopy, mnemType, index);
      } else {
        // retry after "wait" ms
        setTimeout(function () {
          dataUpdateAfterInsert(item, type, cachedData, --tries, wait + 250, index, mnemType);
        }, wait);
      }

    }).catch(reason => {
      // fetch failed
      // TODO: handle failed fetch
      console.log("WKCM2: Error, dataUpdateAfterInsert, Fetch of data from spreadsheet failed: " + reason);
    });
  }

}

// dataUpdateAfterInsert ▲


/**
 * wraps JSON.parse
 * @return JSON, null if invalid
 * */
export function jsonParse(jsonString: string): MnemJson | ScoreJson | VotesJson | null {
  let newJson: MnemJson | ScoreJson | VotesJson | null = null;
  if (jsonString != "" && typeof jsonString == "string") {
    try {
      newJson = JSON.parse(jsonString);
      if (jsonParse.refetchCounter > 0)
        jsonParse.refetchCounter = 0;

    } catch (err) {
      console.log("WKCM2: jsonParse, got invalid json string: ", jsonString);
      // sometimes fetch was faster then score calculation => #ERROR!
      // if found retry. But only a few times. (There may really be #ERROR! in DB)
      if (jsonString.includes("#ERROR!") || jsonString.includes("#NAME?")) {
        if (jsonParse.refetchCounter < 5)
          deleteCacheItem().then(r => {
            api.getData();
            jsonParse.refetchCounter++;
          });
      }
    }
  }
  // for consistency if empty json, convert to null
  if (newJson != null)
    if (typeof newJson == "object")
      if (Object.keys(newJson).length == 0)
        newJson = null;
  return newJson;
}

export namespace jsonParse {
  export let refetchCounter = 0;
}

export function isEqualsJson(obj1: null | WKCMJson, obj2: null | WKCMJson): boolean {
  if (obj1 == null && obj2 == null)
    return true;
  else if (obj1 == null || obj2 == null)
    return false;
  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);

  //return true when the two json has same length and all the properties has same value key by key
  return keys1.length === keys2.length && Object.keys(obj1).every(key => obj1[key] == obj2[key]);
}

export function hasRequest(dataJson: DataJson | null): boolean {
  if (dataJson == null)
    return false;
  if (dataJson["Meaning_Mnem"][2] == "!")
    return true
  if (dataJson["Reading_Mnem"][2] == "!")
    return true
  return false
}

export function mnemAvailable(dataJson: DataJson | null): boolean {
  if (dataJson == null)
    return false;
  if (dataJson["Meaning_Mnem"][2] && dataJson["Meaning_Mnem"][2] != "!")
    return true
  if (dataJson["Reading_Mnem"][2] && dataJson["Reading_Mnem"][2] != "!")
    return true
  return false
}


/**
 * Functions for Escaping/Unescaping User content.
 * Or generating Strings with User content.
 */
export class Escaping {
  /**
   * Replace stuff, that should not land in DB. Or maybe unintended input by user.
   * Technically redundant, since this is handled better by apps script.
   * */
  static replaceInNewMnem(text: string): string {
    // is handled by insertion apps script as well.
    // replace newlines with markup
    text = text.replace(/\n/g, '[n]').replace(/\r/g, '[n]');
    return text;
  }

  /**
   * Replace custom markup with actual HTML tags for highlighting.
   * Those are the only HTML tags, that should land in the iframe.
   * */
  static replaceMarkup(text: string): string {
    const list = [ "b", "i", "u", "s", "br" ];
    for (const ele of list) {
      text = text.replaceAll("[" + ele + "]", "<" + ele + ">");
      text = text.replaceAll("[/" + ele + "]", "</" + ele + ">");
    }

    // [/span] used as closing tag for legacy data in db.
    text = text.replaceAll("[/span]", `</span>`);
    text = text.replaceAll("[kan]", `<span class="cm-kanji">`);
    text = text.replaceAll("[/kan]", `</span>`);
    text = text.replaceAll("[voc]", `<span class="cm-vocabulary">`);
    text = text.replaceAll("[/voc]", `</span>`);
    text = text.replaceAll("[rad]", `<span class="cm-radical">`);
    text = text.replaceAll("[/rad]", `</span>`);
    text = text.replaceAll("[read]", `<span class="cm-reading">`);
    text = text.replaceAll("[/read]", `</span>`);
    text = text.replaceAll("[request]", `<span class="cm-request">`);
    text = text.replaceAll("[/request]", `</span>`);

    text = text.replaceAll("[n]", `<br>`);
    text = text.replaceAll("[br]", `<br>`);
    // legacy replace \n, that are already in the DB. (saved literally as \\n)
    text = text.replaceAll("\n", `<br>`);
    text = text.replaceAll("\\n", `<br>`);

    return text;
  }

  static getUserProfileLink(user: string): string {
    // Don't give Anonymous a profile link
    if (typeof user != "string" || user == "")
      return "";
    if (user == "Anonymous")
      return `<a>Anonymous</a>`;
    else if (user == "!")
      return "";
    else
      return `<a href="https://www.wanikani.com/users/${user}" target="_blank" >${user}</a>`;
  }
}

