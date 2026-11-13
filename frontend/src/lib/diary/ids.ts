const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function isObjectId(value: string): boolean {
    return OBJECT_ID.test(value);
}
