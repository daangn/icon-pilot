import * as dotenv from "dotenv";
import fs from "fs";
import * as path from "node:path";

import { createVertex } from "@ai-sdk/google-vertex";
import { PromisePool } from "@supercharge/promise-pool";
import { generateObject } from "ai";
import { z } from "zod";
import { getIconDataList } from "./data/load-icon.mjs";
import { getHash } from "./utils/get-hash.mjs";

dotenv.config();

const CONCURRENCY = 1;

const SYSTEM_PROMPT = `You are an icon naming expert.
Rename the following icon names based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer “magnifying-glass” over “search”. But at the same time, don't be too ambiguous.
If one word is enough, leave out the hyphens and feel free to use the word as it is.
Please do not attach any affixes like “icon” or “ic”, or "fill" or "thin" to the name.
`;
const SEED = 0;

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

const { errors, results } = await PromisePool.for(iconDataList)
  .withConcurrency(CONCURRENCY)
  .useCorrespondingResults()
  .onTaskStarted((item, pool) => {
    console.log(`Progress: ${pool.processedPercentage()}%`);
    console.log(`Active tasks: ${pool.activeTasksCount()}`);
    console.log(`Finished tasks: ${pool.processedCount()}`);
  })
  .process(({ name, pngBase64 }) =>
    generateObject({
      seed: SEED,
      model: vertex("gemini-1.5-pro"),
      schema: z.object({
        suggestedName: z.string(),
      }),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: name },
            { type: "image", image: pngBase64 },
          ],
        },
      ],
    }).then(({ object }) => ({
      currentName: name,
      suggestedName: object.suggestedName,
      image: pngBase64,
    })),
  );

if (errors.length > 0) {
  console.error(errors);
  process.exit(1);
}

const dataToSave = JSON.stringify(
  {
    systemPrompt: SYSTEM_PROMPT,
    description: "각각 요청한 결과",
    seed: SEED,
    results,
  },
  null,
  2,
);
const objectHash = getHash(JSON.stringify(dataToSave));

if (!fs.existsSync(path.resolve(import.meta.dirname, "../results"))) {
  fs.mkdirSync(path.resolve(import.meta.dirname, "../results"));
}
fs.writeFileSync(
  path.resolve(import.meta.dirname, `../results/results-${objectHash}.json`),
  dataToSave,
);
