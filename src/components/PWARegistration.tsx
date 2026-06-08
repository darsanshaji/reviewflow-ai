"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA ServiceWorker registered successfully: ", registration.scope);
          })
          .catch((error) => {
            console.error("PWA ServiceWorker registration failed: ", error);
          });
      });
    }
  }, []);

  return null;
}
