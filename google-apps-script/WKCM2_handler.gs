//  1. Enter sheet name where data is to be written and read below
var SHEET_NAME = "WKCM2";

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
    return;
  }

  let ac=SpreadsheetApp.getActive();
  // let sheet=ac.getActiveSheet();
  let sheet=ac.getSheetByName('WKCM2');

  if (e.parameter.exec == "get")
  {
    if (!e.parameter.item)
    {
      return;
    }
    return getData(sheet, e.parameter.type, e.parameter.item);
  }
  else if (e.parameter.exec == "put")
  {
    return putData(sheet, e.parameter.type, e.parameter.item);
  }
  else if (e.parameter.exec == "vote")
  {
    // user, item, type, mnemType, mnemUser, score
    if(e.parameter.user && e.parameter.item && e.parameter.type &&
    e.parameter.mnemType && e.parameter.mnemUser && e.parameter.score)
      return vote(sheet, e.parameter.user, e.parameter.item,
      e.parameter.type, e.parameter.mnemType,
      e.parameter.mnemUser, e.parameter.score);
  }

  // let sheet = SpreadsheetApp.getActiveSheet();

}

// Function to run during development
function test()
{
  let ac=SpreadsheetApp.getActive();
  let sheet=ac.getSheetByName('WKCM2');

  let user = "DerTester";
  let item = "🍜";
  let type = "r";
  let mnemIndex = "1";
  let mnemType = "r";
  let mnemUser = "Dakes";
  let score = "1";

  vote(sheet, user, item, type, mnemIndex, mnemType, mnemUser, score);
  // let data = getData(sheet, type, item);
  // console.log("data: ", data);
}

function getError()
{
  return ContentService.createTextOutput( "error" ).setMimeType(ContentService.MimeType.TEXT);
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
/**
 * @param user: user who is voting
 * @param mnemUser: user whos mnem is being voted on.
 * @param mnemType: meaning / reading
 * @param mnemIndex: User can submit multiple mnems, index of mnem to use, usually 0.
 */
function vote(sheet, user, item, type, mnemIndex, mnemType, mnemUser, score)
{
  if (user == mnemUser)
    return getError();
  if (Number(score) < -1 || Number(score) > 1)
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

  console.log(votes_json);

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

  console.log(votes_json);
  let new_vote_string = JSON.stringify(votes_json);
  setCellValueByColumnName(sheet, votes_col, row, new_vote_string)

    return getSuccess;
}

// writes data into db.
// Existing item: new mnem, update mnem
// New item: requested, mnem
function putData(sheet, user, item, type, mnemType, mnem)
{

}

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

function getRowsWhere(sheet, type, item)
{
  let data = [];
  data.push(sheet.getSheetValues(1, 1, 1, 8)[0]);
  // console.log(sheet.getSheetValues(1, 1, 1, 8)[0]);
  let rows = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);
  for (let i=0; i < rows.length; i=i+1)
  {
    data.push(sheet.getSheetValues(rows[i], 1, 1, 8)[0]);
  }
  // console.log(data);
  return data;
}

// if value1="" (type) only match value2 (item)
function rowWhereTwoColumnsEqual(sheet, value1, col1, value2, col2)
{
  // var sheet=SpreadsheetApp.getActive();

  // var sheet=sheet.getActiveSheet();
  var rg=sheet.getDataRange();
  var vA=rg.getValues();
  var rA=[];
  for(var i=0;i<vA.length;i++)
  {
    if (value1)
    {
      if(vA[i][col1-1]==value1 && vA[i][col2-1]==value2)
      {
        rA.push(i+1);
      }
    }
    else
    {
      if(vA[i][col2-1]==value2)
      {
        rA.push(i+1);
      }
    }
  }
  // SpreadsheetApp.getUi().alert(rA.join(','));
  return rA;//as an array
  //return rA.join(',');//as a string
}

// Just converts data with first row containing names to json
function getJsonArrayFromData(data)
{
  var obj = {};
  var result = [];
  var headers = data[0];
  var cols = headers.length;
  var row = [];

  for (var i = 1, l = data.length; i < l; i++)
  {
    // get a row to fill the object
    row = data[i];
    // clear object
    obj = {};
    for (var col = 0; col < cols; col++)
    {
      // fill object with new values
      obj[headers[col]] = row[col];
    }
    // add object in a final result
    result.push(obj);
  }

  return result;
}

// https://stackoverflow.com/questions/36346918/get-column-values-by-column-name-not-column-index
function getCellRangeByColumnName(sheet, columnName, row) {
  let data = sheet.getDataRange().getValues();
  let column = data[0].indexOf(columnName);
  if (column != -1) {
    return sheet.getRange(row, column + 1, 1, 1);
  }
}

function getCellValueByColumnName(sheet, columnName, row) {
  let cell = getCellRangeByColumnName(sheet, columnName, row);
  if (cell != null) {
    return cell.getValue();
  }
}

function setCellValueByColumnName(sheet, columnName, row, value)
{
  if (typeof value == "string")
  {
    value = [[value]];
  }
  let cell = getCellRangeByColumnName(sheet, columnName, row);
  if (cell != null) {
    return cell.setValues(value);
  }
}
