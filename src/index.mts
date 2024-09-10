import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

dotenv.config();

const vertex = createVertex({
  googleAuthOptions: {
    keyFilename: path.resolve(
      import.meta.dirname,
      "../auth/service_account.json"
    ),
  },
  location: "us-central1",
});

const assetPaths = fs.readdirSync(
  path.resolve(import.meta.dirname, "../assets")
);

const suffixes = ["_thin", "_fill", "_regular"];

const iconMap = assetPaths.reduce((acc, assetPath) => {
  const name = assetPath.replace(".png", "");
  const suffix = suffixes.find((suffix) => name.endsWith(suffix));

  if (!suffix) {
    acc[name] = { regular: name };

    return acc;
  }

  const baseName = name.replace(suffix, "");
  acc[baseName] = { ...acc[baseName], [suffix.replace("_", "")]: name };

  return acc;
}, {});

// so iconMap looks like this:
// {
//   "icon_name": {
//     regular: "icon_name_regular",
//     thin: "icon_name_thin",
//     fill: "icon_name_fill"
//   }
// }

const prompt = `You are an icon namer.
The following name of the matching icon given as an image might represent the symbol well, but at the same time, it might not.
Rename the following name based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer “magnifying-glass” over “search”. But at the same time, don't be too ambiguous.
Please use \`kebab-case\` for the name, rather than any other naming convention. If one word is enough, leave out the hyphens and use only one word.
Please do not attach any affixes like “icon” or “ic”, or "fill" or "thin" to the name.
Please provide only one suggestion. and do not format your answer in any way and do not include any additional information.
`;

const names = Object.keys(iconMap);

const count = 10;

const randomNames = names.sort(() => 0.5 - Math.random()).slice(0, count);

for await (const name of names) {
  const image = fs.readFileSync(
    path.resolve(
      import.meta.dirname,
      "../assets",
      `${iconMap[name].regular}.png`
    )
  );

  const { text } = await generateText({
    model: vertex("gemini-1.5-pro"),
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          { type: "text", text: name },
          { type: "image", image },
        ],
      },
    ],
  });

  console.log(`previous name: ${name} -> new name: ${text.trim()}`);
}
