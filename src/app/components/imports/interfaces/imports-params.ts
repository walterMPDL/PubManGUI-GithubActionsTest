// Fetch
export interface GetCrossrefParams { 
        identifier: string
}

export interface GetArxivParams { 
        identifier: string,
        fullText: string
}

// Import
export interface PostImportParams { 
        contextId: string,
        importName: string,
        format: string,
        formatConfig?: string
}
