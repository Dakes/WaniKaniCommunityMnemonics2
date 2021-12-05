//  1. Enter sheet name where data is to be written and read below
let SHEET_NAME = "WKCM2";

// Regex matching every html tag, except the ones for highlighting
// var regex = new RegExp(/(<(?!(?:\/?(span|b|i|u|s))\b)[^>]+>)/gmi);


// var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

/*
parameters:
get: item, type
put handles, mnemonic submission, edits, and requests
put: user, item, type, mnemType, mnem
request, if mnem === "!"
vote: user, item, type, mnemType, mnemUser, score
score=1/-1, mnemUser=User whos mnem is being voted
 */

// If you don't want to expose either GET or POST methods you can comment out the appropriate
function doGet(e)
{
    return handleResponse(e);
}

function doPost(e)
{
    return handleResponse(e);
}

function handleResponse(e)
{

  if (!e.parameter.exec)
  {
    return getError();
  }

  let ac=SpreadsheetApp.getActive();
  // let sheet=ac.getActiveSheet();
  let sheet=ac.getSheetByName(SHEET_NAME);

  if (e.parameter.type)
    if (e.parameter.type != "k" && e.parameter.type != "v" && e.parameter.type != "r")
      return getError();

  // clean input Data
  let type = cleanData(e.parameter.type);
  let item = cleanItem(e.parameter.item);

  let user = cleanData(e.parameter.user);
  let mnemType = cleanData(e.parameter.mnemType);
  let mnemIndex = cleanData(e.parameter.mnemIndex);
  let mnem = cleanData(e.parameter.mnem);

  let mnemUser = cleanData(e.parameter.mnemUser);
  let score = cleanData(e.parameter.score);

  if (e.parameter.exec == "get")
  {
    if (!item)
    {
      return getError();
    }
    return getData(sheet, type, item);
  }
  else if (e.parameter.exec == "put")
  {
    if (user && item && type && mnemType && mnemIndex && mnem)
    {
      return putMnem(sheet, user, item, type, mnemType, mnemIndex, mnem);
    }
    else
      return getError();
  }
  else if (e.parameter.exec == "vote")
  {
    // user, item, type, mnemType, mnemUser, score
    if(user && item && type && mnemType && mnemUser && score)
    {
      return vote(sheet, user, item, type, mnemType, mnemUser, score);
    }
    else
      return getError();
  }
  else
    return getError();

}
// handleResponse ▲

// Function to run during development
function test()
{
  let ac=SpreadsheetApp.getActive();
  let sheet=ac.getSheetByName('WKCM2');

  let user = "Dakes";
  let item = "🍜";
  item = "🍱";
  let type = "r";
  let mnemIndex = "0";
  let mnemType = "m";
  let mnemUser = "Dakes";
  let score = "1";
  let mnem = "🍙 Onigiri 🍙 ";
  //mnem = "!";

  // vote(sheet, user, item, type, mnemIndex, mnemType, mnemUser, score);
  putMnem(sheet, user, item, type, mnemType, mnemIndex, mnem);
  // let data = getData(sheet, type, item);
  // console.log("data: ", data);
}

function getError(msg="")
{
  return ContentService.createTextOutput( "error" + msg ).setMimeType(ContentService.MimeType.TEXT);
}
function getSuccess()
{
  return ContentService.createTextOutput( "success" ).setMimeType(ContentService.MimeType.TEXT);
}

function getData(sheet, type, item)
{
  let json_data = null;
  if (type != "" && item == "")
  {
    // TODO: get all items of one type
    // for now just returns all data
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

  // delete votes. only scores are relevant to client
  delete json_data[0]["Meaning_Votes"];
  delete json_data[0]["Reading_Votes"];
  json_data = json_data[0]

  // send back data to client
  return ContentService.createTextOutput(JSON.stringify(json_data) ).setMimeType(ContentService.MimeType.JSON);

}
// getData ▲

/**
 * @param user: user who is voting
 * @param mnemUser: user whos mnem is being voted on.
 * @param mnemType: meaning / reading
 * @param mnemIndex: User can submit multiple mnems, index of mnem to use, usually 0.
 */
function vote(sheet, user, item, type, mnemIndex, mnemType, mnemUser, score)
{
  mnemIndex = Number(mnemIndex);
  if (user == mnemUser)
    return getError();
  if (Number(score) < -1 || Number(score) > 1)
    return getError();
  if (mnemIndex > 10)
    return getError();

  let row = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);
  let votes_col = getFullMnemType(mnemType) + "_Votes";
  let votes_string = getCellValueByColumnName(sheet ,votes_col, row);
  let votes_json = {};
  if (votes_string)
    votes_json = JSON.parse(votes_string);

  if (mnemIndex == null)
    mnemIndex = 0;
  if (typeof mnemIndex == "string")
  {
    mnemIndex = Number(mnemIndex);
    if (Number.isNaN(mnemIndex))
      mnemIndex = 0;
  }

  // check if mnemUser actually in mnemonics
  let mnem_col = getFullMnemType(mnemType) + "_Mnem";
  let mnem_string = getCellValueByColumnName(sheet ,mnem_col, row);

  // if mnem_string is empty, no mnem exists anyway, return
  if (!mnem_string)
    return getError();

  let mnem_json = JSON.parse(mnem_string);

  if (mnem_json.hasOwnProperty(mnemUser))
  {
    // check if entry for this user exists, otherwise create
    if (!votes_json[mnemUser])
    {
      votes_json[mnemUser] = new Array(mnemIndex+1);
      for (let i=0; i<mnemIndex+1; i++)
        votes_json[mnemUser][i] = {};
    }

    // put new data in / update
    if (!votes_json[mnemUser][mnemIndex])
      votes_json[mnemUser][mnemIndex] = {};
    votes_json[mnemUser][mnemIndex][user] = score;
  }

  let new_vote_string = JSON.stringify(votes_json);
  setCellValueByColumnName(sheet, votes_col, row, new_vote_string)

    return getSuccess();
}
// vote ▲
/**
 *
 * writes data into db.
 * Existing mnem: new mnem, update mnem
 * New mnem: mnem
 * Request: new request or add to request
 * @param mnem: String containing one mnemonic
 */
function putMnem(sheet, user, item, type, mnemType, mnemIndex, mnem)
{
  // TODO: clean user submitted data with user
  mnemIndex = Number(mnemIndex);
  if (mnemIndex > 10)
    return getError();

  let row = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);
  let mnem_col = getFullMnemType(mnemType) + "_Mnem";
  let mnem_string = "";
  if (row.length != 0)
  {
    mnem_string = getCellValueByColumnName(sheet ,mnem_col, row);
  }
  let mnem_json = {};
  if (mnem_string)
    mnem_json = JSON.parse(mnem_string);

  // request
  if (mnem == "!")
  {
    // if mnemonic exists no request possible
    if (!mnem_json.hasOwnProperty("!") && Object.keys(mnem_json).length > 0)
      return getError();
    // create new request, if none exists, else concat user to existing
    if (Object.keys(mnem_json).length == 0)
      mnem_json["!"] = [user];
    else
      mnem_json["!"] = mnem_json["!"].concat(user);

  }
  else // not request (mnemonic)
  {
    // if not existent initialize array for mnemonics
    if (!mnem_json[user])
    {
      mnem_json[user] = new Array(mnemIndex+1)
      for (let i=0; i<mnemIndex+1; i++)
        mnem_json[user][i] = "";
    }
    mnem_json[user][mnemIndex] = mnem;
  }

  let new_mnem_string = JSON.stringify(mnem_json);

  // case mnem already exists
  if (row.length != 0)
  {
    setCellValueByColumnName(sheet, mnem_col, row, new_mnem_string)
  }
  // no entry for this item at all
  else
  {
    // add new row in the bottom
    let row_count = sheet.getMaxRows();
    sheet.insertRowAfter(row_count);

    setCellValueByColumnName(sheet, mnem_col, row_count+1, new_mnem_string);
    setCellValueByColumnName(sheet, "Type", row_count+1, type);
    setCellValueByColumnName(sheet, "Item", row_count+1, item);
  }

  return getSuccess();
}
// putMnem ▲

function setup()
{
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

// helper functions ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

// returns full json
function getAllRows(sheet)
{
  // {"k海": normalJson, "k点": normalJson}
  var rg=sheet.getDataRange();
  var vA=rg.getValues();
  let data = {};

  for(var i=2;i<vA.length;i++)
  {
    let rowData = [];
    rowData.push(sheet.getSheetValues(1, 1, 1, 8)[0]);
    rowData.push(sheet.getSheetValues(i, 1, 1, 8)[0]);
    let rowJson = getJsonArrayFromData(rowData)[0];

    data[ rowJson["Type"]+rowJson["Item"] ] = rowJson;
  }
  return data;
}
// getAllRows ▲
