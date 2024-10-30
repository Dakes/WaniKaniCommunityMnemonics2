import { memoize } from "../utils"
import * as iframeCss from "../css/iframe.scss"
import { Escaping } from "../data";

// Makes iframe (Mnemonics) pretty. background, hide scrollbar and most importantly highlighting, copied from list page
function iframeCSS(): string {
  return `<style>${iframeCss.default}</style>`;
}

/**
 * Creates emty Iframe for CM user content later on
 * @param mnemType m, r or meaning, reading
 * */
export function getInitialIframe(mnemType: MnemType): string {
  let iframeId      = "cm-iframe-" + mnemType;
  let iframeClass   = "cm-mnem-text";
  let initialSrcdoc = getIframeSrcdoc("Loading Community Mnemonic ...");
  return `<iframe sandbox referrerpolicy='no-referrer' scrolling='auto' frameBorder='0' class='${iframeClass}' id='${iframeId}' srcdoc="${initialSrcdoc}"></iframe>`;
}

/**
 * wraps iframe update, to not update content, if it is the same as the currently displayed.
 * This reduces these annoying flashes, where the whole iframe content disappears for a moment.
 * @param text NOT the whole content, just the message, that will be visible.
 * */
export function updateIframe(mnemType: MnemType | null, text: string, user: string | null = null) {
  if (mnemType == null) {
    updateIframe("meaning", text, user);
    updateIframe("reading", text, user);
    return;
  }

  let iframe = document.getElementById(`cm-iframe-${mnemType}`) as HTMLIFrameElement;
  if (iframe == null)
    return;

  let newIframeHtml    = getIframeSrcdoc(text, user);
  let newIframeContent = /<body.*?>([\s\S]*)<\/body>/.exec(newIframeHtml)[1];
  let oldIframeContent = /<body.*?>([\s\S]*)<\/body>/.exec(iframe.srcdoc)[1];

  if (newIframeContent == oldIframeContent)
    return;
  iframe.srcdoc = newIframeHtml;
}

/**
 * Generates the content of the iframe, that will be set as it's srcdoc property.
 * Needs the WaniKani CSS an the actual body content.
 * */
function getIframeSrcdoc(text: string, user: string | null = null) {
  if (typeof text != "string") {
    console.log("WKCM2 Error: getIframeSrcdoc, did not get text, but: ", typeof text, text);
    text = "";
  }

  let cssLinks  = getWKcss();
  let cssString = "";
  for (const l of cssLinks)
    cssString = cssString + l.outerHTML;
  // override style to fix some oddities
  cssString = cssString + iframeCSS();
  cssString = cssString.replaceAll('"', "'");


  // just to be sure replace those signs here again. But those shouldn't be in the sheet to begin with.
  text = text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  text = Escaping.replaceMarkup(text);

  // text = escape(text);

  let userMsg = "";
  // user can be null, if it is a system message
  if (user != null && typeof user === "string" && user != "") {
    user    = user.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    userMsg = "by " + Escaping.getUserProfileLink(user);
  }
  if (user == "!")
    userMsg = "This is a request. It should have been deleted after submission of a mnemonic. If you are seeing this, please post in the forum, open an issue on GitHub, or just downvote it. ";

  let srcdoc = `<html><head>${cssString}</head><body><div class='col2'>${text}</div><div id='user-link'>${userMsg}</div></body></html>`;
  return srcdoc;
}

// getIframeSrcdoc ▲

// getIframeSrcdoc helpers ▼
/**
 * gets all stylesheets in link tags WaniKani uses, for use in iframes.
 * Memoizes result.
 * */
function getWKcssUncached(): HTMLLinkElement[] {
  let css: HTMLLinkElement[] = [];

  let allLinks = Array.from(document.querySelectorAll("head link")) as HTMLLinkElement[];
  for (const link of allLinks) {
    // @ts-ignore
    if (link?.rel !== "stylesheet")
      continue;
    css.push(link);
  }
  return css;
}

export const getWKcss = memoize(getWKcssUncached);



