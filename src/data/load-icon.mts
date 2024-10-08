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

export function getReferences(): IconData[] {
  const folder = path.resolve(
    import.meta.dirname,
    "../../references/sf-symbols"
  );

  const iconData = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".png"))
    .map((file) => ({
      name: file.replace(".png", "").replaceAll(".", "_"),
      pngBase64: fs.readFileSync(path.resolve(folder, file), "base64"),
    }));

  return iconData;
}
