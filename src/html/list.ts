/**
 * Returns new elements for the legend on item list pages (.../kanji/, .../level/)
 * */
export function getLegendLi(): string
{
    return `
<li class="subject-legend__item" title="A Community Mnemonic was Requested.">
    ${getBadge(true, true)}
    <div class="subject-legend__item-title">CM Requested</div>
</li>
<li class="subject-legend__item" title="A Community Mnemonic is available.">
    ${getBadge(false, true)}
    <div class="subject-legend__item-title">CM Available</div>
</li>`
}

/**
 * Returns a badge for items in lists, whether a Mnemonic is available or requested
 * */
export function getBadge(request=false, legend=false): string
{
    if (!request)
        return `<span lang="ja" class="${getBadgeClassAvail(legend)}">有</span>`
    else
        return `<span lang="ja" class="${getBadgeClassReq(legend)}">求</span>`
}

export function getBadgeClass(type: string="available", legend=false): string
{
    if (legend)
        return "subject-legend__item-badge--cm-" + type;
    else
        return "character-item__badge__cm-" + type;
}

export function getBadgeClassReq(legend=false): string
{
    return getBadgeClass("requested", legend);
}

export function getBadgeClassAvail(legend=false): string
{
    return getBadgeClass("available", legend);
}