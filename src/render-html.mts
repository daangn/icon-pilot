#!/usr/bin/env node

import fs from "fs";
import path from "node:path";

interface Result {
  currentName: string;
  suggestedName: string;
  image: string;
}

interface Collection {
  systemPrompt: string;
  description?: string;
  seed: number;
  results: Result[];
}

const files = fs
  .readdirSync(path.resolve(import.meta.dirname, "../results"))
  .filter((filename) => filename.endsWith(".json"));

const itemsPerFile: Record<string, number> = {};

for (const filename of files) {
  const data = JSON.parse(
    fs.readFileSync(
      path.resolve(import.meta.dirname, `../results/${filename}`),
      {
        encoding: "utf-8",
      },
    ),
  ) as Collection;

  itemsPerFile[filename] = data.results.length;

  // render html from data. html should include {currentName}, {suggestedName}, {image} table.
  // image is encoded in base64 format.
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Results</title>
  <style>
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid black;
      padding: 8px;
      text-align: left;
    }
  </style>
</head>
<body>
  <h1>Results</h1>
  <p>System Prompt: ${data.systemPrompt}</p>
  <p>Seed: ${data.seed}</p>
  <p>Description: ${data.description}</p>
  <p>Total Results: ${data.results.length}</p>
  <table>
    <thead>
      <tr>
        <th>Current Name</th>
        <th>Suggested Name</th>
        <th>Image</th>
      </tr>
    </thead>
    <tbody>
      ${data.results
        .map(
          ({ currentName, suggestedName, image }) => `
        <tr>
          <td>${currentName}</td>
          <td>${suggestedName}</td>
          <td><img src="data:image/png;base64,${image}" alt="${currentName}"></td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>
`;

  fs.writeFileSync(
    path.resolve(import.meta.dirname, `../results/${filename}.html`),
    html,
  );
}

const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Results Index</title>
</head>
<body>
  <h1>Results Index</h1>
  <ul>
    ${files
      .map(
        (filename) => `
      <li><a href="${filename}.html">${filename} (${itemsPerFile[filename]} items)</a></li>
    `,
      )
      .join("")}
  </ul>
</body>
</html>
`;

fs.writeFileSync(
  path.resolve(import.meta.dirname, "../results/index.html"),
  indexHtml,
);
