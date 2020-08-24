import { Location } from "./ast";
import { parse as pegParse, SyntaxError } from "./lang";
import prettier from "prettier/standalone";
import prettierBabel from "prettier/parser-babel";
import { Context } from "./context";
import { gamma8, gamma8_floor, gamma8_partial } from "./gamma";

function sourceArrow(source: string, location: Location): string {
  const { start, end } = location;
  const sourceLines = source.split("\n");

  let output = "";
  for (let line = start.line; line <= end.line; line++) {
    const source = sourceLines[line - 1];
    const left = line > start.line ? 0 : start.column - 1;
    const right = line < end.line ? source.length : end.column - 1;
    output += source + "\n";
    output += " ".repeat(left) + "^".repeat(right - left) + "\n";
  }

  return output;
}

function parse(source: string) {
  try {
    return pegParse(source);
  } catch (err) {
    if (err.location) {
      console.log(sourceArrow(source, err.location));
    }
    throw err;
  }
}

export class Controller {
  constructor(
    readonly source: string,
    readonly size: number,
    readonly ledBuffer: Uint8Array,
    readonly step: () => void,
    readonly message: (input: string) => void
  ) {}
}

export function compile(source: string) {
  const ctx = new Context();
  const ast = parse(source);
  const transpiled = ast.statements.map((s) => s.transpile(ctx)).join("\n");

  const ROPE_START = 25;
  const ROPE_END = 300 - 1;
  const ROPE_LEDS = ROPE_END - ROPE_START + 1;
  const ledBuffer = new Uint8Array(ROPE_LEDS * 3);
  const inputs = {
    ROPE_START,
    ROPE_END,
    ROPE_LEDS,
    ROPE_TOTAL: 300,
    ledBuffer,
    strcmp(left: string, right: string) {
      return left.localeCompare(right);
    },
    random(min: number, max: number | null = null) {
      if (max === null) {
        max = min;
        min = 0;
      }
      return min + Math.floor(Math.random() * (max - min));
    },
    rope_clear() {
      ledBuffer.fill(0);
    },
    gamma8,
    gamma8_floor,
    gamma8_partial,
    min(a: number, b: number) {
      return Math.min(a, b);
    },
    max(a: number, b: number) {
      return Math.max(a, b);
    },
    log(...args: any[]) {
      console.log(...args);
    },
    uint8(value: number) {
      value = Math.floor(value) % 256;
      if (value < 0) {
        return value + 256;
      } else {
        return value;
      }
    },
    abs(value: number) {
      return Math.abs(value);
    },
    delay(ms: number) {},
    millis() {
      return Date.now();
    },
  };

  const stepArgs = Object.keys(inputs).sort().join(",");
  const header = `
    (function() {
        return function(${stepArgs}) {`;
  const footer = `
            return { step, message };
        }
    })()`;
  const code = prettier.format(header + transpiled + footer, {
    parser: "babel",
    plugins: [prettierBabel],
  });
  console.log(code);

  const build = eval(code);
  const { step, message } = build(
    ...Object.keys(inputs)
      .sort()
      .map((k) => inputs[k])
  );

  return new Controller(source, ROPE_LEDS, ledBuffer, step, message);
}
