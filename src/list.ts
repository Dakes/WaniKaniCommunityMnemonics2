/**
 * Functions for the item lists
 * (wanikani.com/vocabulary)
 */

import { getData } from "./api";
import { hasRequest, mnemAvailable } from "./data";
import { getBadge, getBadgeBaseClass, getLegendLi } from "./html/list";
import { addHTMLinEle, getShortItemType } from "./utils";


export function initHeader() {
  addHTMLinEle(".subject-legend__items", getLegendLi(), "beforeend");
}

export async function addBadgeToItems() {
  // cancel if they were already added
  if (document.querySelector(`[class*='${getBadgeBaseClass()}']`))
    return;

  let types: ItemType[] = [ "radical", "kanji", "vocabulary" ];
  //let typeShort = getShortItemType(getItemType());

  // needed for "levels" Overview, where all three are present
  for (let type of types) {
    let itemList = document.querySelectorAll<HTMLElement>(
      `.character-item--${type}`);

    for (let i = 0; i < itemList.length; i++) {
      if (typeof itemList[i] != "object" || itemList[i] == null) {
        console.log(type, itemList[i])
        console.log(typeof itemList[i])
        continue;
      }

      let spanItem = itemList[i].querySelector<HTMLElement>(
        ".character-item__characters")

      let item = "";
      if (spanItem.innerText) {
        item = spanItem.innerText;
      } else if (type == "radical")  // Image Radical
      {
        let radImg = spanItem.querySelector("img.radical-image") as HTMLImageElement;
        item       = radImg.alt;
      } else {
        continue;
      }


      await getData(item, getShortItemType(type), false).then((res) => {
        let badgeHTML = "";
        let selector  = "";
        if (hasRequest(res))
          addBadge(itemList[i], getBadge(true), getBadgeBaseClass("request"));
        if (mnemAvailable(res))
          addBadge(itemList[i], getBadge(false), getBadgeBaseClass("available"));

      });
    }
  }
}

/**
 * Only add Badge if not already present.
 * @param node
 * @param badgeHTML
 * @param selector
 */
function addBadge(node: HTMLElement, badgeHTML: string, selector: string) {
  if (!node.parentNode.querySelector(`.${selector}`)) {
    let range = document.createRange();
    range.selectNode(document.body);
    let newElement = range.createContextualFragment(badgeHTML);
    node.parentNode.insertBefore(newElement, node);
  }
}
