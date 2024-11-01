# WaniKaniCommunityMnemonics2 (WKCM2)
Introducing: The new and improved WKCM: WKCM2.  
This script allows WaniKani members to contribute their own mnemonics, to view other peoples contributions and to vote them up or down.  
The original WKCM was created in 2015 by Samuel H. but is not functional any more.  
This is a complete from scratch reimplementation, that is based on some of the originals features, with more to come in the future. 

Google Spreadsheet used as Database: [WKCM2 Sheet](https://docs.google.com/spreadsheets/d/13oZkp8eS059nxsYc6fOJNC3PjXVnFvUC8ntRt8fdoCs/edit?usp=sharing)  
It is editable only by the owner, me. But viewable and copyable by everyone. Only the WKCM2 sheet (tab) is used.  
Why a Google Spreadsheet? It is free. It is public, everyone can verify, that there is no harmfull code in there. Only one person has direct write access. But it could still be copied by everyone, should I vanish, or loose interest to maintain it. 

## Usage instructions
WKCM2 requires WKOF: [WKOF installation](https://community.wanikani.com/t/installing-wanikani-open-framework/28549)  
If a Mnemonic is particularly large and gets cut off. You can hover over the mnemonic with the mouse curser and just scroll down. Even though there is no scrollbar indicating this, it still works.  
Requests are only possible, as long as no mnemonic got submitted yet.  
It is only possible to vote on other peoples mnemonics. You can only vote up or down once, but it is possible to change your vote later.  

Submission of new data can take a while. (Like requests, voting, or new mnemonics). Especially when many people use it at the same time. Just be patient. And even if the displayed content, doesn't change, the insert likely has worked.  
### Clearing the cache
If you are doubtful, that the currently displayed content is up to date, you can manually clear the local cache, by opening your browsers javascript console with `F12`, paste the following line of code: `wkof.file_cache.delete(/^wkcm2-/);`, execute it and reload the page.  
Generally this shouldn't be necessary and I will implement a button to do this in future versions.  

### Submitting / Editing Mnemonics
For writing mnemonics a custom markup is used. It can be added to the textbox by using the buttons or by writing it by hand. On Hover over the buttons the functionality is explained. It will add tags around the content to be formatted like the following:  
`[b]this text is bold[/b]`, `[kan]this is a kanji and will be pink[/kan]`  
All newlines will be automatically replaced by `[n]` during insert. `[n]` indicates a newline. It is addable by the `\n` button. If you prefer, you can also use the HTML-like `[br]` tag.  
To wrap something in tags after you already wrote it, simply highlight it and press the corresponding button. It will surround the selected text with the right tag.  
To prevent HTML from entering the DB, everything between Angled brackets will be deleted: `<Will be deleted>`.  
The maximum length for mnemonics is 5000 characters and you can submit up to 5 mnemonics for each item.  
You can edit mnemonics, that you wrote as often as you like.  

## Differences compared to WKCM
- It works
- Completely new implementation; Maintainable
- Possibility to add Meaning mnemonics for Radicals. 
- Each user can submit multiple mnemonics. 
- Data in sheet is saved, making use of JSONs. Easier to work with & more robust. 
- To protect from XSS attacks, instead of HTML tags a custom markup syntax is used for highlighting. 
- *All* HTML tags will be removed during insert into the DB spreadsheet. 
- Content will be displayed within Iframes to further narrow down the possibilities for XSS exploits.
- Caches data from spreadsheet to make the script more responsive. 
- Old legacy Mnemonics that were by users "c" or "ript:void(0)" (caused by bug) are displayed as being by Anonymous. 
- Scores/Votes are now properly recorded with the user who voted being saved in the sheet. Allowing for only one vote per person and changing of the vote. 

## Data in sheet

Form for Mnemonics in the \*_Mnem column:  
```JSON5
{
    "Dakes": ["This is a mnemonic", "maybe a second one"], 
    "Anonymous": ["Anon's mnem"]
}
```
Form for requested items in the \*_Mnem column:  
```JSON5
{
    "!": ["Dakes", "Anonymous", "DerTester"]
}
```

Form for votes in the \*_Votes column. Each user can only vote with -1 or 1 (+1). Anonymous represents the legacy score from WKCM, that gets carried over into the new version this way. Thus it can be larger or smaller.  
```JSON5
{
    "Dakes": [   // votes received by Dakes. Cannot contain Dakes (Exception Anonymous)
        { "Anonymous": 5, "DerTester": -1 },   // votes for first mnem by Dakes
        { "Anonymous": 2, "DerTester": 1 }     // votes for second mnem by Dakes
    ],
    "Anonymous": [
        { "Dakes": 1, "DerTester": 1}
    ]
}
```

Form for score in the \*_Score column. Automatically calculated by apps script from \*_Votes column. Only this is returned to user.  

```JSON5
{
    "Dakes":[4, 3],
    "Anonymous":[2]
}
```

The `Last_Updated` column was carried over from the legacy WKCM data but is currently unused. 

### API
Current API URL: `https://script.google.com/macros/s/AKfycby_Kqff92G40TGXr0PSulvQ2gqx6bkHVEl6LplZ-zc5ZIHhJGwe7AA8I4nDErKMiu2GEw/exec`  
The only way for data to go into the sheet is via the apps script api, through the `WKCM2_handler.gs` file. It will receive all data as URL parameters, clean and escape them before putting them into the sheet.  
Since version 0.3, a read only WaniKani API key is required for write operations, instead of the username. The Google Apps script will automatically fetch the username from WaniKani. This is to make abuse harder and to make it possible to ban people who try to abuse the system. 
`<apps_script_url>?exec=put&item=🍜&type=r&apiKey=<long-string-of-chars>&mnemType=m&mnemIndex=0&mnem=Your very creative Mnemonic`
#### get mnemonic
returns a json with data of columns: Type, Item, Meaning_Mnem, Meaning_Votes, Meaning_Score, Reading_Mnem, Reading_Votes, Reading_Score, Last_Updated.  
`exec = get`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
### get all mnemonics
returns a json of all available items with the key being Type+Item. This might take up to 60s or longer.  
`exec = getall`
#### put/update mnemonic
`exec = put`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`apiKey = <long-string-of-chars>` Your WaniKani API key, to authenticate you as a real WK user  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` (The nth of your mnemonics. 1 for second one. If -1, submit new one. New index would work as well)  
`mnem = "Your very creative Mnemonic" / "Or a correction of an existing mnemonic"`  
If you use a "!" as the Mnemonic it becomes a request. 
#### delete mnemonic
`exec = del`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`apiKey = <long-string-of-chars>` Your WaniKani API key, to authenticate you as a real WK user  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` (The nth of your mnemonics. 1 for second one. If -1, submit new one. New index would work as well)  
#### vote
`exec = vote`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`apiKey = <long-string-of-chars>` Your WaniKani API key, to authenticate you as a real WK user  
`mnemUser = Anonymous` The user whose mnem you are voting  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` The nth mnemonic by mnemUser. (1 for second one. )  
`vote = -1/0/1` Your new voting for the mnem.   
#### request
`exec = request`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`apiKey = <long-string-of-chars>` Your WaniKani API key, to authenticate you as a real WK user  
`mnemType = m/r` (Meaning/Reading)  

## Building instruction
WKCM2 uses TypeScript now, for easier development. That means, if you want to build it yourself or change the code, the TypeScript and SCSS Code must first be transpiled, before it can be used. 
This requires an npm installation. Running `npm run build:release` in the root of the project will build the release version and store the final file in `dist/WKCM2.user.js`. 

Running `npm start` will start a development server, that will continually rebuild the script on file changes into `dist/WKCM2_dev.user.js`. It will also start a development server, to host the file locally, so you don't have to change the Tampermonkey Code on every change. Just add the autogenerated script `dist/dev.user.js` to Tampermonkey. 

## Roadmap

<details>
  <summary>Past versions</summary>

### 0.1 🍱
- Works read only with old data from WKCM
- Works in Lessons and Reviews
- Google Sheet apps script can fetch data
- Mnemonic data gets cached

### 0.2 🍛
- 💾 Changed how Data is saved in DB. Now saved as JSON strings, making everything easier to work with and more robust. 
- 📝 Users can submit new mnemonics, up to 5 per user. Also for Radicals. 
- 🗳️ Users can vote on mnemonics
- ❗ Users can request mnemonics
- 💣 Sheet apps script API inserts and filters data submitted, to protect from XSS attacks. 
- 💅 Polish, ✨ Polish, 🇵🇱 Polish

#### 0.2.1 🍛🍚
- ◄ ► fixed arrows being toggled with mutliple requests. 
- 📜 added GPL license

#### 0.2.2 🍛🍚🍚
- Fixed shortcuts being activated in textarea

#### 0.2.3 🎄 🎁🍛🍚🍚🎁
- 📝 Mnemonics are displayed on the item pages. 
- ✨ Visually looks much prettier. 🤤 Text highlight color more vibrant. Width dynamic. All Buttons have sick effects on click and hover. 
- ❓ Added `?` insert button. Because ? toggles shortcut help menu.
- Focus textarea after insert. 
#### 0.2.4 🍛🍚🍚🍚
- fix unintentional use of wkItemInfo. 
- add compatibility with "image radicals"
- If item or type is null, throws an exception. 

#### 0.2.5 🍛🍚🍚🍚🍚
- Make item pages compatible with WaniKani's move to React. 
</details>

### 0.3.0 🫖🍵🍘
- 📜 Move Codebase to Typescript.
- 📝 In Lessons and Reviews, only display Reading- and Meaning-CM, whenever Reading or Meaning should be visible. 
- ❗ Display an icon on list screens (level, kanji, voc. or rad. pages) if a mnemonic is available or requested.
- ♻ Users can delete their own mnemonics

#### 0.3.1 🫖🍵🍘 (current version)
- Make compatible with WaniKanis 03.2023 Turbo update
- Uses "WK Item Info Injector" now (thanks Sinyaven) [WK Item Info Injector](https://community.wanikani.com/t/for-userscript-authors-wk-item-info-injector)
- Thanks to Item Info Injector works now on Extra Study pages as well. 

#### 0.3.2
- Fix bug: badges not showing on list page

#### 0.4.0
- Adapt updated WaniKani pages
- Change styling
- Caching for getall on the apps script side

#### 0.4.1
- Fix kanji type in lesson
- Don't include error entries in caching on apps script

### 1.0
- 🚫 Sheet apps script regularly cleans database from HTML tags
- 🚫 Sheet apps script deletes Mnemonics with rating of -10 or below
- At least the same functionality, feature wise, as WKCM
- 💅 More polish

### 1.1
- display of user stats, like written mnemonics or received votes
- "Hall of Fame" with most active users
- sort Mnemonics by score

## Known Bugs
- when switching between items quickly, it can happen, that the first item finishes loading after the current one. (Especially when the current one was cached). Then the display update is triggered for the old one causing the display of the old mnemonic. (Should not happen often any more)
- Score calculation does not lock DB (originally intentionally). Leads to #ERROR! returned in \*_Score when it wasn't calculated fast enough.  

### Sweeper TODO
- add sweeper. Regularly runs through DB and cleans it etc. 
- delete rows without \*_Mnem ("" or {})
- delete downvoted mnems
## Other TODO
- Apps Script: Return error if voted on mnemonic does not exist any more. (In case a user deleted theirs) Handle error on clientside and redownload data.
- build a tool that lets people bulk export their notes so that I can import them to the existing data set.  
- Think about adding a "Request Deletion" Button
- Colorize items with especially high or low scores
- Randomize default messages with alternatives
- Think about handling image links
- Add sorting by rating
- Button for force refresh
- Manual cache delete and fill (In wkof settings?)
