/**
 * Create the textbox and all of its buttons for writing mnemonics
 * */



const pencilSVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18.3785 8.44975L11.4637 15.3647C11.1845 15.6439 10.8289 15.8342 10.4417 15.9117L7.49994 16.5L8.08829 13.5582C8.16572 13.1711 8.35603 12.8155 8.63522 12.5363L15.5501 5.62132M18.3785 8.44975L19.7927 7.03553C20.1832 6.64501 20.1832 6.01184 19.7927 5.62132L18.3785 4.20711C17.988 3.81658 17.3548 3.81658 16.9643 4.20711L15.5501 5.62132M18.3785 8.44975L15.5501 5.62132" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M5 20H19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
`;

export function getCMForm(mnemType: MnemType): string {
  return /*HTML*/`
<form id="cm-${mnemType}-form" class="cm-form cm-mnem-text" onsubmit="return false">
<div id="cm-${mnemType}-format" class="cm-format">
<div id="cm-format-${mnemType}-bold"      class="cm-btn cm-format-btn cm-format-bold"      title="bold"><b>b</b></div>
<div id="cm-format-${mnemType}-italic"    class="cm-btn cm-format-btn cm-format-italic"    title="italic"><i>i</i></div>
<div id="cm-format-${mnemType}-underline" class="cm-btn cm-format-btn cm-format-underline" title="underline"><u>u</u></div>
<div id="cm-format-${mnemType}-strike"    class="cm-btn cm-format-btn cm-format-strike"    title="strikethrough"><s>s</s></div>
<div id="cm-format-${mnemType}-newline"   class="cm-btn cm-format-btn cm-format-newline"   title="newline"><div>&#92;n</div></div>
<div id="cm-format-${mnemType}-qmark"     class="cm-btn cm-format-btn cm-format-qmark"     title="Question Mark"><div>?</div></div>
<div id="cm-format-${mnemType}-reading"   class="cm-btn cm-format-btn cm-reading"          title="reading">読</div>
<div id="cm-format-${mnemType}-rad"       class="cm-btn cm-format-btn cm-radical"          title="radical">部</div>
<div id="cm-format-${mnemType}-kan"       class="cm-btn cm-format-btn cm-kanji"            title="kanji">漢</div>
<div id="cm-format-${mnemType}-voc"       class="cm-btn cm-format-btn cm-vocabulary"       title="vocabulary">語</div></div>
<fieldset class="note-${mnemType} noSwipe">
<!-- Textarea (Textbox) -->
<textarea id="cm-${mnemType}-text" class="cm-text" maxlength="5000" placeholder="Submit a community mnemonic"></textarea>
<div class="flex items-center"><span id="cm-${mnemType}-chars-remaining" class="block" title="Characters Remaining">5000${pencilSVG}</span>
<!-- Save and Cancel Buttons -->
<div class="form-button-wrapper">
    <button type="submit" id="cm-${mnemType}-save" class="cm-btn cm-save-highlight disabled:cursor-not-allowed disabled:opacity-50">Save</button>
    <button type="button" id="cm-${mnemType}-cancel" class="cm-btn cm-cancel-highlight disabled:cursor-not-allowed disabled:opacity-50">Cancel</button></div>
</div>

</fieldset>
</form>`;
}

