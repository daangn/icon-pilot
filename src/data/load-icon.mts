import fs from "fs";
import path from "path";

export interface IconData {
  name: string;
  pngBase64: string;
}

const dataPath = path.resolve(import.meta.dirname, "icons.json");

export function getIconDataList(): IconData[] {
  return (
    Object.values(JSON.parse(fs.readFileSync(dataPath, "utf-8"))) as {
      name: string;
      png: { "2x": string };
    }[]
  )
    .filter((data) => data.name.endsWith("_regular"))
    .map(({ name, png }) => ({
      name: name.split("_").slice(1, -1).join("-"),
      pngBase64: png["2x"],
    }));
}
