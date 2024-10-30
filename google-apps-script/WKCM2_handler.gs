//  1. Enter sheet name where data is to be written and read below
let SHEET_NAME = "WKCM2";

// Regex matching every html tag, except the ones for highlighting
// var regex = new RegExp(/(<(?!(?:\/?(span|b|i|u|s))\b)[^>]+>)/gmi);


// var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

/*
exec parameters:
"get": item, type
"put" handles, mnemonic submission, edits, and requests
"put": api key, item, type, mnemType, mnem
request, if mnem === "!"
"vote": api key, item, type, mnemType, mnemUser, score
score=1/-1, mnemUser=User whos mnem is being voted on
"delete": api key, item, type, mnemType, mnemIndex (The nth mnem of user)
 */

// If you don't want to expose either GET or POST methods you can comment out the appropriate

// get only downloads data, no lock needed.
function doGet(e)
{
    return handleResponse(e);
}

function doPost(e)
{
    return handleResponseWaitLock(e);
}

function handleResponseWaitLock(e)
{
  const lock = LockService.getScriptLock();
  // try for 1 minute
  let success = lock.tryLock(1000 * 60);
  if (!success)
  {
    Logger.log('Could not obtain lock after 1 Minute.');
    return getError(", could not obtain lock after 1 Minute.");
  }

  let resp = handleResponse(e)
  lock.releaseLock();
  return resp;
}

function handleResponse(e)
{
  if (!e.parameter.exec)
  {
    return getError(", no exec parameter provided");
  }

  let ac = SpreadsheetApp.getActive();
  let sheet = ac.getSheetByName(SHEET_NAME);

  // Clean input data
  let type = checkItemType(cleanData(e.parameter.type));
  if (e.parameter.type)
    if (e.parameter.type != "k" && e.parameter.type != "v" && e.parameter.type != "r")
      return getError(", type parameter must be k, v or r. ");
  let item = cleanItem(e.parameter.item);

  let user = null;
  let apiKey = cleanData(e.parameter.apiKey);
  if (apiKey)
  {
    user = getUser(apiKey);
    console.log("User:", user);
  }
  console.log("Function:", e.parameter.exec, ". User:", user);
  let mnemType = checkMnemType(cleanData(e.parameter.mnemType));
  let mnemIndex = cleanMnemIndex(e.parameter.mnemIndex);
  let mnem = cleanData(e.parameter.mnem);

  let mnemUser = cleanData(e.parameter.mnemUser);
  let vote = cleanScore(e.parameter.vote);

  if (e.parameter.exec == "get")
  {
    if (!item)
    {
      return getError();
    }
    return getData(sheet, type, item);
  }
  else if (e.parameter.exec == "getall")
  {
    // Modified to use caching
    return getAllRowsCached(sheet);
  }
  else if (e.parameter.exec == "put")
  {
    if (user && item && type && mnemType && mnemIndex >= -1 && mnem)
    {
      return putMnem(sheet, user, item, type, mnemType, mnemIndex, mnem);
    }
    else
      return getError(", at least one of the parameters is not valid");
  }
  else if (e.parameter.exec == "vote")
  {
    // user, item, type, mnemType, mnemUser, score
    if(user && item && type && mnemType && mnemUser && vote && mnemIndex >= 0)
    {
      return voteMnem(sheet, user, item, type, mnemIndex, mnemType, mnemUser, vote);
    }
    else
      return getError(", at least one of the parameters is not valid");
  }
  else if (e.parameter.exec == "request" || e.parameter.exec == "req")
  {
    if (user && item && type && mnemType)
    {
      return putMnem(sheet, user, item, type, mnemType, 0, "!");
    }
    else
      return getError(", one of user, item, type, mnemType was not provided or wrong");
  }
  else if (e.parameter.exec == "delete" || e.parameter.exec == "del")
  {
    if (user && item && type && mnemType && mnemIndex >= 0)
    {
      return deleteMnem(sheet, user, item, type, mnemType, mnemIndex);
    }
    else
      return getError(", one of user, item, type, mnemType or mnemIndex was not provided or wrong");
  }
  else
    return getError();

}
// handleResponse ▲

function getError(msg="")
{
  return ContentService.createTextOutput( "Error" + msg ).setMimeType(ContentService.MimeType.TEXT);
}
function getSuccess(msg="")
{
  return ContentService.createTextOutput( "Success" + msg ).setMimeType(ContentService.MimeType.TEXT);
}

function getData(sheet, type, item)
{
  let json_data = null;
  if (type != "" && item == "")
  {
    // TODO: get all items of one type
    // For now, just returns all data
    json_data = getAllRows(sheet);
  }
  else if (type == "" && item == "")
  {
    json_data = getAllRows(sheet);
  }
  else // (if (type != "" && item != "") )
  {
    let data = getRowsWhere(sheet, type, item);
    json_data = getJsonArrayFromData(data);
  }

  // In case of no mnem, empty array: []
  // Delete votes; only scores are relevant to client
  if (json_data[0] != null)
  {
    // delete json_data[0]["Meaning_Votes"];
    // delete json_data[0]["Reading_Votes"];
    json_data = json_data[0];
  }
  else if (type != "" && item != "")
    json_data = null;

  // Send back data to client
  return ContentService.createTextOutput(JSON.stringify(json_data)).setMimeType(ContentService.MimeType.JSON);

}
// getData ▲

/**
 * @param user: user who is voting
 * @param mnemUser: user whose mnem is being voted on.
 * @param mnemType: meaning / reading
 * @param mnemIndex: User can submit multiple mnems, index of mnem to use, usually 0.
 */
function voteMnem(sheet, user, item, type, mnemIndex, mnemType, mnemUser, vote)
{
  let votes_json = getDataJson(sheet, item, type, getFullMnemType(mnemType) + "_Votes");
  let mnem_json = getDataJson(sheet, item, type, getFullMnemType(mnemType) + "_Mnem");

  // If mnem_string is empty, no mnem exists anyway, return
  if (Object.keys(mnem_json).length == 0)
    return getError();

  // Only vote if mnemUser actually owns a mnem
  if (mnem_json.hasOwnProperty(mnemUser))
  {
    // Check if entry for this user exists, otherwise create
    if (!votes_json[mnemUser])
      votes_json[mnemUser] = new Array(mnem_json[mnemUser].length).fill(null).map(()=> ({}));

    // Put new data in / update
    if (!votes_json[mnemUser][mnemIndex])
      votes_json[mnemUser][mnemIndex] = {};
    votes_json[mnemUser][mnemIndex][user] = vote;
  }

  setVotesJson(sheet, item, type, mnemType, votes_json)
  return getSuccess();
}
// vote ▲

/**
 *
 * Writes data into db.
 * Existing mnem: new mnem, update mnem
 * New mnem: mnem
 * Request: new request or add to request
 * @param mnem: String containing one mnemonic
 */
function putMnem(sheet, user, item, type, mnemType, mnemIndex, mnem)
{
  let mnem_json = getDataJson(sheet, item, type, getFullMnemType(mnemType) + "_Mnem");

  // Request
  if (mnem == "!")
  {
    // If mnemonic exists, no request possible
    if (!mnem_json.hasOwnProperty("!") && Object.keys(mnem_json).length > 0)
      return getError();
    // Create new request, if none exists, else add user to existing
    if (Object.keys(mnem_json).length == 0)
      mnem_json["!"] = [user];
    else
    {
      if (!mnem_json["!"].includes(user))
        mnem_json["!"] = mnem_json["!"].concat(user);
    }

  }
  else // Not request (mnemonic)
  {
    // If not existent, initialize array for mnemonics
    if (!mnem_json[user])
    {
      mnem_json[user] = new Array(mnemIndex+1)
      for (let i=0; i<mnemIndex+1; i++)
        mnem_json[user][i] = "";
    }
    if (mnem_json[user].length > mnemMaxCount && mnemIndex < 0)
      return getError(", maximum Number of mnems for user reached: "+mnemMaxCount.toString());
    // Append new mnem if mnemIndex == -1
    if (mnemIndex < 0)
      mnem_json[user] = mnem_json[user].concat(mnem);
    else
      mnem_json[user][mnemIndex] = mnem;

    // New mnem got submitted, delete request (also works without request)
    delete mnem_json["!"];
  }

  setMnemJson(sheet, item, type, mnemType, mnem_json);

  return getSuccess();
}
// putMnem ▲

function deleteMnem(sheet, user, item, type, mnemType, mnemIndex)
{
  let mnemJson = getDataJson(sheet, item, type, getFullMnemType(mnemType) + "_Mnem");
  let votesJson = getDataJson(sheet, item, type, getFullMnemType(mnemType) + "_Votes");

  mnemJson[user].splice(mnemIndex, 1);
  if (votesJson[user] != undefined)
    votesJson[user].splice(mnemIndex, 1);

  if (mnemJson[user].length == 0) {
    delete mnemJson[user];
    delete votesJson[user];
  }

  setMnemJson(sheet, item, type, mnemType, mnemJson);
  setVotesJson(sheet, item, type, mnemType, votesJson);
  // TODO: remove row, if no mnem exists any more

  return getSuccess();
}
// deleteMnem ▲

function setup()
{
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

// Helper functions ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

// Modified getAllRows to fetch all data at once
function getAllRows(sheet)
{
  // {"k海": normalJson, "k点": normalJson}
  var vA = sheet.getDataRange().getValues();
  let data = {};
  let headers = vA[0];

  for(var i = 1; i < vA.length; i++)
  {
    let row = vA[i];
    let rowJson = {};
    for(let j = 0; j < headers.length; j++)
    {
      rowJson[headers[j]] = row[j];
    }

    data[ rowJson["Type"] + rowJson["Item"] ] = rowJson;
  }
  return data;
}
// getAllRows ▲

function getAllRowsCached(sheet)
{
  const cache = CacheService.getScriptCache();
  const cacheKeyPrefix = 'getall_cache_';
  const types = ['k', 'v', 'r'];

  let allData = {};

  // Attempt to retrieve all type-specific caches
  let cacheKeys = types.map(type => cacheKeyPrefix + type);
  let cachedData = cache.getAll(cacheKeys);

  let cacheMiss = false;

  types.forEach(type => {
    if (cachedData[type]) {
      // Parse and merge cached data
      let parsed = JSON.parse(cachedData[type]);
      for (let key in parsed) {
        allData[key] = parsed[key];
      }
    }
    else {
      cacheMiss = true;
    }
  });

  if (!cacheMiss) {
    Logger.log('Returning cached getall data');
    return ContentService.createTextOutput(JSON.stringify(allData)).setMimeType(ContentService.MimeType.JSON);
  }
  else {
    Logger.log('Fetching new getall data');
    const fullData = getAllRows(sheet);

    // Validate data: ensure no score fields contain "#ERROR!"
    if (hasErrorInScores(fullData))
    {
      Logger.log('Data contains #ERROR! in score fields. Not caching the response.');
      return getError(", Score calculations not completed yet.");
    }

    // Split data by type
    let splitData = splitDataByType(fullData, types);

    // Cache each type separately
    types.forEach(type => {
      let typeData = splitData[type];
      if (typeData && Object.keys(typeData).length > 0) {
        let jsonData = JSON.stringify(typeData);
        // Ensure each cache entry is under 100KB
        if (jsonData.length <= 100 * 1024) {
          cache.put(cacheKeyPrefix + type, jsonData, 60 * 60 * 24 * 2); // Cache for two days
          Logger.log('Caching getall data for type ' + type + ' for two days');
        }
        else {
          Logger.log('Data for type ' + type + ' exceeds cache size limit. Skipping caching for this type.');
        }
      }
    });

    // Merge all data
    for (let type of types) {
      let typeData = splitData[type];
      if (typeData) {
        for (let key in typeData) {
          allData[key] = typeData[key];
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify(allData)).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Splits the full data into separate objects based on type.
 *
 * @param {Object} fullData - The complete data object.
 * @param {Array} types - Array of types to split by.
 * @returns {Object} - An object with types as keys and their respective data as values.
 */
function splitDataByType(fullData, types)
{
  let splitData = {};
  types.forEach(type => {
    splitData[type] = {};
  });

  for (let key in fullData) {
    let type = key.charAt(0); // Assuming the first character denotes the type
    if (types.includes(type)) {
      splitData[type][key] = fullData[key];
    }
    else {
      // Handle unexpected types if necessary
      Logger.log('Encountered unexpected type: ' + type + ' for key: ' + key);
    }
  }

  return splitData;
}

/**
 * Checks if any score fields contain "#ERROR!".
 *
 * @param {Object} data - The complete data object.
 * @returns {boolean} - Returns true if an error is found; otherwise, false.
 */
function hasErrorInScores(data)
{
  for (let key in data)
  {
    const entry = data[key];
    if (entry["Meaning_Score"] === "#ERROR!" || entry["Reading_Score"] === "#ERROR!")
    {
      return true;
    }
  }
  return false;
}
