import * as dotenv from "dotenv";
import fs from "fs";
import * as path from "node:path";

import { generateObject, type CoreUserMessage } from "ai";
import { z } from "zod";
import { createVertex } from "@ai-sdk/google-vertex";
import { getHash } from "./utils/get-hash.mjs";
import { getIconDataListSvg } from "./data/load-svgs.mjs";
import sharp from "sharp";

dotenv.config();

const SYSTEM_PROMPT = `You are an icon tagging assistant. Based on the icon image and name, please provide tags that you think are appropriate in English and 한국어. For example, if the icon is a car, you can provide tags like "vehicle", "transportation", "automobile", "ride", etc. and if the icon is two vertical rectangles, you can provide tags like "pause", "vertical", "rectangle", etc. Please try to keep the tag in a single word or a short phrase. Please do NOT provide tags that are not words or phrases.`;
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

const iconDataList = getIconDataListSvg("fill");

const pngs = await Promise.all(
  iconDataList.map(({ svg }) =>
    sharp(Buffer.from(svg)).resize(128, 128).png().toBuffer()
  )
);

const userMessages: CoreUserMessage[] = iconDataList.map(({ name }, index) => {
  return {
    role: "user",
    content: [
      { type: "text", text: name },
      { type: "image", image: pngs[index] },
    ],
  };
});

const { object } = await generateObject({
  seed: SEED,
  model: vertex("gemini-1.5-pro"),
  schema: z.record(
    z.string().describe("currentName"),
    z.array(z.string()).describe("tags")
  ),
  messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
});

const dataToSave = JSON.stringify(
  {
    systemPrompt: SYSTEM_PROMPT,
    description: "태그 추천",
    seed: SEED,
    results: object,
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
