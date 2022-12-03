# WaniKaniCommunityMnemonics2 (WKCM2)
Introducing: The new and improved WKCM: WKCM2.  
This script allows WaniKani members to contribute their own mnemonics, to view other peoples contributions and to vote them up or down.  
The original WKCM was created in 2015 by Samuel H. but is not functional any more.  
This is a complete from scratch reimplementation, that is based on some of the originals features, with more to come in the future. 

Google Spreadsheet used as Database: [WKCM2 Sheet](https://docs.google.com/spreadsheets/d/13oZkp8eS059nxsYc6fOJNC3PjXVnFvUC8ntRt8fdoCs/edit?usp=sharing)  
It is editable only by the owner, me. But viewable and copyable by everyone. Only the WKCM2 sheet (tab) is used.  
Why a Google Spreadsheet? It is free. It is public, everyone can verify, there is no harmfull code in there. Only one person has direct write access. But it could still be copied by everyone, should I vanish, or loose interest to maintain it. 

## Usage instructions
WKCM2 requires WKOF: [WKOF installation](https://community.wanikani.com/t/installing-wanikani-open-framework/28549)  
If a Mnemonic is particularly large and gets cut off. You can hover over the mnemonic with the mouse curser and just scroll down. Even though there is no scrollbar indicating this, it still works.  
Requests are only possible, as long as no mnemonic got submitted yet.  
It is only possible to vote on other peoples mnemonics. You can only vote up or down once, but it is possible to change your vote later.  

Submission of new data can take a while. (Like requests, voting, or new mnemonics). Especially when many people use it at the same time. Just be patient. And even if the displayed content, doesn't change, the insert might still have worked.  
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
Deleting will be added in version 0.3

## Differences compared to WKCM
- It works
- Completely new implementation; Maintainable
- Possibility to add Meaning mnemonics for Radicals. 
- Each user can submit multiple mnemonics. 
- Both Reading and Meaning Mnemonics now always get displayed next to each other, no matter what tab is activated.
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
The only way for data to go into the sheet is via the apps script api, through the `WKCM2_handler.gs` file. It will receive all data as URL parameters, clean and escape them before putting them into the sheet.  
`*apps_script_url*?exec=put&item=🍜&type=r&user=Dakes&mnemType=m&mnemIndex=0&mnem=Your very creative Mnemonic`
#### get mnemonic
returns a json with data of columns: Type, Item, Meaning_Mnem, Meaning_Votes, Meaning_Score, Reading_Mnem, Reading_Votes, Reading_Score, Last_Updated.  
`exec = get`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
### get all mnemonics
returns a json of all available items with the key being Type+Item.  
`exec = getall`
#### put/update mnemonic
`exec = put`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`user = Dakes` You  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` (The nth of your mnemonics. 1 for second one. If -1, submit new one. New index would work as well)  
`mnem = "Your very creative Mnemonic" / "Or a correction of an existing mnemonic"`  
If you use a "!" as the Mnemonic it becomes a request. 
#### vote
`exec = vote`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`user = Dakes` you  
`mnemUser = Anonymous` The user whose mnem you are voting  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` The nth mnemonic by mnemUser. (1 for second one. )  
`score = -1/0/1` Your new voting for the mnem.   
#### request
`exec = request`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`user = Dakes` You  
`mnemType = m/r` (Meaning/Reading)  

## Building instruction
WKCM2 uses TypeScript now, for easier development. That means, if you want to build it yourself or change the code, the TypeScript and SCSS Code must first be transpiled, before it can be used. 
This requires an npm installation. Running `npm run build:release` in the root of the project will build the release version and store the final file in `dist/WKCM2.user.js`. 

Running `npm start` will start a development server, that will continually rebuild the script on file changes into `dist/WKCM2_dev.user.js`. It will also start a development server, to host the file locally, so you don't have to change the Tampermonkey Code on every change. Just add the autogenerated script `dist/dev.user.js` to Tampermonkey. 

## Roadmap

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

#### 0.2.5 🍛🍚🍚🍚🍚 (current version)
- Make item pages compatiple to WaniKani's move to React. 

### 0.3
- 📜 Move Codebase to Typescript.
- 📝 Display on list screen if mnemonic is available or requested. 
- ❗ Display if mnemonic is available or requested in list. 
- ♻ Users can delete their own mnemonic
- 🔁 Manual refresh button. 


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
- Score calculation does not lock DB (originally intentionally). Leads to #ERROR! returned in \*_Score when it wasn't calculated fast enough. Either implement lock in calculation, with speed penalty overall, or wait in Userscript. 

### Sweeper TODO
- add sweeper. Regularly runs through DB and cleans it etc. 
- delete rows without \*_Mnem ("" or {})
- delete downvoted mnems
- (delete requests, that still exist despite other mnems [shouldn't happen anyway])
## Other TODO
- build a tool that lets people bulk export their notes so that I can import them to the existing data set.  
- Maybe do something with Timestamp in DB??
- Think about adding a "Request Deletion" Button
- Colorize items with especially high or low scores
- Randomize default messages with alternatives
- Think about handling image links
- Add sorting by rating
- Button for force refresh
- Manual cache delete and fill (In wkof settings?)
