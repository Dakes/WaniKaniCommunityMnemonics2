/**
 * Functions to generate the mnemonic div
 * but also to modify it, like toggle buttons
 */

import { currentMnem, switchCM } from "../mnemonic";
import { getItem, getItemType } from "../page";
import { decodeHTMLEntities } from "../text";
import { WKUser } from "../user";
import { addClass, addClickEvent, getShortItemType, handleApiPutResponse, removeClass } from "../utils";
import { getCMForm } from "./form";
import { getInitialIframe } from "./iframe";
import { Textarea } from "../mnemonic";
import { dataUpdateAfterInsert } from "../data";
import * as api from "../api";

export function getMnemOuterHTMLList(radical=false)
{
    let mnemOuterHTML = /* html */`
    <div id="wkcm2" class="cm">
    <br> <h2 class="subject-section__title">Community Mnemonics</h2>
    ${getCMdivContent("meaning")}`;
    if (radical == false)
        mnemOuterHTML = mnemOuterHTML + getCMdivContent("reading");
    mnemOuterHTML = mnemOuterHTML + `</div>`;
    return mnemOuterHTML;
}

/**
 * Creates the initial HTML code for the individual Mnemonic types, including Iframes. But also all Buttons.
 * Does not include content
 */
export function getCMdivContent(mnemType: MnemType): string
{
    const userContentIframe = getInitialIframe(mnemType);
   
    let header = `Community ${mnemType.charAt(0).toUpperCase() + mnemType.slice(1)} Mnemonic`

    // ◄►
    let content =
/*HTML*/`
<div id="cm-${mnemType}" class="cm-content">
    <h2 class="subject-section__subtitle">${header}</h2>
    <div id="cm-${mnemType}-prev"        class="fa-solid fa-angle-left cm-btn cm-prev disabled"><span></span></div>
    ${userContentIframe}
    <div id="cm-${mnemType}-next"         class="fa-solid fa-angle-right cm-btn cm-next disabled"><span></span></div>
    <div id="cm-${mnemType}-info"         class="cm-info">

    <div id="cm-${mnemType}-user-buttons" class="cm-user-buttons">
        <div id="cm-${mnemType}-edit"         class="cm-btn cm-edit-highlight cm-small-btn disabled" >Edit</div>
        <div id="cm-${mnemType}-delete"       class="cm-btn cm-delete-highlight cm-small-btn disabled">Delete</div>
        <div id="cm-${mnemType}-request"      class="cm-btn cm-request-highlight cm-small-btn disabled">Request</div>
    </div>

    <div class="cm-score">Score: <span id="cm-${mnemType}-score-num" class="cm-score-num">0</span></div>
    <div id="cm-${mnemType}-upvote"       class="cm-btn cm-upvote-highlight disabled">Upvote <i class="fa-solid fa-chevrons-up"></i></div>
    <div id="cm-${mnemType}-downvote"     class="cm-btn cm-downvote-highlight disabled">Downvote <i class="fa-solid fa-chevrons-down"></i></div>
    <div id="cm-${mnemType}-submit"       class="cm-btn cm-submit-highlight disabled">Submit Yours</div></div>
</div>
`;

    return content;
}


export function setScore(mnemType: MnemType, score: string|Number)
{
    let scoreEle = document.getElementById(`cm-${mnemType}-score-num`);
    if (scoreEle != null)
    {
        // make sure score is number and not (potentially harmful) string
        if (!Number.isNaN(Number(score)))
            scoreEle.innerText = String(score);
        else
            scoreEle.innerText = "0";
    }
}

/**
 * TODO: implement. needed?
 * @param mnemType 
 */
export function removeMnemDiv(mnemType: MnemType)
{

}


export class Buttons
{

    /**
     * Enable/Disable all buttons that depend on the Mnemonic being by the user, or not.
     * @param owner boolean. Owner of mnem: True, else False
     * */
    static toggleUserButtons(mnemType: MnemType, owner: boolean)
    {
        if (owner == true)
        {
            removeClass(`cm-${mnemType}-edit`);
            removeClass(`cm-${mnemType}-delete`);
            addClass(`cm-${mnemType}-request`);
            addClass(`cm-${mnemType}-upvote`);
            addClass(`cm-${mnemType}-downvote`);
        }
        else if (owner == false)
        {
            addClass(`cm-${mnemType}-edit`);
            addClass(`cm-${mnemType}-delete`);
            addClass(`cm-${mnemType}-request`);
            removeClass(`cm-${mnemType}-upvote`);
            removeClass(`cm-${mnemType}-downvote`);
        }
    }

    /**
     * Disables or enables the arrows for prev and next mnem. Depending on amount of mnems available and active one.
     * */
    static toggleArrows(mnemType: MnemType, length: number, index: number)
    {
        let left = `cm-${mnemType}-prev`;
        let right = `cm-${mnemType}-next`;
        // make array length match index, now both start at 0
        addClass(left);
        addClass(right);

        if (length > 0 && length != null)
            length = length - 1;
        else
            return;

        if (length > index)
            removeClass(right);
        if (length > 0 && index > 0)
            removeClass(left);
    }

    /**
     * Enables/Disables voring buttons depending on users vote
     * votesJson["mnemUser"][mnemIndex]{WKuser} <-- contains vote
     * */
    static toggleVotes(mnemType: MnemType, votesJson: VotesJson, mnemUser: string, mnemIndex: number)
    {
        if (votesJson == null || mnemUser == WKUser)
            return;
        const downv = `cm-${mnemType}-downvote`;
        const upv = `cm-${mnemType}-upvote`;
        try
        {
            const userVote = Number(votesJson[mnemUser][mnemIndex][WKUser]);
            if (userVote >= 1)
                addClass(upv);
            else if (userVote <= -1)
                addClass(downv);
        }
        catch (err)
        {
            // catch votesJson access in case mnemUser or WKUser do not have and entries.
            //// console.log("WKCM2 Error in toggleVotes, mnem_div.ts:", err);
        }
    }


    static disableButtons(mnemType: MnemType)
    {
        addClass(`cm-${mnemType}-edit`);
        addClass(`cm-${mnemType}-delete`);
        addClass(`cm-${mnemType}-request`);
        addClass(`cm-${mnemType}-upvote`);
        addClass(`cm-${mnemType}-downvote`);
        addClass(`cm-${mnemType}-submit`);
        addClass(`cm-${mnemType}-prev`);
        addClass(`cm-${mnemType}-next`);
    }

    static editCM(mnemType: MnemType)
    {
        if (currentMnem.mnem[mnemType] == undefined)
            return;
        if (currentMnem.currentUser[mnemType] == undefined)
            return;
        if (currentMnem.currentUser[mnemType] !== WKUser)
            return;

        Textarea.submitting = false;

        let iframe = document.getElementById(`cm-iframe-${mnemType}`);
        if (!iframe)
            return;

        Buttons.disableButtons(mnemType);

        iframe.outerHTML = getCMForm(mnemType);

        Textarea.initEditButtons(mnemType);

        let textarea = document.getElementById(`cm-${mnemType}-text`) as HTMLTextAreaElement;
        if (textarea)
        {
            // replace HTML entities, so user actually sees the sign, they used before. Like < instead of &#60;
            textarea.value = decodeHTMLEntities(currentMnem.mnem[mnemType]);
        }
    }

    static deleteCM(mnemType: MnemType)
    {
        if (!confirm("Your mnemonic will be deleted. This can not be undone! Are you sure?"))
            return;

        addClass(`cm-${mnemType}-delete`);
        addClass(`cm-${mnemType}-edit`);
        if (currentMnem.mnem[mnemType] == undefined)
            return;
        if (currentMnem.currentUser[mnemType] !== WKUser)
            return

        let item = getItem();
        let shortType = getShortItemType(getItemType());

        api.deleteMnemonic(mnemType, item, shortType).then(response =>
            {
                handleApiPutResponse(response);
            }).catch(reason => console.log("WKCM2: requestCM failed: ", reason));
    }

    static requestCM(mnemType: MnemType)
    {
        addClass(`cm-${mnemType}-request`);
        let shortType = getShortItemType(getItemType());
        api.requestMnemonic(mnemType, getItem(), shortType).then(response =>
            {
                handleApiPutResponse(response);
            }).catch(reason => console.log("WKCM2: requestCM failed: ", reason));
    }

    static voteCM(mnemType: MnemType, vote: number)
    {
        if (!currentMnem.currentUser)
            return;
        if (typeof currentMnem.currentUser[mnemType] != "string" )
            return;
        if (!currentMnem.mnemIndex)
            return;
        if (Number.isNaN(Number(currentMnem.mnemIndex[mnemType])))
            return;
        let item = getItem();
        let shortType = getShortItemType(getItemType());

        if (Number(vote) >= 1)
            addClass(`cm-${mnemType}-upvote`);
        else if (Number(vote) <= -1)
            addClass(`cm-${mnemType}-downvote`);

        api.voteMnemonic(mnemType, item, shortType, vote).then(response =>
            {
                handleApiPutResponse(response,
                    function(){return dataUpdateAfterInsert(undefined, undefined,
                        undefined, undefined, undefined,
                        currentMnem.mnemIndex[mnemType], mnemType);});
            }).catch(reason => console.log("WKCM2: requestCM failed:\n", reason));

    }

    static submitCM(mnemType: MnemType)
    {
        // "Submit Yours" Button

        let iframe = document.getElementById("cm-iframe-" + mnemType);
        if (!iframe)
            return;

        // save edit mode (whether editing or submitting new)
        Textarea.submitting = true;

        iframe.outerHTML = getCMForm(mnemType);

        // Buttons.disableButtons(mnemType);
        Buttons.disableButtons(mnemType);
        Textarea.initEditButtons(mnemType);

    }

    static initInteractionButtons(mnemType: MnemType)
    {

        addClickEvent(`cm-${mnemType}-edit`,     Buttons.editCM,    [mnemType]);
        addClickEvent(`cm-${mnemType}-delete`,   Buttons.deleteCM,  [mnemType]);
        addClickEvent(`cm-${mnemType}-request`,  Buttons.requestCM, [mnemType]);
        addClickEvent(`cm-${mnemType}-upvote`,   Buttons.voteCM,    [mnemType, "1"]);
        addClickEvent(`cm-${mnemType}-downvote`, Buttons.voteCM,    [mnemType, "-1"]);
        addClickEvent(`cm-${mnemType}-submit`,   Buttons.submitCM,  [mnemType]);
        addClickEvent(`cm-${mnemType}-prev`,     switchCM,          [mnemType, -1]);
        addClickEvent(`cm-${mnemType}-next`,     switchCM,          [mnemType, 1]);
    }


}