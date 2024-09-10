import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

dotenv.config();

const assetPaths = fs.readdirSync(
  path.resolve(import.meta.dirname, "../assets")
);

/*

for (const assetPath of assetPaths) {
  const image = fs.readFileSync(
    path.resolve(import.meta.dirname, "../assets", assetPath)
  );
}

*/

const vertex = createVertex({
  googleAuthOptions: {
    keyFilename: path.resolve(
      import.meta.dirname,
      "../auth/service_account.json"
    ),
  },
  location: "us-central1",
});

const image = fs.readFileSync(
  path.resolve(import.meta.dirname, "../assets", assetPaths[0])
);

const prompt = `You are an icon namer.
The following name of the matching icon given as an image might represent the symbol well, but at the same time, it might not.
Rename the following name based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer magnifying-glass” over “search”.
Please provide only one suggestion. and do not format your answer in any way and do not include any additional information.
`;

console.log(assetPaths[0]);

const { text } = await generateText({
  model: vertex("gemini-1.5-pro"),
  messages: [
    { role: "system", content: prompt },
    {
      role: "user",
      content: [
        { type: "text", text: assetPaths[0].replace(".png", "") },
        { type: "image", image },
      ],
    },
  ],
});

console.log(text);
