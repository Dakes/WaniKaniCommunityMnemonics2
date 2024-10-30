/**
 * Functions to generate the mnemonic div
 * but also to modify it, like toggle buttons
 */

import { currentMnem, switchCM, Textarea } from "../mnemonic";
import { getItem, getItemType } from "../page";
import { decodeHTMLEntities } from "../text";
import { WKUser } from "../user";
import { addClass, addClickEvent, getShortItemType, handleApiPutResponse, removeClass } from "../utils";
import { getCMForm } from "./form";
import { getInitialIframe } from "./iframe";
import { dataUpdateAfterInsert } from "../data";
import * as api from "../api";

const leftArrowSVG = `
<svg viewBox="-4.5 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#333333"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>arrow_left [#335]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-345.000000, -6679.000000)" fill="#333333"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M299.633777,6519.29231 L299.633777,6519.29231 C299.228878,6518.90256 298.573377,6518.90256 298.169513,6519.29231 L289.606572,6527.55587 C288.797809,6528.33636 288.797809,6529.60253 289.606572,6530.38301 L298.231646,6538.70754 C298.632403,6539.09329 299.27962,6539.09828 299.685554,6538.71753 L299.685554,6538.71753 C300.100809,6538.32879 300.104951,6537.68821 299.696945,6537.29347 L291.802968,6529.67648 C291.398069,6529.28574 291.398069,6528.65315 291.802968,6528.26241 L299.633777,6520.70538 C300.038676,6520.31563 300.038676,6519.68305 299.633777,6519.29231" id="arrow_left-[#335]"> </path> </g> </g> </g> </g></svg>
`;

const rightArrowSVG = `
<svg viewBox="-4.5 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#333333"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>arrow_right [#336]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-305.000000, -6679.000000)" fill="#333333"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M249.365851,6538.70769 L249.365851,6538.70769 C249.770764,6539.09744 250.426289,6539.09744 250.830166,6538.70769 L259.393407,6530.44413 C260.202198,6529.66364 260.202198,6528.39747 259.393407,6527.61699 L250.768031,6519.29246 C250.367261,6518.90671 249.720021,6518.90172 249.314072,6519.28247 L249.314072,6519.28247 C248.899839,6519.67121 248.894661,6520.31179 249.302681,6520.70653 L257.196934,6528.32352 C257.601847,6528.71426 257.601847,6529.34685 257.196934,6529.73759 L249.365851,6537.29462 C248.960938,6537.68437 248.960938,6538.31795 249.365851,6538.70769" id="arrow_right-[#336]"> </path> </g> </g> </g> </g></svg>
`;

const upArrowSVG = `
<svg viewBox="0 -4.5 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#FFFFFF"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>arrow_up [#337]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-260.000000, -6684.000000)" fill="#FFFFFF"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M223.707692,6534.63378 L223.707692,6534.63378 C224.097436,6534.22888 224.097436,6533.57338 223.707692,6533.16951 L215.444127,6524.60657 C214.66364,6523.79781 213.397472,6523.79781 212.616986,6524.60657 L204.29246,6533.23165 C203.906714,6533.6324 203.901717,6534.27962 204.282467,6534.68555 C204.671211,6535.10081 205.31179,6535.10495 205.70653,6534.69695 L213.323521,6526.80297 C213.714264,6526.39807 214.346848,6526.39807 214.737591,6526.80297 L222.294621,6534.63378 C222.684365,6535.03868 223.317949,6535.03868 223.707692,6534.63378" id="arrow_up-[#337]"> </path> </g> </g> </g> </g></svg>
`;

const downArrowSVG = `
<svg viewBox="0 -4.5 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#FFFFFF"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>arrow_down [#338]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-220.000000, -6684.000000)" fill="#FFFFFF"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M164.292308,6524.36583 L164.292308,6524.36583 C163.902564,6524.77071 163.902564,6525.42619 164.292308,6525.83004 L172.555873,6534.39267 C173.33636,6535.20244 174.602528,6535.20244 175.383014,6534.39267 L183.70754,6525.76791 C184.093286,6525.36716 184.098283,6524.71997 183.717533,6524.31405 C183.328789,6523.89985 182.68821,6523.89467 182.29347,6524.30266 L174.676479,6532.19636 C174.285736,6532.60124 173.653152,6532.60124 173.262409,6532.19636 L165.705379,6524.36583 C165.315635,6523.96094 164.683051,6523.96094 164.292308,6524.36583" id="arrow_down-[#338]"> </path> </g> </g> </g> </g></svg>
`;

export function getMnemOuterHTMLList(radical = false) {
  let mnemOuterHTML = /* html */`
    <div id="wkcm2" class="cm">
    <br> <h2 class="subject-section__title">Community Mnemonics</h2>

    <h2 class="subject-section__subtitle">${getHeader("meaning")}</h2>
    ${getCMdivContent("meaning")}`;
  if (radical == false)
    mnemOuterHTML = mnemOuterHTML +
      `<h2 class="subject-section__subtitle">${getHeader("reading")}</h2>`
      + getCMdivContent("reading");
  mnemOuterHTML = mnemOuterHTML + `</div>`;
  return mnemOuterHTML;
}

export function getHeader(mnemType: MnemType): string {
  return `Community ${mnemType.charAt(0).toUpperCase() + mnemType.slice(1)} Mnemonic`;
}

/**
 * Creates the initial HTML code for the individual Mnemonic types, including Iframes. But also all Buttons.
 * Does not include content
 */
export function getCMdivContent(mnemType: MnemType): string {
  const userContentIframe = getInitialIframe(mnemType);

  let header = getHeader(mnemType);

  return `
<div id="cm-${mnemType}" class="cm-content">
    <!--  <h2 class="subject-section__subtitle">${header}</h2>  -->
    <div id="cm-${mnemType}-prev"        class="cm-btn cm-prev disabled">${leftArrowSVG}</div>
    ${userContentIframe}
    <div id="cm-${mnemType}-next"         class="cm-btn cm-next disabled">${rightArrowSVG}</div>
    <div id="cm-${mnemType}-info"         class="cm-info">

    <div id="cm-${mnemType}-user-buttons" class="cm-user-buttons">
        <div id="cm-${mnemType}-edit"         class="cm-btn cm-edit-highlight cm-small-btn disabled" >Edit</div>
        <div id="cm-${mnemType}-delete"       class="cm-btn cm-delete-highlight cm-small-btn disabled">Delete</div>
        <div id="cm-${mnemType}-request"      class="cm-btn cm-request-highlight cm-small-btn disabled">Request</div>
    </div>

    <div class="cm-score">Score: <span id="cm-${mnemType}-score-num" class="cm-score-num">0</span></div>
    <div id="cm-${mnemType}-upvote"       class="cm-btn cm-upvote-highlight disabled">Upvote ${upArrowSVG}</div>
    <div id="cm-${mnemType}-downvote"     class="cm-btn cm-downvote-highlight disabled">Downvote ${downArrowSVG}</div>
    <div id="cm-${mnemType}-submit"       class="cm-btn cm-submit-highlight disabled">Submit Yours</div></div>
</div>
`;
}


export function setScore(mnemType: MnemType, score: string | Number) {
  let scoreEle = document.getElementById(`cm-${mnemType}-score-num`);
  if (scoreEle != null) {
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
export function removeMnemDiv(mnemType: MnemType) {

}


export class Buttons {

  /**
   * Enable/Disable all buttons that depend on the Mnemonic being by the user, or not.
   * @param owner boolean. Owner of mnem: True, else False
   * */
  static toggleUserButtons(mnemType: MnemType, owner: boolean) {
    if (owner == true) {
      removeClass(`cm-${mnemType}-edit`);
      removeClass(`cm-${mnemType}-delete`);
      addClass(`cm-${mnemType}-request`);
      addClass(`cm-${mnemType}-upvote`);
      addClass(`cm-${mnemType}-downvote`);
    } else if (owner == false) {
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
  static toggleArrows(mnemType: MnemType, length: number, index: number) {
    let left  = `cm-${mnemType}-prev`;
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
  static toggleVotes(mnemType: MnemType, votesJson: VotesJson, mnemUser: string, mnemIndex: number) {
    if (votesJson == null || mnemUser == WKUser)
      return;
    const downv = `cm-${mnemType}-downvote`;
    const upv   = `cm-${mnemType}-upvote`;
    try {
      const userVote = Number(votesJson[mnemUser][mnemIndex][WKUser]);
      if (userVote >= 1)
        addClass(upv);
      else if (userVote <= -1)
        addClass(downv);
    } catch (err) {
      // catch votesJson access in case mnemUser or WKUser do not have and entries.
      //// console.log("WKCM2 Error in toggleVotes, mnem_div.ts:", err);
    }
  }


  static disableButtons(mnemType: MnemType) {
    addClass(`cm-${mnemType}-edit`);
    addClass(`cm-${mnemType}-delete`);
    addClass(`cm-${mnemType}-request`);
    addClass(`cm-${mnemType}-upvote`);
    addClass(`cm-${mnemType}-downvote`);
    addClass(`cm-${mnemType}-submit`);
    addClass(`cm-${mnemType}-prev`);
    addClass(`cm-${mnemType}-next`);
  }

  static editCM(mnemType: MnemType) {
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
    if (textarea) {
      // replace HTML entities, so user actually sees the sign, they used before. Like < instead of &#60;
      textarea.value = decodeHTMLEntities(currentMnem.mnem[mnemType]);
    }
  }

  static deleteCM(mnemType: MnemType) {
    if (!confirm("Your mnemonic will be deleted. This can not be undone! Are you sure?"))
      return;

    addClass(`cm-${mnemType}-delete`);
    addClass(`cm-${mnemType}-edit`);
    if (currentMnem.mnem[mnemType] == undefined)
      return;
    if (currentMnem.currentUser[mnemType] !== WKUser)
      return

    let item      = getItem();
    let shortType = getShortItemType(getItemType());

    api.deleteMnemonic(mnemType, item, shortType).then(response => {
      handleApiPutResponse(response);
    }).catch(reason => console.log("WKCM2: requestCM failed: ", reason));
  }

  static requestCM(mnemType: MnemType) {
    addClass(`cm-${mnemType}-request`);
    let shortType = getShortItemType(getItemType());
    api.requestMnemonic(mnemType, getItem(), shortType).then(response => {
      handleApiPutResponse(response);
    }).catch(reason => console.log("WKCM2: requestCM failed: ", reason));
  }

  static voteCM(mnemType: MnemType, vote: number) {
    if (!currentMnem.currentUser)
      return;
    if (typeof currentMnem.currentUser[mnemType] != "string")
      return;
    if (!currentMnem.mnemIndex)
      return;
    if (Number.isNaN(Number(currentMnem.mnemIndex[mnemType])))
      return;
    let item      = getItem();
    let shortType = getShortItemType(getItemType());

    if (Number(vote) >= 1)
      addClass(`cm-${mnemType}-upvote`);
    else if (Number(vote) <= -1)
      addClass(`cm-${mnemType}-downvote`);

    api.voteMnemonic(mnemType, item, shortType, vote).then(response => {
      handleApiPutResponse(response,
        function () {
          return dataUpdateAfterInsert(undefined, undefined,
            undefined, undefined, undefined,
            currentMnem.mnemIndex[mnemType], mnemType);
        });
    }).catch(reason => console.log("WKCM2: requestCM failed:\n", reason));

  }

  static submitCM(mnemType: MnemType) {
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

  static initInteractionButtons(mnemType: MnemType) {
    addClickEvent(`cm-${mnemType}-edit`, Buttons.editCM, [ mnemType ]);
    addClickEvent(`cm-${mnemType}-delete`, Buttons.deleteCM, [ mnemType ]);
    addClickEvent(`cm-${mnemType}-request`, Buttons.requestCM, [ mnemType ]);
    addClickEvent(`cm-${mnemType}-upvote`, Buttons.voteCM, [ mnemType, "1" ]);
    addClickEvent(`cm-${mnemType}-downvote`, Buttons.voteCM, [ mnemType, "-1" ]);
    addClickEvent(`cm-${mnemType}-submit`, Buttons.submitCM, [ mnemType ]);
    addClickEvent(`cm-${mnemType}-prev`, switchCM, [ mnemType, -1 ]);
    addClickEvent(`cm-${mnemType}-next`, switchCM, [ mnemType, 1 ]);
  }


}