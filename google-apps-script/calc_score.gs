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
 * Takes a json string like: 
 * {
 *     "Dakes": [{"Anonymous": "1", "DerTester": "1"}], 
 *     "Anonymous": [mnem1_votes, mnem2_votes, ...], 
 *     ...
 * }
 * and outputs:
 * {
 *     "Dakes": [2, 3, ...], 
 *     "Anonymous": [6], 
 *      ...
 * }
 */
function get_score(input)
{
  if (!input || input == "Meaning_Votes" || input == "Reading_Votes")
    return ""
    
  let in_json = JSON.parse(input);
  let out_json = {};

  for (var mnem_key in in_json)
  {
    // multiple mnems per user possible. Array:
    let votes_array = in_json[mnem_key];
    // new array of scores for multiple mnems of one user
    let new_score_array = [];
    for (var votes_json of votes_array)
    {
      // current_vote: json containing votes for this mnem
      let mnem_score = 0;
      for (var user_voted in votes_json)
      {
        mnem_score = mnem_score + Number(votes_json[user_voted]);
      }
      new_score_array = new_score_array.concat(mnem_score);
    }
    out_json[mnem_key] = new_score_array;

  } 
  return JSON.stringify(out_json);
}
