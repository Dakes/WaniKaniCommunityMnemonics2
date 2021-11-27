# WaniKaniCommunityMnemonics2 (WKCM2)
Introducing: The new and improved WKCM2.  
This script allows WaniKani members to contribute their own mnemonics which appear on any page that includes item info.  
The original WKCM was created in 2015 by Samuel H. but is not functional any more.  
This is a complete from scratch reimplementation of the original's features. 

## Differences compared to WKCM
- It works
- Completely new implementation; Maintainable
- Possibility to add Meaning mnemonics for Radicals. 
- Both Reading and Meaning Mnemonics now always get displayed next to each other, no matter what tab is activated.
- To protect from XSS attacks, instead of HTML tags a custom markup syntax is used for highlighting. 
- *All* HTML tags will be removed during insert into the DB spreadsheet. 
- Content will be displayed within Iframes to further narrow down the possibilities for XSS exploits.
- Caches data from spreadsheet to make the script more responsive. 
- Old legacy Mnemonics that were by users "c" or "ript:void(0)" (caused by bug) are displayed as Anonymous. 

## Roadmap

### Current state
- Buttons go brrrrrr
- GUI elements in place
- Adapted old Data to new Markup
- sheet apps script can fetch data
- Mnemonics get fetched, cached and displayed

### 0.1
- Works in Lessons and Reviews
- Works read only with data from WKCM
- Google Sheet apps script can fetch data
- Script checks for updates

### 0.2
- Users can submit new mnemonics
- Users can vote on mnemonics
- Users can request mnemonics
- Sheet apps script inserts and filters data submitted, to protect from XSS attacks

### 0.3
- Display mnemonics on list screens
- Display if mnemonic is available or requested

### 1.0
- Sheet apps script regularly cleans database from HTML tags
- Sheet apps script deletes Mnemonics with rating of -5 or below
- At least the same functionality of WKCM

### 1.1
- display of user stats, like written mnemonics or received votes
- "Hall of Fame" with most active users

## Other TODO
- build a small tool that lets people bulk export their notes so that I can import them to the existing data set.  
- Maybe do something with Timestamp in DB??
- Think about adding a "Request Deletion" Button
