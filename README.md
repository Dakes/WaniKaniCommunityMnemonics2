# WaniKaniCommunityMnemonics2 (WKCM2)
Introducing: The new and improved WKCM2.  
This script allows WaniKani members to contribute their own mnemonics which appear on any page that includes item info.  
The original WKCM was created in 2015 by Samuel H. but is not functional any more.  
This is a complete from scratch reimplementation of the original's features. 

Google Spreadsheet used as Database: https://docs.google.com/spreadsheets/d/13oZkp8eS059nxsYc6fOJNC3PjXVnFvUC8ntRt8fdoCs/edit?usp=sharing  
It is editable only by the owner. 

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
- Old legacy Mnemonics that were by users "c" or "ript:void(0)" (caused by bug) are displayed as Anonymous. 
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
returns a json with data of columns: Type, Item, Meaning_Mnem, Meaning_Score, Reading_Mnem, Reading_Score, Last_Updated  
`exec = get`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
#### put/update mnemonic
`exec = put`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`user = Dakes` You  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` (The nth of your mnemonics. 1 for second one. )  
`mnem = "Your very creative Mnemonic" / "Or a correction of an existing mnemonic"`  
#### vote
`exec = vote`  
`item = 林`  
`type = k/v/r` (Kanji, Vocabulary, Radical)  
`user = Dakes` you  
`mnemUser = Anonymous` The user whose mnem you are voting  
`mnemType = m/r` (Meaning/Reading)  
`mnemIndex = 0` (The nth of your mnemonics. 1 for second one. )  
`score = -1/0/1` Your new voting for the mnem.   

## Roadmap

### 0.1
- Works read only with old data from WKCM
- Works in Lessons and Reviews
- Google Sheet apps script can fetch data
- Mnemonic data gets cached
- Script checks for updates

### 0.1.1 (current state)
- new JSON saving method
- apps script can get, put, request and vote. 
- apps script cleans input

### 0.2 (create post in forum)
- Users can submit new mnemonics
- Users can vote on mnemonics
- Users can request mnemonics
- Sheet apps script inserts and filters data submitted, to protect from XSS attacks

### 0.3
- Display mnemonics on list screens
- Display if mnemonic is available or requested
- Users can delete their own mnemonic

### 1.0
- Sheet apps script regularly cleans database from HTML tags
- Sheet apps script deletes Mnemonics with rating of -10 or below
- At least the same functionality of WKCM

### 1.1
- display of user stats, like written mnemonics or received votes
- "Hall of Fame" with most active users
- sort Mnemonics by score

## Other TODO
- build a small tool that lets people bulk export their notes so that I can import them to the existing data set.  
- Maybe do something with Timestamp in DB??
- Think about adding a "Request Deletion" Button
- Colorize items with especially high or low scores
- Randomize default messages with alternatives
- Think about handling image links
- Add sorting by rating
