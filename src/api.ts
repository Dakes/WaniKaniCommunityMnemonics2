/**
 * Functions related to fetching and pulling data to and from the Google Sheets API.
 */

import { cacheExpired, getCacheId } from "./cache";
import { CACHE_DAY_MAX_AGE, SHEET_API_URL } from "./const";
import { dataBackgroundUpdate } from "./data";
import { currentMnem, updateCM } from "./mnemonic";
import { getItem, getItemType } from "./page";
import { userApiKey, WKUser } from "./user";
import { getShortItemType, getShortMnemType, printDev } from "./utils";
import { wkof } from "./wkof";


/**
 * Abstraction layer from direct data fetch,
 * to make use of caches to make the script more responsive.
 * @param item Current Item. Optional, gets it if not given.
 * @param type Current Item Type (short), optional. gets it if not given.
 * @param fetchOnMiss False: default. Refetch from API on cache miss.
 * If false, interprets cache miss as not in DB and fills cache with null.
 * @returns Promise resolving to DataJson or null.
 */
export async function getData(item?: string, type?: ItemTypeShort, fetchOnMiss = false): Promise<DataJson | null> {
  if (type == undefined)
    type = getShortItemType(getItemType());
  if (item == undefined || item == "")
    item = getItem();

  if (item == null || type == null) {
    throw new Error("WKCM2: getData, item or type is null. " + item + type);
  }
  let identifier = getCacheId(item, type);

  // get from wkof cache
  return wkof.file_cache.load(identifier).then((value: DataJson) => {
      // cache hit
      // return from cache
      printDev("Cache hit for", identifier, value);
      getData.misses = 0;

      if (cacheExpired(identifier, CACHE_DAY_MAX_AGE))
        dataBackgroundUpdate(item, type, value);

      return value;
    }, async (reason: string) => {
      // cache miss
      if (!fetchOnMiss) {
        await wkof.file_cache.save(identifier, null);
        return null;
      }
      // fetch data from db, put in cache and return
      // ? maybe remove? is not used anyway

      getData.misses++;
      // protection against deadlock "just in case" something somewhere else at some point breaks.
      if (getData.misses > 1) {
        printDev("WKCM2: There was a problem with fetching the Mnemonic Data. ", reason);
        if (getData.misses > 10)
          throw new Error("WKCM2: There was a problem with fetching the Mnemonic Data.: " + reason);
        return null;
      }
      printDev("Cache miss for", reason);

      try {
        const responseJson = await getItemApi(item, type);
        // fetch worked
        await wkof.file_cache.save(identifier, responseJson);
        let responseJsonCopy = JSON.parse(JSON.stringify(responseJson));

        // only toggle visual update if the original item is still displayed.
        let curTyIt  = getShortItemType(getItemType()) + getItem();
        let prevTyIt = getShortItemType(type) + item;
        if (curTyIt == prevTyIt)
          updateCM(responseJsonCopy);
        return responseJson;
      } catch (reason_1) {
        // fetch failed
        // TODO: handle failed fetch
        console.log("WKCM2: Error, getData, Fetch of data from spreadsheet failed: " + reason_1);
        return null;
      }
    }
  );
}

export namespace getData {
  // static miss counter, to protect from infinite cache miss loop (only triggered when an error with the apps script exists)
  export let misses: number = 0;
}

/**
 * Fetch data from Sheet. Returned as json.
 * @param item required. kanji, vocabluary or radical string
 * @param type k, v, r or empty string to fetch all for that item
 * */
export async function getItemApi(item: string, type: ItemTypeAny): Promise<DataJson | null> {
  // TODO: sleep between failed fetches???
  let shortType = getShortItemType(type);
  let url       = SHEET_API_URL + `?item=${item}&type=${shortType}&exec=get`;
  url           = encodeURI(url);
  return fetch(url, { method: "GET", redirect: "follow" })
    .then(response => response.json()).catch(reason => {
      console.log("WKCM2: fetchData failed: " + reason);
      return null;
    })
    .then((responseJson) => {
        if (responseJson == null)
          return null;
        else {
          // Object.keys... .length on "" is 0. neat
          if (Object.keys(responseJson["Meaning_Mnem"]).length == 0 || responseJson["Meaning_Mnem"] == "{}")
            if (Object.keys(responseJson["Reading_Mnem"]).length == 0 || responseJson["Reading_Mnem"] == "{}")
              return null;
          return responseJson;
        }
      }
    );
}

export async function getAllApi(): Promise<Object | null> {
  let url = SHEET_API_URL + `?exec=getall`;
  url     = encodeURI(url);
  return fetch(url, { method: "GET", redirect: "follow" })
    .then(response => {
      return response.json();
    }).catch(reason => {
      console.log("WKCM2: fillCache failed: ", reason);
      return null;
    });
}

export async function submitMnemonic(mnemType: MnemType, item: string,
                                     shortType: ItemTypeShort, mnemIndexDB: number, newMnem: string): Promise<Response> {
  let shortMnemType = getShortMnemType(mnemType);
  newMnem           = encodeURIComponent(newMnem);
  let url           = SHEET_API_URL +
    `?exec=put&item=${item}&type=${shortType}&apiKey=${
      encodeURIComponent(userApiKey)}&mnemType=${shortMnemType}&mnemIndex=${
      mnemIndexDB}&mnem=${newMnem}`;

  return fetch(url, { method: "POST", redirect: "follow" });
}

export async function voteMnemonic(mnemType: MnemType, item: string,
                                   shortType: ItemTypeShort, vote: number): Promise<Response> {
  let shortMnemType = getShortMnemType(mnemType);
  let url           = SHEET_API_URL +
    `?exec=vote&item=${item}&type=${shortType}&mnemType=${shortMnemType}&apiKey=${
      userApiKey}&mnemUser=${currentMnem.currentUser[mnemType]}&mnemIndex=${
      currentMnem.userIndex[mnemType]}&vote=${vote}`;
  url               = encodeURI(url);
  return fetch(url, { method: "POST", redirect: "follow" });
}

export async function requestMnemonic(mnemType: MnemType, item: string,
                                      shortType: ItemTypeShort) {
  let shortMnemType = getShortMnemType(mnemType);

  let url = SHEET_API_URL + `?exec=request&item=${item}&type=${shortType}&apiKey=${
    userApiKey}&mnemType=${shortMnemType}`;
  url     = encodeURI(url);
  return fetch(url, { method: "POST", redirect: "follow" });
}

export async function deleteMnemonic(mnemType: MnemType, item: string,
                                     shortType: ItemTypeShort): Promise<Response> {
  if (currentMnem.currentUser[mnemType] != WKUser)
    return;
  let shortMnemType = getShortMnemType(mnemType);
  let url           = SHEET_API_URL +
    `?exec=del&item=${item}&type=${shortType}&mnemType=${shortMnemType}&apiKey=${
      userApiKey}&mnemIndex=${currentMnem.userIndex[mnemType]}`;
  url               = encodeURI(url);
  return fetch(url, { method: "POST", redirect: "follow" });
}