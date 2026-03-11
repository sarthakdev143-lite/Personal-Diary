export type DiaryTheme = {
    name: string;
    textureUrl: string;
};

export const DIARY_THEMES: DiaryTheme[] = [
    {
        name: "Classic Leather",
        textureUrl: "/textures/leather-texture.jpg",
    },
    {
        name: "Dark Bound",
        textureUrl: "/textures/leather-bound.webp",
    },
    {
        name: "Rustic Wood",
        textureUrl: "/textures/wooden_garage_door.webp",
    },
];

export const DEFAULT_DIARY_THEME = DIARY_THEMES[0].textureUrl;
