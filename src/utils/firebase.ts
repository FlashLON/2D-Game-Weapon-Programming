import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDaDTqopDOBVNXRaKfV0Zc2n7lgzkB1IzQ",
    authDomain: "cybercore-2124b.firebaseapp.com",
    databaseURL: "https://cybercore-2124b-default-rtdb.firebaseio.com",
    projectId: "cybercore-2124b",
    storageBucket: "cybercore-2124b.firebasestorage.app",
    messagingSenderId: "91112365800",
    appId: "1:91112365800:web:e8b1d29387930525deb35d",
    measurementId: "G-YPW4VJXWDB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely
let analytics: any = null;

// Only initialize if supported and in browser
isSupported().then((supported) => {
    if (supported && typeof window !== 'undefined') {
        analytics = getAnalytics(app);
        console.log("📊 [GA4] Analytics Ready");
    }
}).catch(err => {
    console.warn("📊 [GA4] Analytics not available", err.message);
});

export const trackGAEvent = (eventName: string, params?: object) => {
    try {
        if (analytics) {
            logEvent(analytics, eventName, params);
            // console.log(`📊 [GA4] Tracked: ${eventName}`, params);
        }
    } catch (err) {
        console.error(`📊 [GA4] Error tracking ${eventName}`, err);
    }
};

export default analytics;
