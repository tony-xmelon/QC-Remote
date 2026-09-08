import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QC_INPUT_ROUTES, QC_OUTPUT_ROUTES } from "../packages/typescript/qc-client/src/generated-domain.ts";
import { routePickerLabel } from "../packages/typescript/qc-core/src/routing.ts";

/**
 * Four descriptions of the same twenty-three ports had never been checked
 * against each other: the enum Cortex Control carries in its own binary, the
 * `contracts/qc-domain.v1.json` table our clients generate from, the words the
 * app's route picker prints, and the rows the device draws in its own route
 * selector. Checking them found one drift - the app said `USB Input 5` where
 * CorOS says `USB input 5` - so the four are pinned together here.
 *
 * The .proto is read rather than the .desc it came from: `verify:cortex-protocol`
 * proves the two are the same schema field for field.
 */

const proto = readFileSync("packages/rust/qc-protocol/proto/ProductionAutomation.proto", "utf8");
const domain = JSON.parse(readFileSync("contracts/qc-domain.v1.json", "utf8"));
const fixtures = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");

/** The label CorOS prints for each port the device declares. */
const DEVICE_LABELS = {
  input: {
    EMPTY: "Not In Use",
    INPUT_1: "Input 1",
    INPUT_2: "Input 2",
    INPUT_1_2: "Input 1/2",
    RETURN_1: "Return 1",
    RETURN_2: "Return 2",
    RETURN_1_2: "Return 1/2",
    PREV_ROW: "Prev. Row",
    USB_IN_5: "USB input 5",
    USB_IN_6: "USB input 6",
    USB_IN_7: "USB input 7",
    USB_IN_8: "USB input 8",
    USB_IN_5_6: "USB input 5/6",
    USB_IN_7_8: "USB input 7/8",
    SIDECHAIN_BUFFER: null,
    MAX_PORTS: null
  },
  output: {
    EMPTY: "Not In Use",
    XLR_1_2: "Output 1/2",
    OUTPUT_3_4: "Output 3/4",
    SEND_1_2: "Send 1/2",
    XLR_1: "Output 1",
    XLR_2: "Output 2",
    OUTPUT_3: "Output 3",
    OUTPUT_4: "Output 4",
    SEND_1: "Send 1",
    SEND_2: "Send 2",
    USB_OUT_5: "USB Output 5",
    USB_OUT_6: "USB Output 6",
    USB_OUT_7: "USB Output 7",
    USB_OUT_8: "USB Output 8",
    USB_OUT_5_6: "USB Output 5/6",
    USB_OUT_7_8: "USB Output 7/8",
    NEXT_ROW_3: "Row 3",
    NEXT_ROW_4: "Row 4",
    NEXT_ROW_3_4: "Row 3/4",
    MULTIPLE_OUTS: "Multiple Outputs",
    USB_OUT_3: "USB Output 3",
    USB_OUT_4: "USB Output 4",
    USB_OUT_3_4: "USB Output 3/4",
    MAX_PORTS: null
  }
} as const satisfies Record<"input" | "output", Record<string, string | null>>;

/**
 * `SIDECHAIN_BUFFER` is the sidechain tap the compiler wires internally, and
 * `MAX_PORTS` is the enum's own count. Neither is a row the player can pick,
 * so neither belongs in the picker.
 */
const NOT_SELECTABLE = new Set(["SIDECHAIN_BUFFER", "MAX_PORTS"]);

function deviceEnum(message: string, name: string): Map<string, number> {
  const messageBody = new RegExp(`message ${message} \\{[\\s\\S]*?\\n\\}`).exec(proto);
  assert.ok(messageBody, `${message} is missing from the extracted schema`);
  const body = new RegExp(`enum ${name} \\{([\\s\\S]*?)\\n  \\}`).exec(messageBody[0]);
  assert.ok(body, `${message}.${name} is missing from the extracted schema`);
  return new Map([...body[1].matchAll(/^\s*([A-Z0-9_]+) = (\d+);$/gm)].map((match) => [match[1], Number(match[2])]));
}

/** The route rows CorOS draws, read straight out of the device's own frame. */
function selectorRows(capture: string): string[] {
  const tree = readFileSync(`references/qc-ui-corpus/coros-4.1.0/${capture}.tree.txt`, "utf8");
  const text = [...tree.matchAll(/text : '([^']*)'/g)].map((match) => match[1]);
  const start = text.findIndex((entry) => entry === "MONO" || entry === "STEREO");
  const end = text.lastIndexOf("Not In Use");
  assert.ok(start >= 0, `${capture} has no MONO/STEREO caption`);
  assert.ok(end > start, `${capture} does not end on the Not In Use row`);
  // The popup sits over the Grid, whose own rail labels are two lines; the one
  // row inside the popup that carries a second line is Multiple Outputs.
  return text.slice(start, end + 1).filter((entry) => entry !== "1/2 + 3/4 + USB 3/4");
}

function fixtureCells(name: string): string[] {
  const block = new RegExp(`const ${name}: Array<\\[string, string\\]> = \\[([\\s\\S]*?)\\n\\];`).exec(fixtures);
  assert.ok(block, `${name} is missing from the screen fixtures`);
  return [...block[1].matchAll(/\["([^"]*)",/g)].map((match) => match[1]);
}

const SIDES = [
  { side: "input" as const, message: "GainCalInputPortParameter", enumName: "InputPortId", routes: QC_INPUT_ROUTES, contract: domain.inputRoutes, cells: "ROUTE_INPUT_CELLS", captures: ["input-route-selector", "input-route-selector-top"] },
  { side: "output" as const, message: "GainCalOutputPortParameter", enumName: "OutputPortId", routes: QC_OUTPUT_ROUTES, contract: domain.outputRoutes, cells: "ROUTE_OUTPUT_CELLS", captures: ["output-route-selector", "output-route-selector-top"] }
];

for (const { side, message, enumName, routes, contract, cells, captures } of SIDES) {
  test(`every ${side} port the device declares is a route we know`, () => {
    const declared = deviceEnum(message, enumName);
    assert.deepEqual([...declared.keys()].sort(), Object.keys(DEVICE_LABELS[side]).sort(),
      `${message}.${enumName} no longer matches the ports this test describes; the device schema changed`);

    const byId = new Map(routes.map((route) => [route.id, route.label]));
    assert.equal(byId.size, routes.length, `${side} route ids must be unique`);
    assert.deepEqual(contract.map((route: { id: number }) => route.id), routes.map((route) => route.id),
      `contracts/qc-domain.v1.json and the generated ${side} table must agree`);

    for (const [name, id] of declared) {
      const expected = DEVICE_LABELS[side][name as keyof (typeof DEVICE_LABELS)[typeof side]];
      if (NOT_SELECTABLE.has(name)) {
        assert.equal(byId.has(id), false, `${name} is internal and must not be offered as a ${side} route`);
        continue;
      }
      assert.ok(byId.has(id), `the device declares ${name} = ${id} but no ${side} route claims that id`);
      const short = byId.get(id) as string;
      // "Internal" is our own name for the unrouted port; CorOS calls it Not In Use.
      assert.equal(routePickerLabel(side, short), expected,
        `${name} (${side} ${id}) reaches the player as the wrong words`);
    }

    for (const id of byId.keys()) {
      assert.ok([...declared.values()].includes(id), `${side} route ${id} is not a port the device declares`);
    }
  });

  test(`the ${side} route selector we draw is the list CorOS draws`, () => {
    const [first, ...rest] = captures.map(selectorRows);
    for (const [index, other] of rest.entries()) {
      assert.deepEqual(other, first, `${captures[index + 1]} lists different routes from ${captures[0]}`);
    }
    assert.deepEqual(fixtureCells(cells), first,
      `the ${side} route popup fixture no longer draws the rows the device frame shows`);

    // Every row the device drew is a port it declared, under the caption rows.
    const labels = new Set(Object.values(DEVICE_LABELS[side]).filter((label): label is string => label !== null));
    for (const row of first) {
      if (["MONO", "STEREO", "OTHER"].includes(row)) continue;
      assert.ok(labels.has(row), `the device frame shows a ${side} route this test cannot name: ${row}`);
    }
  });
}

test("the fixture snapshot routes carry the port ids the device would report", () => {
  const data = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixture-data.ts", "utf8");
  const inputs = new Map(QC_INPUT_ROUTES.map((route) => [route.label, route.id]));
  const outputs = new Map(QC_OUTPUT_ROUTES.map((route) => [route.label, route.id]));
  const routes = [...data.matchAll(/inputId: (\d+), outputId: (\d+), input: "([^"]*)", output: "([^"]*)"/g)];
  assert.ok(routes.length >= 8, "the fixture snapshots should still declare their routes inline");
  for (const [, inputId, outputId, input, output] of routes) {
    if (input) assert.equal(Number(inputId), inputs.get(input) ?? 0, `input "${input}" is stored under the wrong port id`);
    if (output) assert.equal(Number(outputId), outputs.get(output) ?? 0, `output "${output}" is stored under the wrong port id`);
  }
});
