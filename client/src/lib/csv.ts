export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  const pushValue = () => {
    row.push(value);
    value = "";
  };
  const pushRow = () => {
    pushValue();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === ",") {
      pushValue();
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      pushRow();
      continue;
    }

    value += character;
  }

  if (quoted) throw new Error("CSV_UNCLOSED_QUOTE");
  if (value || row.length) pushRow();

  return rows.filter((currentRow) => currentRow.some((cell) => cell.trim().length > 0));
}
