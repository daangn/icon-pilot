import * as dotenv from "dotenv";
import * as path from "node:path";

import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { getIconDataList } from "./load-icon.mjs";

dotenv.config();

const prompt = `You are an icon namer.
The following name of the matching icon given as an image might represent the symbol well, but at the same time, it might not.
Rename the following name based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer “magnifying-glass” over “search”. But at the same time, don't be too ambiguous.
Please use \`kebab-case\` for the name, rather than any other naming convention.
If one word is enough, leave out the hyphens and feel free to use the word as it is.
Please do not attach any affixes like “icon” or “ic”, or "fill" or "thin" to the name.
Please provide only one suggestion. and do not format your answer in any way and do not include any additional information.
`;

const vertex = createVertex({
  googleAuthOptions: {
    keyFilename: path.resolve(
      import.meta.dirname,
      "../auth/service_account.json",
    ),
  },
  location: "us-central1",
});

const iconDataList = getIconDataList();

for (const { name, pngBase64 } of iconDataList) {
  console.log("Requesting name for:", name);
  const { text } = await generateText({
    model: vertex("gemini-1.0-pro"),
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          { type: "text", text: name },
          { type: "image", image: pngBase64 },
        ],
      },
    ],
  });

  console.log("Suggested Name:", text);
  console.log("-----------------------------------");
}
