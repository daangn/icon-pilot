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

const SYSTEM_PROMPT = `You are an icon namer. The following name of the icon image might or might not represent the icon well. Please rename the following icon images based on "what it looks like," NOT "what will happen if you click a button with the icon, or the function or the action that the icon represents. To follow this rule, it's important to prefer nouns over verbs. For example, a circular arrow icon should NOT be named "refresh", "reload", or "rotate", but rather "arrow_clockwise" or something similar, and an arrow swerving to the left should NOT be named "arrow_undo" or "back", but rather "arrow_u_turn_left" or something similar. You should abide by this rule even if there's already a widely accepted name which is based on actions. For example, prefer "magnifying_glass" over "search", "trash_can" over "delete." In the same way, "arrow_right" is better than "next" or "forward." Please come up with names using easy, and at the same time precise words that fits the image well. Please use \`snake_case\` for the name, rather than any other naming convention. If one word is enough, leave out the hyphens and feel free to use the word as it is. At the same time, use multiple words if necessary. The composition of the name should be as follows: element1_element2_direction_feature_container. For example, if the icon is a right-facing arrow inside a circle, the name should be "arrow_right_circle". If "element1" or "element2" consists of 2 or more same figures, use singular form (NOT plural) of the figure and suffix the number of the figure to the figure name WITHOUT any "_". For example, if an icon consists of 3 horizontal lines, the name should be "line3_horizontal". If there is another icon with tighter spacing between the lines, the name should be "line3_horizontal_tight". Finally, please do not attach any unnecessary affixes like "_fill".`;
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
  .slice(0, 50);

const referenceMessages: (CoreUserMessage | CoreAssistantMessage)[] = [];

references.forEach(({ name, pngBase64 }) => {
  referenceMessages.push({
    role: "user",
    content: [
      { type: "text", text: `How would you name this icon?` },
      { type: "image", image: pngBase64 },
    ],
  });

  referenceMessages.push({
    role: "assistant",
    content: [{ type: "text", text: name }],
  });
});

const iconDataList = getIconDataList("fill", "4x");

const userMessages: CoreUserMessage[] = iconDataList.map(
  ({ pngBase64, name }) => ({
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
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...referenceMessages,
    ...userMessages,
  ],
});

const dataToSave = JSON.stringify(
  {
    systemPrompt: SYSTEM_PROMPT,
    description: "한 번에 요청한 결과 (이전 이름 및 SF Symbols 첨부)",
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
