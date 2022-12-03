import { isLesson, isReview } from "./const";
import { wkof } from "./wkof";


export let WKUser: string|null = null;

export function setUsername(): string
{
    try
    {
        if (wkof)
        {
            try
            {
                WKUser = wkof.Apiv2.user;
                return WKUser;
            }
            catch (err)
            {
                console.log("WKCM2: setUsername, ", err);
                WKUser = wkof.user["username"];
                return WKUser;
            }
        }
    }
    catch (err)
    {
        console.log("WKCM2: setUsername, wkof.user  ", err);
    }

    // backup method
    const userClass = "user-summary__username";

    if(isReview || isLesson)
    {
        // @ts-ignore
        WKUser = window.WaniKani.username;
    }
    else
        try
        {
            WKUser = document.getElementsByClassName(userClass)[0].innerHTML;
        }
        catch(err)
        {
            throw new Error("WKCM2 Warning: CMUser not set. \n" + err);
        }
    return WKUser;
}

export function getUsername(): string
{
    if (WKUser != null && WKUser != "")
        return WKUser;
    else
        return setUsername();
}