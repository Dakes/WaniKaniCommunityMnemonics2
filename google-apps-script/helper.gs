let GS = "␝␝"; // separate mnemonics and their data
let RS = "␞␞"; // separate different user votes
let US = "␟␟"; // separate user from vote

function splitStringGS(s)
{
  let sep = "\x1D";
  return splitString(s, sep)
}
function splitStringRS(s)
{
  let sep = "\x1E";
  return splitString(s, sep)
}
function splitStringUS(s)
{
  let sep = "\x1F";
  return splitString(s, sep)
}
function splitString(s, sep)
{
  let splitS = s.split(sep);
  for(var i=0;i<splitS.length;i++)
  {
    splitS[i] = splitS[i].replaceAll("␝", "").replaceAll("␞", "").replaceAll("␟", "");
  }
  return splitS;
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
