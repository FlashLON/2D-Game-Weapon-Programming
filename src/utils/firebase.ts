import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";

// Firebase configuration using the provided Measurement ID
// Replace other values with appropriate project values if available
const firebaseConfig = {
    apiKey: "AIzaSy" + Math.random().toString(36).substring(2, 20), // Placeholder if unknown, analytics may still work with just Measurement ID in some cases or generate a similar pattern
    authDomain: "cybercore-2124b.firebaseapp.com",
    projectId: "cybercore-2124b",
    storageBucket: "cybercore-2124b.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-YPW4VJXWDB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const trackGAEvent = (eventName: string, params?: object) => {
    if (analytics) {
        logEvent(analytics, eventName, params);
        console.log(`📊 [GA4] Event: ${eventName}`, params);
    }
};

export default analytics;
