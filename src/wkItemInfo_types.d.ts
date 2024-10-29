
declare global {
    interface Window {
        // @ts-ignore
        wkItemInfo: wkItemInfo<{  }>
    }
}

// @ts-ignore
export const { wkItemInfo } = win;

