/**
 * Functions related to the update of displayed mnemonics
 * and the fetch of data belonging to displayed mnemonics
 */

import { mnemMaxCount, refetchTimeout, sheetApiUrl } from "./const";
import { dataUpdateAfterInsert, Escaping, jsonParse } from "./data";
import { getInitialIframe, updateIframe } from "./html/iframe";
import { setScore, Buttons } from "./html/mnem_div";
import { getItemType, getItem } from "./page";
import { getRadicalReadingMessage, getNoMnemMsg, getMnemRequestedMsg, decodeHTMLEntities } from "./text";
import { WKUser } from "./user";
import { removeClass, addClass, getShortItemType, getShortMnemType, addClickEvent, getFullMnemType, printDev } from "./utils";
import * as api from "./api";


// Namespaces for global variables
export namespace currentMnem
{
    // currentMnem.mnem saves the last refreshed mnem globally for edit & save functions
    // Reading from HTML doesn't really work, because characters have been unescaped.
    export let mnem = {};
    // Index of active mnem, of all mnems. (update & vote) {meaning: 0, reading: 0}
    export let mnemIndex = {};
    // user of currently displayed mnem. (edit & vote)
    export let currentUser = {};
    // Index of active mnem, of the (author) users mnems. (editSave) {meaning: 0, reading: 0}
    export let userIndex = {};
}

/**
 * fetches Data, if not given. Will update at index given. updates both given mnemTypes, or just one, if string.
 * Then calls updateCMelements, which does the visual update of the content and buttons and stuff.
 * @param dataJson needed to bypass recursive getMnemonic call, once data got loaded. 
 * False because it can be null, when no mnem is available. False: refetch from API
 * @param mnemType array by default to make calling the function more convenient. Will be executed for both values in array.
 * @param index index of Mnem to use
 * */
export function updateCM(dataJson:boolean|DataJson|null=false,
    mnemType:MnemType[]|MnemType =["meaning", "reading"], index=0)
{
    // display loading message
    /*
    if (typeof mnemType == "object")
        for (let ele of mnemType)
            updateIframe(ele, "Loading Community Mnemonic ...")
    */

    let type: ItemType = getItemType();

    if (dataJson || dataJson === null)
    {
        if (typeof mnemType === "string")
            mnemType = [mnemType];
        else
        {
            // reset global mnem storage for save&editing when updating both types
            // use mnemType as key
            // mnemonics, for edit, save & cancel
            currentMnem.mnem = {};
            // user of currently displayed mnem. (edit & vote)
            currentMnem.currentUser = {};
            // Index of active mnem, of all mnems. (No matter user)
            currentMnem.mnemIndex = {};
            // Index of active mnem, of the users mnems. (Also other users; mnemUser)
            currentMnem.userIndex = {};
        }
        for (let ele of mnemType)  // @ts-ignore
            updateCMelements(ele, type, dataJson, index);
    }
    else
    {
        let item = getItem();

        api.getData(item, getShortItemType(type)).then((dataJson) =>
            {
                if (dataJson !== undefined)
                    updateCM(dataJson, mnemType, index);
            }).catch((reason) => {
                console.log("WKCM2: updateCM error: ", reason);
                setTimeout(function(){ updateCM(false, mnemType, index) }, refetchTimeout);
            });
    }
}

/**
 * function that is doing the updating of the iframe contents.
 * Getting called in updateCM from data promise to reduce clutter in nested .then()
 * @param mnemType reading or meaning
 * @param type kanji, vocabulary or radical
 * @param dataJson json containing data from the DB:
 * {Type: 'k', Item: '活', Meaning_Mnem: {...}, Reading_Mnem: '!', Meaning_Score: {...}, ...}
 * @param index Global Index of mnemonic.
 * */
function updateCMelements(mnemType: MnemType, type: ItemType, dataJson: DataJson, index=0)
{
    // check if cm type exists in HTML
    if (!document.querySelector("#cm-"+mnemType))
        return;

    // Radicals only have meaning, no reading. Disable Reading buttons and update Reading message
    if(mnemType == "reading" && type == "radical")
    {
        Buttons.disableButtons(mnemType);
        updateIframe(mnemType, getRadicalReadingMessage());
        return;
    }

    // initialize, set and/or reset index
    currentMnem.mnemIndex[mnemType] = index;
    // if mnemJson is undefined or null, no mnemonic exists for this item/type combo.
    //reset score display
    setScore(mnemType, 0);

    Buttons.disableButtons(mnemType);
    removeClass(`cm-${mnemType}-submit`);


    currentMnem.currentUser[mnemType] = null;
    currentMnem.mnem[mnemType] = null;

    if (dataJson != null)
    {
        // sanity check if Mnems are filled, or just contain empty jsons ("" keys length is 0)
        if ((Object.keys(dataJson["Meaning_Mnem"]).length == 0 || dataJson["Meaning_Mnem"] == "{}") &&
            (Object.keys(dataJson["Reading_Mnem"]).length == 0 || dataJson["Reading_Mnem"] == "{}") )
        {
            updateIframe(mnemType, getNoMnemMsg());
            removeClass(`cm-${mnemType}-request`);
            return;
        }


        let mnemSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Mnem";
        let scoreSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Score";
        let votesSelector = mnemType.charAt(0).toUpperCase() + mnemType.slice(1) + "_Votes";
        let mnemJson: MnemJson = jsonParse(dataJson[mnemSelector]) as MnemJson;
        let scoreJson: ScoreJson = jsonParse(dataJson[scoreSelector]) as ScoreJson;  // Score != Votes
        let votesJson: VotesJson = jsonParse(dataJson[votesSelector]) as VotesJson;

        // no mnem available for current item
        if (mnemJson == null)
        {
            updateIframe(mnemType, getNoMnemMsg());
            removeClass(`cm-${mnemType}-request`);
        }
        // request JSON: {"!": ["Anonymous", "Dakes"]}
        else if (Object.keys(mnemJson)[0] == "!" && Object.keys(mnemJson).length == 1)
        {
            updateIframe(mnemType, getMnemRequestedMsg(mnemJson["!"]));
            if (mnemJson["!"].includes(WKUser))
                addClass(`cm-${mnemType}-request`);
            else
                removeClass(`cm-${mnemType}-request`);
            // disable request button, if user already requested
        }
        // default case. Mnem available
        else
        {
            Buttons.toggleArrows(mnemType, getMnemCount(mnemJson), index);
            // save dataJson to pseodo global, to prevent reloading from cache. (is faster [only a bit])
            switchCM.dataJson = dataJson;

            
            let currentJsonUser = getNthDataUser(mnemJson, index);
            updateIframe(mnemType, ...currentJsonUser);  // (mnemType, mnem, user)

            // to know which mnem to edit.
            currentMnem.currentUser[mnemType] = currentJsonUser[1];
            currentMnem.userIndex[mnemType] = getUserIndex(mnemJson, index, currentMnem.currentUser[mnemType]);

            let score = 0;
            try
            {
                score = scoreJson[currentMnem.currentUser[mnemType]][currentMnem.userIndex[mnemType]];
            }
            catch (err)
            {
                // ignore in cases: ScoreJson is null (empty). And user entry does not exist.
            }
            setScore(mnemType, score);
            Buttons.toggleUserButtons(mnemType, currentJsonUser[1]==WKUser);
            currentMnem.userIndex[mnemType] = getUserIndex(mnemJson, index, currentMnem.currentUser[mnemType]);
            Buttons.toggleVotes(mnemType, votesJson, currentJsonUser[1], currentMnem.userIndex[mnemType]);

            // save for editing only if the currently displayed mnem is by user
            if (currentJsonUser[1] == WKUser)
                currentMnem.mnem[mnemType] = currentJsonUser[0];

            // disable submit button if user submitted too many mnems
            if (getUserMnemCount(mnemJson, WKUser) >= mnemMaxCount)
                addClass(`cm-${mnemType}-submit`);

        }
    }
    // no mnem available for both items
    else
    {
        updateIframe(mnemType, getNoMnemMsg());  // (mnem, user)
        removeClass(`cm-${mnemType}-request`);
        currentMnem.mnem[mnemType] = null;
    }
}
// updateCMelements ▲


/**
 * Switch displayed mnemonic to next or previous
 * @param {*} mnemType reading/meaning
 * @param {*} summand to add to index (usually -1/+1)
 */
export function switchCM(mnemType: MnemType, summand: number): void
{
    let idx = 0;
    if (!Number.isNaN(Number(currentMnem.mnemIndex[mnemType])))
        idx = Number(currentMnem.mnemIndex[mnemType]);
    let dataJson: boolean|DataJson = false;
    if (Object.keys(switchCM.dataJson).length != 0)
        dataJson = switchCM.dataJson;
    let newIdx: number = idx+summand;
    if (newIdx < 0)
    {
        console.log("WKCM2 Error: switchCM; new Index is < 0: ", newIdx, idx, summand);
        newIdx = 0;
    }
    updateCM(dataJson, mnemType, newIdx);
    switchCM.dataJson = {};
}

export namespace switchCM
{
    export let dataJson: DataJson = {};
}

/**
 * @param mnemJson json of either Meaning or Reading mnemonic. NOT whole data json
 * @return total number of mnemonics
 * */
export function getMnemCount(mnemJson: MnemJson)
{
    if (mnemJson == null)
        return 0;
    let mnemCount = 0;
    for (let user in mnemJson)
    {
        mnemCount = mnemCount + mnemJson[user].length;
    }
    return mnemCount;
}

/**
 * @param mnemJson json of either Meaning or Reading mnemonic. NOT whole data json
 * @param user user whose mnems to count
 * @return number of mnemonics user submitted
 * */
export function getUserMnemCount(mnemJson: MnemJson, user: string)
{
    if (mnemJson == null)
        return 0;
    if (!mnemJson[user])
        return 0;
    return mnemJson[user].length;
}

/**
 * Get data point at position n and return in array with user (owner of data) in second element.
 * @param innerJson inner json of data. either Meaning or Reading mnemonic. Or Votes. NOT whole data json.
 * MUST be in the form: {"user": [1, 2, 3], "user2": [4, 5, 6]}
 * @param n number of mnem to get. (Global index)
 * @return Array of nth data point in json and user: [data, user]
 * */
function getNthDataUser(innerJson: MnemJson|ScoreJson, n: number): [any, string|null]
{
    if (n < 0)
    {
        console.log("WKCM2 Error: getNthDataUser got index < 0: ", n);
        n = 0;
    }

    if (innerJson == null)
        return [null, null];
    let count = 0;
    for (let user in innerJson)
    {
        for (let data of innerJson[user])
        {
            if (count == n)
                return [data, user];
            ++count;
        }
    }
    return [null, null];
}

/**
 * Get Score at position n. (Global index)
 * @param scoreJson 
 * @param n Global index of data to search
 * @returns Score: int
 */
export function getNthScore(scoreJson: ScoreJson, n: number)
{
    try
    {
        let scoreUser = getNthDataUser(scoreJson, n);
        if (scoreUser[0] == null)
            return 0;
        let score: number = Number(scoreUser[0]);
        score = (!score ? 0 : score);
        return score;
    }
    catch (err)
    {
        console.log("WKCM2: Error, getNthScore: ", err);
        return 0;
    }
}

/**
 * Get the index of the users individual mnem from the global mnem index.
 * Relevant for editing mnem, to overwrite the correct one in the sheet.
 * */
export function getUserIndex(mnemJson: MnemJson, n: number, user:string)
{
    if (mnemJson == null)
        return 0;
    if (mnemJson[user] == null)
        return 0;

    let count = 0;
    for (let currentUser in mnemJson)
    {
        let userCount = 0;
        for (let data of mnemJson[currentUser])
        {
            if (count == n && currentUser == user)
                return userCount;
            ++userCount;
            ++count;
        }
    }
    return 0;
}

/**
 * Initializes Button functionality with EventListener click
 * */
export function initButtons(mnemType: MnemType)
{
    //// mnemType = getFullMnemType(mnemType);
    Buttons.initInteractionButtons(mnemType);
    //? Textarea.initEditButtons(mnemType);
}

/**
 * Textarea for writing Mnemonics
 */
export class Textarea
{
    // TODO: check if needed
    // ? @deprecated
    // true, if mnem is currently being written. (Textarea active)
    static submitting: boolean = false;

    /**
     * Save button during Mnemonic writing. Submitting and edit.
     * Submit Mnemonic to Database Sheet.
     * */
    static editSaveCM(mnemType: MnemType)
    {

        let textarea = Textarea.getTextArea(mnemType);
        if (!textarea)
            return;

        let newMnem = Escaping.replaceInNewMnem(textarea.value);
        // if newMnem empty "", nothing to save
        if (!newMnem)
            return;
        // if currentMnem.mnem[mnemType] wasn't set, no mnem exists for this, then set it to empty string.

        if (!currentMnem.mnem[mnemType])
            currentMnem.mnem[mnemType] = "";

        // nothing to save
        if (newMnem == decodeHTMLEntities(currentMnem.mnem[mnemType]))
            return;
        
        addClass(`cm-${mnemType}-save`);

        let type = getItemType();
        let item = getItem();

        // index of the mnemonic for this user in the DB. Needed to update the correct one
        let mnemUserIndexDB = -1;
        mnemUserIndexDB = currentMnem.userIndex[mnemType];
        
        // append new mnem if mode is submit
        if (Textarea.submitting)
            mnemUserIndexDB = -1;

        // restore iframe. needed by dataUpdate after insert.
        let editForm = document.getElementById(`cm-${mnemType}-form`);
        if (editForm)
        {
            editForm.outerHTML = getInitialIframe(mnemType);
            Buttons.disableButtons(mnemType);
        }


        // api call to put data
        api.submitMnemonic(mnemType, item, getShortItemType(type),
                           mnemUserIndexDB, newMnem)
            .then(a =>
                {
                    addClass(`cm-${mnemType}-cancel`);
                    // with undefined, uses default parameter.
                    dataUpdateAfterInsert(undefined, undefined, undefined, undefined, undefined,
                                          currentMnem.mnemIndex[mnemType], mnemType);
                })
            .catch(reason => console.log("WKCM2: editSaveCM failed: ", reason));


        Textarea.submitting = false;
        currentMnem.userIndex[mnemType] = 0;
        currentMnem.mnem[mnemType] = null;
    }

    /**
     * Cancel button during Mnemonic writing. Submitting and edit.
     * Prompts for confirmation, if content is edited or not empty.
     * */
    static editCancelCM(mnemType: MnemType)
    {
        let textarea = Textarea.getTextArea(mnemType);
        let cancelConfirm = true;
        // only open dialog if it has content and it was edited
        if (textarea && currentMnem.mnem[mnemType])
            if (textarea.value && decodeHTMLEntities(currentMnem.mnem[mnemType]) !== textarea.value)
                cancelConfirm = confirm("Your changes will be lost. ");

        if (cancelConfirm)
        {
            let editForm = document.getElementById(`cm-${mnemType}-form`);
            if (!editForm)
                return;
            Textarea.submitting = false;
            editForm.outerHTML = getInitialIframe(mnemType);
            updateCM(false, mnemType, currentMnem.mnemIndex[mnemType]);
        }
        currentMnem.mnem[mnemType] = {};
    }

    /**
     * Insert the tag "tag" in mnem writing field, at current cursor position, or around highlighted text.
     * */
    static insertTag(mnemType: MnemType, tag: string)
    {
        let textarea = Textarea.getTextArea(mnemType);
        if (!textarea)
            return;

        let selectedText = Textarea.getSelectedText(textarea);
        let insertText: string = "[" + tag + "]" + selectedText + "[/" + tag + "]";

        if (textarea.setRangeText)
        {
            //if setRangeText function is supported by current browser
            textarea.setRangeText(insertText);
        } else
        {
            textarea.focus();
            document.execCommand('insertText', false /*no UI*/, insertText);
        }
        textarea.focus();
    }

    /**
     * Insert the text in mnem writing field, at current cursor position.
     * */
    static insertText(mnemType: MnemType, text: string)
    {
        let textarea = Textarea.getTextArea(mnemType);
        if (!textarea)
            return;
        if (textarea.setRangeText)
        {
            //if setRangeText function is supported by current browser
            textarea.setRangeText(text);
        } else
        {
            textarea.focus();
            document.execCommand('insertText', false /*no UI*/, text);
        }
        textarea.focus();
    }

    static initEditButtons(mnemType: MnemTypeAny)
    {
        mnemType = mnemType as MnemType;
        addClickEvent(`cm-${mnemType}-save`,             Textarea.editSaveCM,   [mnemType]);
        addClickEvent(`cm-${mnemType}-cancel`,           Textarea.editCancelCM, [mnemType]);
        addClickEvent(`cm-format-${mnemType}-bold`,      Textarea.insertTag,    [mnemType, "b"]);
        addClickEvent(`cm-format-${mnemType}-italic`,    Textarea.insertTag,    [mnemType, "i"]);
        addClickEvent(`cm-format-${mnemType}-underline`, Textarea.insertTag,    [mnemType, "u"]);
        addClickEvent(`cm-format-${mnemType}-strike`,    Textarea.insertTag,    [mnemType, "s"]);
        addClickEvent(`cm-format-${mnemType}-newline`,   Textarea.insertText,   [mnemType, "[n]"]);
        addClickEvent(`cm-format-${mnemType}-qmark`,     Textarea.insertText,   [mnemType, "?"]);
        addClickEvent(`cm-format-${mnemType}-reading`,   Textarea.insertTag,    [mnemType, "read"]);
        addClickEvent(`cm-format-${mnemType}-rad`,       Textarea.insertTag,    [mnemType, "rad"]);
        addClickEvent(`cm-format-${mnemType}-kan`,       Textarea.insertTag,    [mnemType, "kan"]);
        addClickEvent(`cm-format-${mnemType}-voc`,       Textarea.insertTag,    [mnemType, "voc"]);
    }
    // Button functionality ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    static getTextArea(mnemType: MnemType): HTMLTextAreaElement
    {
        return document.getElementById(`cm-${mnemType}-text`) as HTMLTextAreaElement;
    }

    static getSelectedText(textArea: HTMLTextAreaElement)
    {
        let text = textArea.value;
        let indexStart = textArea.selectionStart;
        let indexEnd = textArea.selectionEnd;
        return text.substring(indexStart, indexEnd);
    }


}