import fs from "fs";
import path from "path";

export interface IconDataSvg {
  name: string;
  svg: string;
}

const dataPath = path.resolve(import.meta.dirname, "icons.json");

export function getIconDataListSvg(type: "regular" | "fill"): IconDataSvg[] {
  return (
    Object.values(JSON.parse(fs.readFileSync(dataPath, "utf-8"))) as {
      name: string;
      svg: string;
    }[]
  )
    .filter((data) => data.name.endsWith(`_${type}`))
    .map(({ name, svg }) => ({
      name: name.split("_").slice(0, -1).join("-"),
      svg: svg.replace(`fill=\"black\"`, `fill=\"#6e6e6e\"`),
    }));
}
