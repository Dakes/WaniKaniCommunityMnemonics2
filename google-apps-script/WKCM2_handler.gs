//  1. Enter sheet name where data is to be written and read below
var SHEET_NAME = "WKCM2";

// Regex matching every html tag, except the ones for highlighting
// var regex = new RegExp(/(<(?!(?:\/?(span|b|i|u|s))\b)[^>]+>)/gmi);


// var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

// If you don't want to expose either GET or POST methods you can comment out the appropriate function
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
  let sheet=ac.getActiveSheet();

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
    return;
  }

  // let sheet = SpreadsheetApp.getActiveSheet();

}

function getData(sheet, type, item)
{
  let data = getRowsWhere(sheet, type, item);
  let json_data = getJsonArrayFromData(data);
  return ContentService.createTextOutput(JSON.stringify(json_data) ).setMimeType(ContentService.MimeType.JSON);
  // send back data to client
}

function putData()
{

}

function setup()
{
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
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
