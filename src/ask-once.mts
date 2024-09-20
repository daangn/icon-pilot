import * as dotenv from "dotenv";
import fs from "fs";
import * as path from "node:path";

import { generateObject, type CoreUserMessage } from "ai";
import { getIconDataListFromAssets } from "./data/load-icon.mjs";
import { z } from "zod";
import { createVertex } from "@ai-sdk/google-vertex";
import { getHash } from "./utils/get-hash.mjs";

dotenv.config();

const SYSTEM_PROMPT = `You are an icon namer.
The following name of the matching icon given as an image might represent the symbol well, but at the same time, it might not.
Rename the following name based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer “magnifying-glass” over “search”. But at the same time, don't be too ambiguous.
Please use \`kebab-case\` for the name, rather than any other naming convention.
If one word is enough, leave out the hyphens and feel free to use the word as it is.
Please do not attach any affixes like “icon” or “ic”, or "fill" or "thin" to the name.
Please consider that similar icons should have similar names. For example, if you have “arrow-down”, then the icon that points to the left should be “arrow-left”, not “left-arrow” or “arrow-to-the-left”.
Also, there can't be any duplicate names. If you are to use a name that you have already used, please come up with a different name or add “-alt”, “-alt-2”, and so on.
`;
const SEED = 0;

const vertex = createVertex({
  googleAuthOptions: {
    keyFilename: path.resolve(
      import.meta.dirname,
      "../auth/service_account.json"
    ),
  },
  location: "us-central1",
});

const iconDataList = getIconDataListFromAssets();

const userMessages: CoreUserMessage[] = iconDataList.map(
  ({ name, pngBase64 }) => ({
    role: "user",
    content: [
      { type: "text", text: name },
      { type: "image", image: pngBase64 },
    ],
  })
);

const { object } = await generateObject({
  seed: SEED,
  model: vertex("gemini-1.5-pro"),
  output: "array",
  schema: z.object({
    currentName: z.string(),
    suggestedName: z.string(),
  }),
  messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
});

const dataToSave = JSON.stringify(
  {
    systemPrompt: SYSTEM_PROMPT,
    description: "한 번에 요청한 결과",
    seed: SEED,
    results: object.map(({ currentName, suggestedName }) => ({
      currentName,
      suggestedName,
      image: iconDataList.find(({ name }) => name === currentName).pngBase64,
    })),
  },
  null,
  2
);
const objectHash = getHash(JSON.stringify(dataToSave));

if (!fs.existsSync(path.resolve(import.meta.dirname, "../results"))) {
  fs.mkdirSync(path.resolve(import.meta.dirname, "../results"));
}
fs.writeFileSync(
  path.resolve(import.meta.dirname, `../results/results-${objectHash}.json`),
  dataToSave
);
