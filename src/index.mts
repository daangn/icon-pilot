import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

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
      "../auth/service_account.json"
    ),
  },
  location: "us-central1",
});

const possibleSuffixes = ["_regular", "_thin", "_fill"];

main();

async function main() {
  const paths = fs.readdirSync(path.resolve(import.meta.dirname, "../assets"));
  const iconMap = getIconNames(paths);

  const randomNames = Object.keys(iconMap)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  try {
    const json = { prompt };

    for await (const randomName of randomNames) {
      const previousNames = iconMap[randomName];
      const newName = await getNewName(previousNames.regular);

      const availableSuffixes = possibleSuffixes.filter(
        (suffix) => previousNames[suffix.replace("_", "")]
      );

      const newNames = availableSuffixes.reduce((acc, suffix) => {
        acc[suffix.replace("_", "")] = newName + suffix;

        return acc;
      }, {});

      json[randomName] = { before: previousNames, after: newNames };
    }

    console.log(json);
  } catch (error) {
    console.error(error);
  }
}

async function getNewName(regularPath: string) {
  const imagePath = path.resolve(
    import.meta.dirname,
    "../assets",
    `${regularPath}.png`
  );

  const image = fs.readFileSync(imagePath);

  const { text } = await generateText({
    model: vertex("gemini-1.5-pro"),
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          { type: "text", text: regularPath },
          { type: "image", image },
        ],
      },
    ],
  });

  const newName = text.trim();
  console.log(
    `previous name: ${regularPath.split(
      possibleSuffixes[0]
    )} -> new name: ${newName}`
  );

  return newName;
}

function getIconNames(paths: string[]) {
  const iconMap = paths.reduce((acc, path) => {
    const fileName = path.replace(".png", "");
    const suffix = possibleSuffixes.find((suffix) => fileName.endsWith(suffix));
    const plainName = suffix ? fileName.replace(suffix, "") : fileName;

    if (!suffix) {
      acc[plainName] = { regular: fileName };

      return acc;
    }

    acc[plainName] = { ...acc[plainName], [suffix.replace("_", "")]: fileName };

    return acc;
  }, {});

  return iconMap as Record<
    string,
    { regular: string; thin?: string; fill?: string }
  >;
}
