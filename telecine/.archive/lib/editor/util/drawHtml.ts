// This regex matches the url part of a string that looks like:
// url("http//examlpe.org/any-path")
// The capture group: ([^"]*) indicates: match any character that isn't a " character.
// const SRC_URL_REGEX = /url\("([^"]*)/;

// async function fontAsDataURI(url: string): Promise<string[]> {
//   const cssText = await (await fetch(url)).text();
//   const style = document.createElement("style");
//   style.innerHTML = cssText;
//   document.head.appendChild(style);

//   let promises: Promise<string>[] = [];
//   Array.from(style.sheet.cssRules).forEach((rule) => {
//     if (rule instanceof CSSFontFaceRule) {
//       promises.push(
//         new Promise<string>(async (resolve, reject) => {
//           const url = rule.style
//             .getPropertyValue("src")
//             .match(SRC_URL_REGEX)[1];
//           const blob = await (await fetch(url)).blob();
//           const reader = new FileReader();
//           reader.onload = () =>
//             resolve(rule.cssText.replace(url, reader.result as string));
//           reader.onerror = (error) => reject(error);
//           reader.readAsDataURL(blob);
//         })
//       );
//     }
//   });
//   return Promise.all(promises);
// }

// const fontCache = {};
// function readThroughFontCache(url: string) {
//   if (!fontCache[url]) {
//     fontCache[url] = fontAsDataURI(url).then((font) => font.join("\n"));
//   }
//   return fontCache[url];
// }

// function loadFonts(fontUrls: string[]): Promise<string> {
//   return "";
//   return Promise.all(fontUrls.map(readThroughFontCache)).then((fonts) =>
//     fonts.join("\n")
//   );
// }

const inlineImageCache: Record<string, string> = {};

export const inlineImages = async (node: HTMLElement): Promise<void> => {
  const images = node.querySelectorAll("img");
  for (const image of images) {
    const src = image.getAttribute("src");
    if (src === null) continue;
    console.log("inlineImages", src, inlineImageCache);
    const maybeBlob = inlineImageCache[src];
    if (maybeBlob !== undefined) {
      image.setAttribute("src", maybeBlob);
      continue;
    }
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const promise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const imageBlob = canvas.toDataURL("image/jpeg");
        image.setAttribute("src", imageBlob);
        inlineImageCache[src] = imageBlob;
        resolve();
      };
      img.onerror = reject;
    });
    img.src = url;
    await promise;
    URL.revokeObjectURL(url);
  }
};

/**
 *
 * drawHTML uses one cool trick browsers hate to rasterize an html string.
 *
 * It operates in 4 steps:
 *
 * 1. Determine the browser-reported size of the html.
 * 2. Serialize the html to svg wrapped in <foreignObject>
 * 3. Create an ObjectURL for the svg
 * 4. Create an Image and set the object url as the src of the image
 *
 * The function returns a promise wrapping the image.
 * That promise resolves when the image's load event dispatches.
 * At that time the image data has been generated and can be used
 * for stuff like <canvas>'s drawImage api.
 *
 * @param {string} source An html string to draw to an image.
 * @returns {Promise<HTMLImageElement>} Wraps an image containing image data for the source html.
 */
export async function htmlToImage(
  source: string,
  _requestedFonts: string[],
): Promise<HTMLImageElement> {
  const xmlSerializer = new XMLSerializer();
  // Part 1: Measure the browser-reported dimensions of the html string.
  const measure = document.createElement("div");
  measure.setAttribute("id", "measure");
  measure.style.display = "inline-block";
  measure.style.whiteSpace = "nowrap";
  measure.innerHTML = `
    <style>
    body,
    html {
      margin: 0;
      font-size: 10px;
    }
    * { line-height: 100%; hyphens: none; overflow-wrap: normal; text-rendering: geometricPrecision; }
    ${/* await loadFonts(requestedFonts) */ ""}
   </style>
   <div style="transform: translateY(-20px);">${source}</div>
  `;
  // await inlineImages(measure);
  // document.body.appendChild(measure);

  // const { offsetWidth, offsetHeight } = measure;
  const offsetWidth = 500;
  const offsetHeight = 500;
  // measure.remove();
  // Part 2: Embed in <svg> with foreignObject.
  // Note the use of the xmlSerializer.
  // a <foreignObject>'s contents MUST be xhtml.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${offsetWidth}"
      height="${offsetHeight}"
    >
      <foreignObject text-rendering="geometricPrecision" width="100%" height="100%">
        ${xmlSerializer.serializeToString(measure)}
        </foreignObject>
        <image href="/kitten-200.jpeg" height="200" width="200" />
    </svg>
  `;

  return await new Promise((resolve, reject) => {
    // Part 3: Create an object URL
    const svgBlob = new Blob([svg], { type: "image/svg+xml" });
    const reader = new FileReader();
    reader.readAsDataURL(svgBlob);
    reader.onload = (event) => {
      const image = new Image();
      image.src = event.target.result as string;
      resolve(image);
    };
    // Part 4: Create an Image and set it's src attribute.
    // Note:
    //  - That this step attaches the event listener BEFORE setting the src
    //    The internet suggests different browsers will possibly have timing issues
    //  - We call revokeObjectURL after resolving the image to prevent memory leaks.
    // const image = new Image();
    // image.onload = () => {
    //   resolve(image);
    //   URL.revokeObjectURL(dataURL);
    // };
    // image.onerror = (error) => {
    //   reject(error);
    //   URL.revokeObjectURL(dataURL);
    // };
    // image.src = dataURL;
  });
}

/**
 *
 * A convenience wrapper around htmlToImage that draws the image to an
 * OffscreenCanvas
 *
 * @param {string} source An html string to draw to an image.
 * @returns {Promise<OffscreenCanvas>} Offscreen Canvas containing the image data
 */
export async function htmlToOffscreenCanvas(
  source: string,
): Promise<OffscreenCanvas> {
  const image = await htmlToImage(source, []);

  const canvas = new OffscreenCanvas(
    // Multiplying image width by devicePixelRatio
    // creates enough canvas surface to draw a non-blurry image.
    image.width * devicePixelRatio,
    image.height * devicePixelRatio,
  );

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("htmlToOffscreenCanvas: Could not get canvas context");
  }

  // prettier-ignore
  ctx.drawImage(
    // Draw the image in the top-left corner
    image, 0, 0,
    // Scaling by devicePixelRatio makes this look
    // the correct size compared to the html it came from.
    image.width * devicePixelRatio,
    image.height * devicePixelRatio
  );

  return canvas;
}
