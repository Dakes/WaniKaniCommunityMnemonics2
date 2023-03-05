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

function checkMnemType(mnemType)
{
  if (!mnemType || typeof mnemType != "string")
    return null;
  if (mnemType[0] == "m")
    return "m";
  else if (mnemType[0] == "r")
    return "r";
  return null;
}

function checkItemType(itemType)
{
  if (!itemType || typeof itemType != "string")
    return null;
  if (itemType[0] == "v")
    return "v";
  else if (itemType[0] == "k")
    return "k";
  else if (itemType[0] == "r")
    return "r";
  return null;
}

/**
 * Get Username from WK API, to validate user
 */
function getUser(apiKey) {
  const headers = {
    "Authorization": 'Bearer ' + apiKey,
  };

  let response = UrlFetchApp.fetch('https://api.wanikani.com/v2/user', {
    method: 'GET',
    headers: headers
  });

  let data = JSON.parse(response.getContentText()).data;
  if (typeof data.username == "string" && data.username.length > 0)
    return data.username
  return null
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
