import { createBrowser } from "./PlaywrightEngine";

const browser = await createBrowser();

console.log("browser created");
const page = await browser.newPage();
page.goto("file:///app/math-test.html");
page.on("console", (message) => {
  console.log("BROWSER: ", message);
});

// console.log("page created");
// console.log("48000 * ( 1 / 30 )", await page.evaluate(() => 48000 * (1 / 30)));
// console.log("[Math.random()]", await page.evaluate(() => [Math.random()]));
// console.log("Math.random()", await page.evaluate(() => Math.random()));

// await browser.close();
