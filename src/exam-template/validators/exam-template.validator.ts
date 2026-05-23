export function validateSchema(value : any){
    if(typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length === 0){
        return false;
    }

    return Object.values(value).every((item) => {
        if(typeof item !== "object" || item === null || Array.isArray(item) || !('references' in item)){
            return false;
        }

        const references = item.references;

        if(typeof references !== "object" || references === null || Array.isArray(references) ||  Object.keys(references).length === 0){
            return false;
        }

        return Object.entries(references).every(([key, value]) => typeof key === "string" && typeof value === "string");
    });
}