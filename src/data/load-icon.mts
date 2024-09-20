import fs from "fs";
import path from "path";

export interface IconData {
  name: string;
  pngBase64: string;
}

const dataPath = path.resolve(import.meta.dirname, "icons.json");

export function getIconDataListFromJson(): IconData[] {
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

const assetsPath = path.resolve(import.meta.dirname, "../../assets");

export function getIconDataListFromAssets(): IconData[] {
  return fs
    .readdirSync(assetsPath)
    .filter((name) => name.endsWith("_regular.png"))
    .map((name) => ({
      name: name.split("_").slice(1, -1).join("-"),
      pngBase64: fs.readFileSync(path.resolve(assetsPath, name), "base64"),
    }));
}
