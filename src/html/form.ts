/**
 * Create the textbox and all of its buttons for writing mnemonics
 * */
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
<div class="flex items-center"><span id="cm-${mnemType}-chars-remaining" class="block" title="Characters Remaining">5000<i class="fa fa-pencil ml-2"></i></span>
<!-- Save and Cancel Buttons -->
<div class="form-button-wrapper">
    <button type="submit" id="cm-${mnemType}-save" class="cm-btn cm-save-highlight disabled:cursor-not-allowed disabled:opacity-50">Save</button>
    <button type="button" id="cm-${mnemType}-cancel" class="cm-btn cm-cancel-highlight disabled:cursor-not-allowed disabled:opacity-50">Cancel</button></div>
</div>

</fieldset>
</form>`;
}

