export const DIARY_THEMES = [
    { name: "Leather 1", textureUrl: "/textures/leather-texture.jpg" },
    { name: "Leather 2", textureUrl: "/textures/leather-bound.webp" },
    { name: "Wooden Garage Door", textureUrl: "/textures/wooden_garage_door.webp" },
] as const;

export const DEFAULT_DIARY_THEME = DIARY_THEMES[0].textureUrl;

export const ALLOWED_DIARY_THEMES: readonly string[] = DIARY_THEMES.map((theme) => theme.textureUrl);

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const CONTENT_MAX = 400_000;
export const SEARCH_MAX = 80;
export const MAX_IMAGE_BYTES = 150 * 1024;
export const MAX_DATA_IMAGE_LENGTH = 220_000;

export function isAllowedTheme(theme: string): boolean {
    return ALLOWED_DIARY_THEMES.includes(theme);
}
