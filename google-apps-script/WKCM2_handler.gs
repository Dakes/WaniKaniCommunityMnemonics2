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
  // console.log("item: ", e.parameter.item);
  // console.log("type", e.parameter.type);
  // console.log("exec: ", e.parameter.exec);

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
    putData(sheet, e.parameter.type, e.parameter.item);
    return;
  }
  else if (e.parameter.exec == "vote")
  {
    // user, item, type, mnemType, mnemUser, score
    if(e.parameter.user && e.parameter.item && e.parameter.type &&
    e.parameter.mnemType && e.parameter.mnemUser && e.parameter.score)
      vote(sheet, e.parameter.user, e.parameter.item, e.parameter.type,
    e.parameter.mnemType, e.parameter.mnemUser, e.parameter.score);
    return;
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
  let mnemType = "m";
  let mnemUser = "Dakes";
  let score = "1";
  vote(sheet, user, item, type, mnemType, mnemUser, score);
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


  console.log(json_data);
  return ContentService.createTextOutput(JSON.stringify(json_data) ).setMimeType(ContentService.MimeType.JSON);
  // send back data to client
}

function vote(sheet, user, item, type, mnemType, mnemUser, score)
{
  if (user == mnemUser)
    return;
  if (Number(score) < -1 || Number(score) > 1)
    return;

  let row = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);

  // get index of mnemUser in saved mnemUser
  let user_col = getFullMnemType(mnemType) + "_User";
  let user_string = getCellValueByColumnName(sheet ,user_col, row);
  let users = splitStringGS(user_string);

  for(let i=0;i<users.length;i++)
  {
    if (users[i] == mnemUser)
    {
      // users are the same. Use this index to access/save the vote
      // get current cell content
      let vote_col = getFullMnemType(mnemType) + "_Votes";
      let vote_string = getCellValueByColumnName(sheet ,vote_col, row);
      let mnemVotes = splitStringGS(vote_string);
      // if length is not the same reset votes (probably no votes at all)
      if (mnemVotes.length != users.length)
      {
        mnemVotes = new Array(users.length).fill("");
      }
      if (mnemVotes[i] == "")
      {
        mnemVotes[i] = user + US + score;
      }
      else
      {
        // only add if user didn't already vote, otherwise update
        let user_votes = splitStringRS(mnemVotes[i]);

        let user_votes_len = user_votes.length

        let updated = false;
        for(let j=0;j<user_votes_len;j++)
        {
          user_votes[j] = splitStringUS(user_votes[j]);
          // user already voted, update vote
          if (user_votes[j][0] == user)
          {
            user_votes[j][1] = score;
            updated = true;
          }
        }
        // did not update existing vote. Append the new vote.
        if (updated == false)
        {
          user_votes[user_votes.length] = [user, score];
        }
        // "reassemble" vote string for this mnem
        for(let j=0;j<user_votes.length;j++)
        {
          user_votes[j] = user_votes[j].join(US);
        }
        user_votes = user_votes.join(RS);

        mnemVotes[i] = user_votes;
      }

      // "reassemble" votes for different mnem with GS
      let new_vote_string = mnemVotes.join(GS);
      setCellValueByColumnName(sheet, vote_col, row, new_vote_string)
      // console.log(new_vote_string);

    }
  }

  // append vote to M/R _Votes

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
