"use client";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

export const useUsername = () => {
  const ANIMALS = ["dog", "wolf", "shark", "cat", "lion", "tiger"];
  const STORAGE_KEY = "chat_username";
  const [username, setUsername] = useState("");
  const generateUsername = () => {
    const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `anonyms-${word}-${nanoid(5)}`;
  };
  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUsername(stored);
        return;
      }
      const generated = generateUsername();
      localStorage.setItem(STORAGE_KEY, generated);
      setUsername(generated);
    };
    main();
  }, []);
  return { username };
};
