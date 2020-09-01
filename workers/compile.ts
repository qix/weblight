import { Controller, sourceArrow, createController } from "../src/parse";

const COMPILE_DEBOUNCE_MS = 15;

export interface CompileRequest {
  type: "compile";
  source: string;
}
export interface MessageRequest {
  type: "message";
  message: string;
}
export type Request = CompileRequest | MessageRequest;

export interface CompileOkay {
  type: "compileOkay";
  source: string;
}
export interface CompileError {
  type: "compileError";
  message: string;
  source: string;
}
export interface StepError {
  type: "runtimeError";
  message: string;
  source: string;
}
export interface Log {
  type: "log";
  format: string;
  args: any[];
  source: string;
}
export interface Render {
  type: "render";
  buffer: Uint8Array;
}
export type Response = CompileOkay | CompileError | StepError | Render | Log;

let compileTimeout: any = null;
let lastMessage: string = "";

function respond(response: Response) {
  (postMessage as any)(response);
}

let controller: Controller | null = null;

function tryRuntime(cb: () => void) {
  try {
    cb();
  } catch (err) {
    respond({
      type: "runtimeError",
      message: err.stack,
      source: controller.source,
    });
    controller = null;
  }
}

addEventListener("message", (event) => {
  const message = event.data as Request;

  if (message.type === "compile") {
    const { source } = message;
    if (compileTimeout) {
      clearTimeout(compileTimeout);
    }
    compileTimeout = setTimeout(() => {
      try {
        controller = createController(source, {
          log: (format: string, ...args: any[]) => {
            respond({
              type: "log",
              source,
              format,
              args,
            });
          },
        });
        respond({
          type: "compileOkay",
          source,
        });
      } catch (err) {
        let message = err.stack;
        if (err.location) {
          message =
            "Line " +
            err.location.start.line +
            ":\n" +
            sourceArrow(source, err.location) +
            "\n" +
            message;
        }
        respond({
          type: "compileError",
          message,
          source,
        });
        return;
      }

      tryRuntime(() => {
        controller.setup();
        controller.message(lastMessage);
      });
    }, COMPILE_DEBOUNCE_MS);
  } else if (message.type === "message") {
    if (controller) {
      controller.message(message.message);
    }
    lastMessage = message.message;
  }
});

setInterval(() => {
  if (controller) {
    tryRuntime(() => {
      controller.loop();

      respond({
        type: "render",
        buffer: controller.ledBuffer,
      });
    });
  }
}, 25);

export {};
