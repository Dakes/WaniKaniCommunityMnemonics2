/**
 * Functions related to the initialization and usage of WKOF
 * https://community.wanikani.com/t/wanikani-open-framework-developer-thread/22231
 */

import { scriptName, win, WKCM2_version } from "./const";
import { printDev } from "./utils";
import {WKOF, ItemData, Apiv2, Menu, Settings} from "./wkof_types"


declare global {
    interface Window {
        // @ts-ignore
        wkof: WKOF<{ItemData: ItemData, Apiv2: Apiv2, Menu: Menu, Settings: Settings}>
        WaniKani: any
    }
}

// @ts-ignore
export const { wkof } = win;

// Makes sure that WKOF is installed
export async function checkWKOF(): Promise<boolean> {
    if (!wkof)
    {
        let response = confirm(
            `${scriptName} requires WaniKani Open Framework.\nClick "OK" to be forwarded to installation instructions.`,
        )
        if (response) {
            window.location.href =
                'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
        }
        return false;
    }
    return true;
}

export function checkWKOF_old(): boolean
{
    var wkof_version_needed = '1.0.58';
    if (wkof && wkof.version.compare_to(wkof_version_needed) === 'older')
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework version '+wkof_version_needed+'.\nDo you want to be forwarded to the update page?'))
            window.location.href = 'https://greasyfork.org/en/scripts/38582-wanikani-open-framework';
        return false;
    }
    else if (!wkof)
    {
        if (confirm(scriptName + ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?'))
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return false;
    }
    else
        return true;
}

export async function waitForWKOF(): Promise<boolean>
{
    // https://codepen.io/eanbowman/pen/jxqKjJ
    let timeout = 2000;
    let start = Date.now();
    return new Promise(waitForFoo); // set the promise object within the ensureFooIsSet object

    // waitForFoo makes the decision whether the condition is met
    // or not met or the timeout has been exceeded which means
    // this promise will be rejected
    function waitForFoo(resolve, reject): boolean
    {
        
        if (wkof)
            return resolve(true);
        else if (timeout && (Date.now() - start) >= timeout)
            return reject(false);
        else
            setTimeout(waitForFoo.bind(this, resolve, reject), 50);
    }
}

/**
 * checks, if script version saved is the same. If it is not, deletes cache. 
 * */
export function resetWKOFcache(versionCheck=true)
{
    if (versionCheck === false)
    {
        wkof.file_cache.delete(/^wkcm2-/);
        wkof.file_cache.save("wkcm2-version", WKCM2_version);
        return;
    }

    wkof.file_cache.load("wkcm2-version").then(value  =>
    {
        // found
        if (WKCM2_version != value)
        {
            printDev("WKCM2: New version detected. Deleting wkcm2 cache.");
            // regex delete of all wkcm2 saves
            wkof.file_cache.delete(/^wkcm2-/);
            wkof.file_cache.save("wkcm2-version", WKCM2_version);
        }
        return value;
    }, reason =>
    {
        // version not saved, save current version
        wkof.file_cache.save("wkcm2-version", WKCM2_version);
    }
    );
}
