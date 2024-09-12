import * as dotenv from "dotenv";
import { generateObject, type CoreUserMessage } from "ai";
import { getIconDataList } from "./load-icon.mjs";
import { vertex } from "./models.mjs";
import { z } from "zod";

dotenv.config();

const prompt = `You are an icon namer.
The following name of the matching icon given as an image might represent the symbol well, but at the same time, it might not.
Rename the following name based on “what it looks like”, not “what will happen if you click a button with the icon.”
For example, prefer “magnifying-glass” over “search”. But at the same time, don't be too ambiguous.
Please use \`kebab-case\` for the name, rather than any other naming convention.
If one word is enough, leave out the hyphens and feel free to use the word as it is.
Please do not attach any affixes like “icon” or “ic”, or "fill" or "thin" to the name.
Please consider that similar icons should have similar names. For example, if you have “arrow-down”, then the icon that points to the left should be “arrow-left”, not “left-arrow” or “arrow-to-the-left”.
Also, there can't be any duplicate names. If you see a name that is already used, please come up with a different name or add “-alt”, “-alt-2”, and so on.
`;

const iconDataList = getIconDataList();

const userMessages: CoreUserMessage[] = iconDataList.map(
  ({ name, pngBase64 }) => ({
    role: "user",
    content: [
      { type: "text", text: name },
      { type: "image", image: pngBase64 },
    ],
  }),
);

const { object } = await generateObject({
  model: vertex("gemini-1.5-pro"),
  output: "array",
  schema: z.object({
    oldName: z.string().describe("The original name of the icon."),
    newName: z.string().describe("The new name of the icon."),
  }),
  messages: [{ role: "system", content: prompt }, ...userMessages],
});

console.log(object);
