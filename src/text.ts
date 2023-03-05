/**
 * Functions to generate Messages, that are displayed.
 * And to process text, like escape deascape, etc.
 */

import { printDev } from "./utils";

// updateCMelements helpers ▼
export function getNoMnemMsg(): string
{
    let msg = `No Community Mnemonic for this item exists yet. [br]Be the first to submit one.`;
    return msg;
}

export function getRadicalReadingMessage(): string
{
    let msg = `Radicals have no reading. `;
    return msg;
}

export function getMnemRequestedMsg(users: string[]): string
{
    // TODO: make request color darker red, the more users requested
    let len = users.length;
    let msg = `A Mnemonic was [request]requested[/request] for this item. [br][request]Help the community by being the first to submit one![/request]`;
    if (len === 1)
        msg = `A Mnemonic was [request]requested[/request] by the user [request]${users[0]}[/request]. [br]Help them by being the first to submit one! `;
    else if (len > 1)
        msg = `A Mnemonic was [request]requested[/request] by the users [request]${users.slice(0, -1).join(', ')+' and '+users.slice(-1)}[/request]. [br]Help them by being the first to submit one! `;
    return msg;
}

/**
 * Replaces HTML encoded characters with their real counterpart.
 * Only used before editing, so that the user does not see the confusing HTML entities.
 * So this only lands in the textbox, not in the HTML, or iframe. It is used for comparisons as well.
 * */
export function decodeHTMLEntities(text: string): string
{
    if (text === "" || text == null)
        return "";
    if (!text || typeof text != "string")
    {
        printDev("WKCM2: decodeHTMLEntities, did not get text: ", text);
        return;
    }
    let entities = [
        ['amp', '&'], ['#x26', '&'], ['#38', '&'],
        ['apos', '\''], ['#x27', '\''], ['#39', '\''],
        ['#x2F', '/'], ['#47', '/'],
        ['lt', '<'], ['#60', '<'], ['#x3C', '<'],
        ['gt', '>'], ['#62', '>'], ['#x3E', '>'],
        ['nbsp', ' '],
        ['quot', '"'], ['#34', '"'], ['#x22', '"'],
        ['#39', "'"], ['#x27', "'"],
        ['#92', '\\'], ['#x5C', '\\'],
        ['#96', '`'], ['#x60', '`'],
        ['#35', '#'], ['#x23', '#'],
        ['#37', '%'], ['#x25', '%']
    ];

    for (let i = 0, max = entities.length; i < max; ++i)
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);

    return text;
}