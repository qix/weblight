import { Controller, compile, sourceArrow } from "../src/parse";

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
export interface Render {
  type: "render";
  buffer: Uint8Array;
}
export type Response = CompileOkay | CompileError | Render;

let compileTimeout: any = null;
let lastMessage: string = "";

function respond(response: Response) {
  (postMessage as any)(response);
}

let controller: Controller | null = null;

addEventListener("message", (event) => {
  const message = event.data as Request;

  if (message.type === "compile") {
    const { source } = message;
    if (compileTimeout) {
      clearTimeout(compileTimeout);
    }
    compileTimeout = setTimeout(() => {
      try {
        controller = compile(source);
        controller.message(lastMessage);
        respond({
          type: "compileOkay",
          source,
        });
      } catch (err) {
        respond({
          type: "compileError",
          message: err.stack,
          source,
        });
      }
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
    controller.step();
    respond({
      type: "render",
      buffer: controller.ledBuffer,
    });
  }
}, 25);

export {};
