/**
 * Takes array or string, outputs array or string
 */
function calc_score(input)
{

  if (typeof input == "string")
    return get_score(input)
  else
  {
    let outputArray = [];
    for(var i=0;i<input.length;i++)
    {
      outputArray = outputArray.concat(get_score(input[i][0]));
    }
    return outputArray;

  }
}

/**
 * input only string
 * Takes a string like "Anonymous␟␟2␞␞Dakes␟␟1␝␝user1␟␟1␞␞user2␟1"
 * and outputs "3␝␝2"
 */
function get_score(input)
{
  if (input == "")
    return ""
  let mnemSep = "␝␝";

  let scoreForMnems = input.split("\x1D");

  let result = "";
  for(var i=0;i<scoreForMnems.length;i++)
  {
    let resultForMnem = 0;

    // replace after split to ensure an empty string for existing but non voted entries
    scoreForMnems[i] = scoreForMnems[i].replaceAll("␝", "").replaceAll("␞", "").replaceAll("␟", "");
    let individualVotesForMnem = scoreForMnems[i].split("\x1E");
    for(var j=0;j<individualVotesForMnem.length;j++)
    {
      if(individualVotesForMnem[j])
      {
        let vote = individualVotesForMnem[j].split("\x1F");
        resultForMnem = resultForMnem + Number(vote[1]);
      }
    }
    if (i == 0)
      result = result.concat(String(resultForMnem));
    else
      result = result.concat(mnemSep, String(resultForMnem));
  }

return result;
}
