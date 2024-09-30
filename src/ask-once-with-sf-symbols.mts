import * as dotenv from "dotenv";
import fs from "fs";
import * as path from "node:path";

import {
  generateObject,
  type CoreAssistantMessage,
  type CoreUserMessage,
} from "ai";
import { getIconDataList, getReferences } from "./data/load-icon.mjs";
import { z } from "zod";
import { createVertex } from "@ai-sdk/google-vertex";
import { getHash } from "./utils/get-hash.mjs";

dotenv.config();

const SYSTEM_PROMPT = `You are an icon namer. The following name of the icon image might or might not represent the icon well. Please rename the following icon images based on "what it looks like," NOT "what will happen if you click a button with the icon, or the function or the action that the icon represents. To follow this rule, it's important to prefer nouns over verbs. For example, a circular arrow icon should NOT be named "refresh", "reload", or "rotate", but rather "arrow_clockwise" or something similar, and an arrow swerving to the left should NOT be named "arrow_undo" or "back", but rather "arrow_u_turn_left" or something similar. You should abide by this rule even if there's already a widely accepted name which is based on actions. For example, prefer "magnifying_glass" over "search", "trash_can" over "delete." In the same way, "arrow_right" is better than "next" or "forward." Please come up with names using easy, and at the same time precise words that fits the image well. Also, different icons should have distinct names. For example, you should remember that "arrow", "chevron", "caret", and "triangle" refer to different shapes. Please use \`snake_case\` for the name, rather than any other naming convention. If one word is enough, leave out the hyphens and feel free to use the word as it is. At the same time, use multiple words if necessary. Also, there can't be any duplicate names. If you are to use a name that you have already used, it means that you named the icon not as descriptive as you could. In this case, please try to come up with a new name that fits the icon better. Please do not attach any suffixes like "_alt" or "_2" to the name. Finally, please do not attach any unnecessary affixes like "_fill"`;
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

const references = getReferences()
  .sort(() => Math.random() - 0.5)
  .slice(0, 100);

const referenceUserMessages: CoreUserMessage[] = references.map(
  ({ pngBase64 }, index) => ({
    role: "user",
    content: [
      { type: "text", text: `Icon index ${index}` },
      { type: "image", image: pngBase64 },
    ],
  })
);

const referenceAssistantMessages: CoreAssistantMessage[] = references.map(
  ({ name }) => ({
    role: "assistant",
    content: [{ type: "text", text: name }],
  })
);

const iconDataList = getIconDataList();

const userMessages: CoreUserMessage[] = iconDataList.map(
  ({ pngBase64 }, index) => ({
    role: "user",
    content: [
      { type: "text", text: `Icon index ${index + references.length}` },
      { type: "image", image: pngBase64 },
    ],
  })
);

const { object } = await generateObject({
  seed: SEED,
  model: vertex("gemini-1.5-pro"),
  output: "array",
  schema: z.object({
    index: z.number(),
    suggestedName: z.string(),
  }),
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...referenceUserMessages,
    ...referenceAssistantMessages,
    ...userMessages,
  ],
});

console.log(object);

const dataToSave = JSON.stringify(
  {
    systemPrompt: SYSTEM_PROMPT,
    description: "한 번에 요청한 결과 (SF Symbols 첨부)",
    seed: SEED,
    results: object.map(({ index, suggestedName }) => ({
      currentName: iconDataList[index + references.length].name,
      suggestedName,
      image: iconDataList[index + references.length].pngBase64,
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
