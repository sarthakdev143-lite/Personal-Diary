"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type DiaryContextType = {
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  resetDiaryPosition: () => void;
};

// Create a global event system for diary position reset  
export const DIARY_EVENTS = {
  RESET_POSITION: 'diary:reset-position',
};

const DiaryContext = createContext<DiaryContextType>({
  isRotating: false,
  setIsRotating: () => { },
  resetDiaryPosition: () => { },
});

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const resetDiaryPosition = useCallback(() => {
    // Dispatch a custom event that the Diary3D component will listen for
    const resetEvent = new CustomEvent(DIARY_EVENTS.RESET_POSITION);
    window.dispatchEvent(resetEvent);
  }, []);

  return (
    <DiaryContext.Provider value={{
      isRotating,
      setIsRotating,
      resetDiaryPosition
    }}>
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = () => useContext(DiaryContext);