/**
 * Code that interacts with the cells in the sheet. 
 * Reads / Writes data
 */

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

function setVotesJson(sheet, item, type, mnemType, votes_json)
{
  let colName = getFullMnemType(mnemType) + "_Votes";
  setDataJson(sheet, item, type, mnemType, colName, votes_json);
}

/**
 * Set Mnem JSON (object) in DB
 */
function setMnemJson(sheet, item, type, mnemType, mnem_json)
{
  let colName = getFullMnemType(mnemType) + "_Mnem";
  setDataJson(sheet, item, type, mnemType, colName, mnem_json);
}

function setDataJson(sheet, item, type, mnemType, colName, data_json)
{
  let new_data_string = JSON.stringify(data_json);
  let row = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);

  // case mnem already exists
  if (row.length != 0)
  {
    setCellValueByColumnName(sheet, colName, row, new_data_string);
  }
  // no entry for this item at all
  else
  {
    addNewRow(sheet, item, type, mnemType, new_data_string);
  }
}

function addNewRow(sheet, item, type, mnemType, new_data_string)
{
    let row_count = sheet.getMaxRows();
    sheet.insertRowAfter(row_count);
    let colName = getFullMnemType(mnemType) + "_Mnem";

    setCellValueByColumnName(sheet, colName, row_count+1, new_data_string);
    setCellValueByColumnName(sheet, "Type", row_count+1, type);
    setCellValueByColumnName(sheet, "Item", row_count+1, item);
    // insert new *_Score calculation formula
    const score_formula = '=calc_score(INDIRECT("RC[-1]",FALSE))';
    setCellValueByColumnName(sheet, "Meaning_Score", row_count+1, score_formula);
    setCellValueByColumnName(sheet, "Reading_Score", row_count+1, score_formula);
}

/**
 * If item does not exist yet, returns an new empty Object.
 */
function getDataJson(sheet, item, type, colName)
{
  let row = rowWhereTwoColumnsEqual(sheet, type, 1, item, 2);
  let data_string = "";
  if (row.length != 0)
    data_string = getCellValueByColumnName(sheet ,colName, row);
  let data_json = {};
  if (data_string)
    data_json = JSON.parse(data_string);
  return data_json;
}