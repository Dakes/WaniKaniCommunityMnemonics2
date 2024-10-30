import { wkof } from "./wkof";


export let WKUser: string | null     = null;
export let userApiKey: string | null = null;

export function setUsername(): string {
  try {
    if (wkof) {
      try {
        WKUser = wkof.Apiv2.user;
        if (WKUser !== undefined)
          return WKUser;
      } catch (err) {
        console.log("WKCM2: setUsername, ", err);
        WKUser = wkof.user["username"];
        return WKUser;
      }
    }
  } catch (err) {
    console.log("WKCM2: setUsername, wkof.user  ", err);
  }

  // backup method
  const userClass = "user-summary__username";

  // not working in Lesson & Review
  try {
    WKUser = document.getElementsByClassName(userClass)[0].innerHTML;
  } catch (err) {
    throw new Error("WKCM2 Warning: CMUser not set. \n" + err);
  }

  if (WKUser == null || typeof WKUser != "string" || WKUser == "")
    throw new Error("WKCM2 Error: WKUser not set: " + WKUser);

  return WKUser;
}

export function getUsername(): string {
  if (WKUser != null && WKUser != "")
    return WKUser;
  else
    return setUsername();
}

export function setApiKey(): string {
  try {
    userApiKey = wkof.Apiv2.key;
  } catch (err) {
    throw new Error("WKCM2 Error: API key not set.");
  }
  return userApiKey;
}