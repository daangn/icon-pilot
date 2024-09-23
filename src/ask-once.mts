import * as dotenv from "dotenv";
import fs from "fs";
import * as path from "node:path";

import { generateObject, type CoreUserMessage } from "ai";
import { getIconDataList } from "./data/load-icon.mjs";
import { z } from "zod";
import { createVertex } from "@ai-sdk/google-vertex";
import { getHash } from "./utils/get-hash.mjs";

dotenv.config();

const SYSTEM_PROMPT = `You are an icon namer.
The following name of the icon image might or might not represent the icon well. Please rename the following name based on "what it looks like," NOT "what will happen if you click a button with the icon" (the function or the action that the icon represents).
If the original name for the image sounds semantic, ambiguous or non-descriptive, feel free to come up with a new name using easy, precise words that fits the image well (even if it's just a little bit or it's the most common name for the image.) For example, prefer "magnifying-glass" over "search", "envelope" over "mail", "trash-can" over "delete." In the same way, "arrow-right" is better than "arrow-next" or "arrow-forward."
If there are multiple icons that look similar or can be grouped together, please name them in a way that they can be easily identified as a group. For example, if you have "arrow-down", then the icon that points to the left should be "arrow-left", NOT "left-arrow" or "arrow-to-the-left". Also, if you named the icon which has a question mark inside a circle as "circle-question", then the icon which has an exclamation mark inside a circle should be named as "circle-exclamation", NOT "exclamation-circle." The same applies to the icons which has a symbol at their corners. For example, if you named the list icon which has a plus mark at the bottom right corner as "list-plus", then the envelope icon which has a plus mark at the bottom right corner should be named as "envelope-plus", NOT "plus-envelope", "envelope-with-plus", or "envelope-plus-at-bottom-right". At the same time, different icons should have distinct names. For example, you should remember that "arrow", "chevron", "caret", and "triangle" refer to different shapes.
Please use \`kebab-case\` for the name, rather than any other naming convention.
If one word is enough, leave out the hyphens and feel free to use the word as it is.
Also, there can't be any duplicate names. If you are to use a name that you have already used, it means that you named the icon not as descriptive as you could. In this case, please try to come up with a new name that fits the icon better. Please do not attach any suffixes like "-alt" or "-2" to the name.
`;
const SEED = Math.floor(Math.random() * 100000);

const vertex = createVertex({
  googleAuthOptions: {
    keyFilename: path.resolve(
      import.meta.dirname,
      "../auth/service_account.json"
    ),
  },
  location: "us-central1",
});

const iconDataList = getIconDataList();

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

const date = new Date().toISOString().replace(/:/g, "-");
const objectHash = getHash(JSON.stringify(dataToSave));

if (!fs.existsSync(path.resolve(import.meta.dirname, "../results"))) {
  fs.mkdirSync(path.resolve(import.meta.dirname, "../results"));
}
fs.writeFileSync(
  path.resolve(
    import.meta.dirname,
    `../results/results-${date}-${objectHash}.json`
  ),
  dataToSave
);
