"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULT_DIARY_THEME } from "@/config/diaryThemes";

type DiaryContextType = {
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTexture: string;
  setSelectedTexture: React.Dispatch<React.SetStateAction<string>>;
  resetDiaryPosition: () => void;
};

// Create a global event system for diary position reset  
export const DIARY_EVENTS = {
  RESET_POSITION: 'diary:reset-position',
};

const DiaryContext = createContext<DiaryContextType>({
  isRotating: true,
  setIsRotating: () => { },
  selectedTexture: DEFAULT_DIARY_THEME,
  setSelectedTexture: () => { },
  resetDiaryPosition: () => { },
});

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [selectedTexture, setSelectedTexture] = useState<string>(DEFAULT_DIARY_THEME);

  const resetDiaryPosition = useCallback(() => {
    // Dispatch a custom event that the Diary3D component will listen for
    const resetEvent = new CustomEvent(DIARY_EVENTS.RESET_POSITION);
    window.dispatchEvent(resetEvent);
  }, []);

  return (
    <DiaryContext.Provider value={{
      isRotating,
      setIsRotating,
      selectedTexture,
      setSelectedTexture,
      resetDiaryPosition
    }}>
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = () => useContext(DiaryContext);
