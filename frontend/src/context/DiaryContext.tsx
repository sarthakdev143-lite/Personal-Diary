"use client"; 

import { createContext, useContext, useState, ReactNode, useEffect} from "react";

type DiaryContextType = {
  isRotating: boolean;
  setIsRotating: (value: boolean) => void;
};

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    console.log("Rotating Status : ", isRotating);
  }, [isRotating])

  return (
    <DiaryContext.Provider value={{ isRotating, setIsRotating }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return context;
}
