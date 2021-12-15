// maximum number of mnems per user
const mnemMaxCount = 5;

/**
 * I only want to replace signs, that might be used in HTML (<>&"' etc.)
 * not Japanese characters for better readability in the sheet.
 * Replaces control chars from 0000-001F.
 * Deletes all HTML tags (anything withing <...>)
 */
function cleanData(data)
{
  if (!data || data == null)
    return null;
  data = data.replace(new RegExp('<[^>]*>', 'g'), '');
  // replace newlines with markup
  data = data.replace(/\n/g,'[n]').replace(/\r/g,'[n]');
  data = data.replace(/[\u0000-\u001F<>\&\"\'\`\\]/gim, function(i)
  {
    return '&#' + i.charCodeAt(0) + ';';
  });
  return data;
}

function cleanItem(data)
{
  if (!data || data == null || typeof data != "string")
    return null;
  let max_length = 10;
  // no item will be longer than 10 (I think?). Longest I found was 9.
  if (data.length > max_length)
  {
    data = data.substring(0, max_length);
  }
  data = cleanData(data);
  return data;
}

function cleanMnemIndex(mnemIndex)
{
  let clean_index = 0;
  if (mnemIndex == null)
    clean_index = 0;
  if (typeof mnemIndex == "string" || typeof mnemIndex == "number")
  {
    clean_index = Number(mnemIndex);
    if (Number.isNaN(clean_index))
      clean_index = 0;
  }
  return clean_index;
}

function cleanScore(score)
{
  let clean_score = 0;
  if (score == null)
    clean_score = 0;
  if (typeof score == "string" || typeof score == "number")
  {
    clean_score = Number(score);
    if (Number.isNaN(clean_score))
      clean_score = 0;
  }

  if (clean_score < -1)
    clean_score = -1;
  else if (clean_score > 1)
    clean_score = 1;

  return clean_score;
}

function getFullMnemType(mnemType)
{
    let fullMnemType = ""
    if (mnemType == "m" || mnemType == "meaning")
        fullMnemType = "Meaning";
    else if (mnemType == "r" || mnemType == "reading")
        fullMnemType = "Reading";
    else
        throw new TypeError("mnemType in getFullMnemType is not valid. Value: " + mnemType);
    return fullMnemType;
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
// getRowsWhere ▲

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
// rowWhereTwoColumnsEqual ▲

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
// getJsonArrayFromData ▲

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
