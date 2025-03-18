export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const print = (...args) => console.log(`[${new Date().toLocaleTimeString()}]`, ...args);
