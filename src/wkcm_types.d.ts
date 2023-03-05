type MnemType = "reading" | "meaning"
type MnemTypeShort = "r" | "m"
type MnemTypeAny = MnemType | MnemTypeShort

type ItemType = "kanji" | "vocabulary" | "radical"
type ItemTypeShort = "k" | "v" | "r"
type ItemTypeMed = "kan" | "voc" | "rad"
type ItemTypeAny = ItemType | ItemTypeShort | ItemTypeMed

type MnemJson = {user: string[]}
type ScoreJson = {user: number[]}
// TODO
type VotesJson = {user: number[]}

// JSON containing all data for one Item (v説得, etc.)
type DataJson = {
    Item?: string,
    Type?: MnemTypeShort,
    Meaning_Mnem?:  string,
    Meaning_Score?: string,
    Meaning_Votes?: string,
    Reading_Mnem?:  string,
    Reading_Score?: string,
    Reading_Votes?: string
}

type WKCMJson = MnemJson | ScoreJson | VotesJson | DataJson