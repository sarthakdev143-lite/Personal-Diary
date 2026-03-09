"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type DiaryContextType = {
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTexture: string | null;
  setSelectedTexture: React.Dispatch<React.SetStateAction<string | null>>;
  resetDiaryPosition: () => void;
};

// Create a global event system for diary position reset  
export const DIARY_EVENTS = {
  RESET_POSITION: 'diary:reset-position',
};

const DiaryContext = createContext<DiaryContextType>({
  isRotating: true,
  setIsRotating: () => { },
  selectedTexture: "/textures/leather-texture.jpg",
  setSelectedTexture: () => { },
  resetDiaryPosition: () => { },
});

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [selectedTexture, setSelectedTexture] = useState<string | null>("/textures/leather-texture.jpg");

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
