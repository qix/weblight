import { Location, Block } from "./ast";
import { parse as pegParse, SyntaxError } from "./lang";
import prettier from "prettier/standalone";
import prettierBabel from "prettier/parser-babel";
import { Context } from "./context";

export function sourceArrow(source: string, location: Location): string {
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
      // Could improve error reporting here
      // console.log(sourceArrow(source, err.location));
    }
    throw err;
  }
}

export class Controller {
  constructor(
    readonly source: string,
    readonly size: number,
    readonly ledBuffer: Uint8Array,
    readonly setup: () => void,
    readonly loop: () => void,
    readonly message: (input: string) => void
  ) {}
}

export function compile(source: string, inputNames: string[]) {
  const ctx = new Context();
  const ast = parse(source);
  let transpiled = ast.statements.map((s) => s.transpile(ctx)).join("\n");

  // Genate source code for each message
  let blockSource: { [name: string]: string } = {};
  Object.entries(ctx.messages).forEach(([name, block]) => {
    blockSource[name] = block.transpile(ctx);
  });
  Object.keys(ctx.modes).forEach((name) => {
    if (!blockSource.hasOwnProperty(name)) {
      blockSource[name] = `{ set_mode(${name}); }`;
    }
  });

  blockSource["*"] = blockSource["*"] || "{}";

  transpiled =
    [...Object.keys(ctx.modes).sort(), "NUM_DISPLAY_MODES"]
      .map((mode, idx) => {
        return `const ${mode} = ${idx};`;
      })
      .join("\n") + transpiled;

  transpiled +=
    "function message(msg) {\n" +
    [
      ...Object.entries(blockSource)
        .filter(([name, source]) => name !== "*")
        .map(([name, source]) => {
          return `if (msg === ${JSON.stringify(name)}) ${source}`;
        }),
      blockSource["*"],
    ].join(" else ") +
    "}\n";

  transpiled +=
    "function render_mode() {\n" +
    Object.entries(ctx.modes)
      .map(([name, block]) => {
        return `if (current_mode === ${name}) ${block.transpile(ctx)}`;
      })
      .join(" else ") +
    "}\n";

  const inputArgs = inputNames.join(",");
  const header = `
    (function() {
        return function(${inputArgs}) {`;
  const footer = `
            return { setup, loop, message };
        }
    })()`;
  return prettier.format(header + transpiled + footer, {
    parser: "babel",
    plugins: [prettierBabel],
  });
}

export function createController(
  source: string,
  options: {
    log: (format: string, ...args: any) => void;
  }
) {
  // These values are used to produce better colors in lights, since the birghtness is not
  // uniform across the range. On a computer screen though treat it as uniform.
  const gamma8 = Array.from(Array(256)).map((v, idx) => idx);
  const gamma8_floor = Array.from(Array(256)).map((v, idx) => idx);
  const gamma8_partial = Array.from(Array(256)).fill(0);

  const ROPE_LEDS = 300;
  const ledBuffer = new Uint8Array(ROPE_LEDS * 3);

  const inputs = {
    UINT_MAX: 65535,
    ROPE_LEDS,
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
    log: options.log,
    uint8(value: number) {
      return value & 255;
    },
    uint16(value: number) {
      return value & 65535;
    },
    abs(value: number) {
      return Math.abs(value);
    },
    delay(ms: number) {},
    millis() {
      return Date.now();
    },
    digitalWrite() {},
    switch_light() {},
    strlen(str: string) {
      return str.length;
    },
    hex2int(char: string) {
      return parseInt(char, 16);
    },
  };
  const code = compile(source, Object.keys(inputs).sort());

  const build = eval(code);
  const { setup, loop, message } = build(
    ...Object.keys(inputs)
      .sort()
      .map((k) => inputs[k])
  );

  return new Controller(
    source,
    ROPE_LEDS,
    ledBuffer,
    setup,
    loop,
    (msg: string) => {
      for (const word of msg.split(" ")) {
        message(word.toUpperCase());
      }
    }
  );
}
