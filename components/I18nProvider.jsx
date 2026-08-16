"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "podBoardGame_language";
const SUPPORTED_LANGUAGES = ["th", "en"];

const translations = {
  th: {
    language: "ภาษาไทย", switchLanguage: "เปลี่ยนภาษาเป็น English", mainMenu: "เมนูหลัก",
    localGame: "เล่นคนเดียว", onlineMultiplayer: "เล่นออนไลน์", boardGame: "เกมกระดาน 3D",
    select: "เลือก", settings: "ตั้งค่า", settingsDescription: "การตั้งค่าเสียงและอินเทอร์เฟซ",
    audio: "เสียง", languageLabel: "ภาษา", sfxVolume: "ระดับเสียงเอฟเฟกต์",
    soundEffectsDescription: "เสียงลูกเต๋า สกิล และการต่อสู้", bgmVolume: "ระดับเสียงเพลง",
    backgroundMusicDescription: "เพลงประกอบเกม", muteBgm: "ปิดเสียงเพลง", unmuteBgm: "เปิดเสียงเพลง",
    settingsSaved: "การตั้งค่าจะถูกบันทึกไว้ในเบราว์เซอร์นี้ และใช้ได้ทั้งเกม Local และ Online",
    eventLog: "บันทึกเหตุการณ์", openEventLog: "เปิดบันทึกเหตุการณ์", collapseEventLog: "พับบันทึกเหตุการณ์",
    noEvents: "ยังไม่มีเหตุการณ์...", latest: "ล่าสุด", chamberOfSecrets: "ห้องแห่งความลับ", version: "เวอร์ชัน",
  },
  en: {
    language: "English", switchLanguage: "Switch language to ไทย", mainMenu: "Main menu",
    localGame: "Local Game", onlineMultiplayer: "Online Multiplayer", boardGame: "3D Board Game",
    select: "Select", settings: "Settings", settingsDescription: "Audio & interface preferences",
    audio: "Audio", languageLabel: "Language", sfxVolume: "SFX Volume",
    soundEffectsDescription: "Sound effects (dice, skills, combat)", bgmVolume: "BGM Volume",
    backgroundMusicDescription: "Background music theme", muteBgm: "Mute BGM", unmuteBgm: "Unmute BGM",
    settingsSaved: "Settings are saved to this browser. They apply to both local and online matches.",
    eventLog: "Event Log", openEventLog: "Open event log", collapseEventLog: "Collapse event log",
    noEvents: "No events yet...", latest: "Latest", chamberOfSecrets: "Chamber of Secrets", version: "v1.0",
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState("th");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(saved)) setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  const setLanguage = (nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) return;
    setLanguageState(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === "th" ? "en" : "th"),
    t: (key) => translations[language][key] || key,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
