/**
 * Functions related to cache access update etc.
 */

import * as api from "./api";
import { cacheFillIdent, cacheDayMaxAge, WKCM2_version } from "./const";
import { getItemType, getItem } from "./page";
import { getShortItemType, printDev } from "./utils";
import { resetWKOFcache, wkof } from "./wkof";

// caching happens in getData using WaniKani Open Framework's wkof.file_cache
export function getCacheId(item: string, type)
{
    type = getShortItemType(type);
    return "wkcm2-" + type + item;
}

/**
 * @param identifier wkof.file_cache identifier
 * @param maxAge Age of cache to compare against in days.
 * @return true if older than daydiff, else false
 * */
export function cacheExpired(identifier: string, maxAge: number=cacheDayMaxAge)
{
    // 86400000ms == 1d
    let cachedDate = 0;
    try
    {
        if (wkof.file_cache.dir[identifier] === undefined)
            return true;
        cachedDate = Date.parse(wkof.file_cache.dir[identifier]["added"]);
    }
    catch (err)
    {
        console.log("WKCM2: cacheAgeOlder, ", err);
        return true;
    }
    let cacheAge = Math.floor((Date.now() - cachedDate) / 86400000);
    if (cacheAge > maxAge)
        return true
    else
        return false;
}

/**
 * Only fills cache, if cache is expired. 
 * */
export function cacheFillIfExpired()
{
    wkof.file_cache.load(cacheFillIdent).then(value  =>
        {
            // found
            if (cacheExpired(cacheFillIdent, cacheDayMaxAge))
            {
                printDev(`WKCM2: Last complete cache fill older than ${cacheDayMaxAge} days. Refilling Cache. `);
                // regex; delete whole wkcm2 cache
                wkof.file_cache.delete(/^wkcm2-/);
                fillCache();
                wkof.file_cache.save("wkcm2-version", WKCM2_version);
            }
        }, reason =>
        {
            fillCache();
        }
    );
}

/**
 * Fills the cache with all available items.
 * Deletes the current wkcm cache
 * runs async. in the background.
 * NOTE: Items, that are not in the DB are not fetched by getall. So they still are uncached.
 * But the No mnem available message is displayed prematurely, so it should be fine.
 * */
export async function fillCache()
{
    api.getAll().then((responseJson)=>
        {
            if (responseJson == null)
                return null;
            else
            {
                resetWKOFcache(false);
                for (let typeItem in responseJson)
                {
                    let identifier = getCacheId(responseJson[typeItem]["Item"], responseJson[typeItem]["Type"]);
                    wkof.file_cache.save(identifier, responseJson[typeItem]);
                }
                wkof.file_cache.save(cacheFillIdent, "Cache Filled");
            }
        }
    ).catch(err => console.log("WKCM2: fillCache, ", err) );
}

export async function deleteCacheItem(item?: string, type?: ItemTypeShort)
{
    if (type == undefined)
        type = getShortItemType(getItemType());
    if (item == undefined || item == "")
        item = getItem();
    let identifier = getCacheId(item, type);
    return wkof.file_cache.delete(identifier);
}

