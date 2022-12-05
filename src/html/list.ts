/**
 * Returns new elements for the legend on item list pages (.../kanji/, .../level/)
 * */
export function getLegendLi(): string
{
    return `
<li class="subject-legend__item" title="A Community Mnemonic was Requested.">
    ${getBadge(true)}
    <div class="subject-legend__item-title">CM Requested</div>
</li>
<li class="subject-legend__item" title="A Community Mnemonic is available.">
    ${getBadge()}
    <div class="subject-legend__item-title">CM Available</div>
</li>`
}

/**
 * Returns a badge for items in lists, whether a Mnemonic is available or requested
 * */
export function getBadge(request=false): string
{
    if (!request)
        return `<span lang="ja" class="${getBadgeClassAvail()}">有</span>`
    else    
        return `<span lang="ja" class="${getBadgeClassReq()}">求</span>`
}

export function getBadgeClass(type: string): string
{
    return "subject-legend__item-badge--cm-" + type;
}

export function getBadgeClassReq(): string
{
    return getBadgeClass("requested");
}

export function getBadgeClassAvail(): string
{
    return getBadgeClass("available");
}