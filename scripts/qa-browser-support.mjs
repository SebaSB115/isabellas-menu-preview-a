import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
export function chromePath() {
  const options = [process.env.CHROME_EXECUTABLE_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'];
  const found = options.find(path => path && existsSync(path));
  if (!found) throw new Error('Configura CHROME_EXECUTABLE_PATH con una instalación de Chrome o Chromium.');
  return found;
}
export const launchBrowser = () => puppeteer.launch({ executablePath:chromePath(), headless:true, args:['--disable-gpu'], timeout:30000 });
