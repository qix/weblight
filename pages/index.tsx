import Head from "next/head";
import dynamic from "next/dynamic";

import styles from "../styles/Home.module.css";
import { useEffect, useState, useRef } from "react";
import { generateCoords } from "../src/points";
import SAMPLE from "../src/sample.c";
import { Request, Response } from "../workers/compile";

import Split from "react-split";
import { invariant } from "../src/invariant";
const MonacoEditor = dynamic(import("react-monaco-editor"), { ssr: false });

let LOG_ID = 0;

export default function Home() {
  const worker = useRef<Worker>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastSource = useRef<string>(null);
  const logs = useRef<JSX.Element[]>([]);

  const [, setLogId] = useState(LOG_ID);
  const [source, setSource] = useState(SAMPLE);
  const [message, setMessage] = useState("");

  function recompile() {
    clearLog("Compiling...");
    lastSource.current = source;
    req({ type: "compile", source });
  }

  if (lastSource.current !== source && worker.current) {
    recompile();
  }

  function updateMessage(evt) {
    setMessage(evt.target.value);
    req({
      type: "message",
      message: evt.target.value,
    });
  }

  function req(request: Request) {
    worker.current.postMessage(request);
  }

  function render(buffer: Uint8Array) {
    const ctx = canvas.current.getContext("2d");
    const width = canvas.current.clientWidth;
    const height = canvas.current.clientHeight;

    if (canvas.current.width !== width || canvas.current.height !== height) {
      canvas.current.width = width;
      canvas.current.height = height;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);
    }

    const { xCoord, yCoord } = generateCoords(width, height);

    const pixelCount = buffer.length / 3;
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      const color =
        "rgb(" +
        [buffer[pixel * 3 + 1], buffer[pixel * 3 + 0], buffer[pixel * 3 + 2]]
          .map((v) => {
            return 32 + (255 - 32) * (v / 255);
          })
          .join(",") +
        ")";
      ctx.fillStyle = color;
      ctx.fillRect(xCoord[pixel] - 2, yCoord[pixel] - 2, 4, 4);
    }
  }

  function clearLog(message: string) {
    logs.current = [<div key={LOG_ID++}>{message}</div>];
    setLogId(LOG_ID);
  }
  function log(format: string, ...args: any[]) {
    // @todo: We might want to pull in a module to do proper formatting later
    let message = format;
    for (const arg of args) {
      message += " " + JSON.stringify(arg);
    }

    // @todo: This is an extremely hacky way to do logs
    if (logs.current.length > 15) {
      logs.current.shift();
    }
    logs.current.push(<div key={LOG_ID++}>{message}</div>);
    setLogId(LOG_ID);
  }

  useEffect(() => {
    invariant(!worker.current, "Worker created twice");
    worker.current = new Worker("../workers/compile", { type: "module" });
    worker.current.onmessage = (event) => {
      const res = event.data as Response;
      if (res.type === "render") {
        render(res.buffer);
      } else if (res.type === "compileOkay") {
        if (res.source === lastSource.current) {
          clearLog("Compiled! Running...");
        }
      } else if (res.type === "compileError") {
        if (res.source === lastSource.current) {
          clearLog(res.message);
        }
      } else if (res.type === "runtimeError") {
        if (res.source === lastSource.current) {
          clearLog("Error during execution\n\n" + res.message);
        }
      } else if (res.type === "log") {
        // Always do a `console.log()` even if we're compiling new source
        console.log(res.format, ...res.args);

        if (res.source === lastSource.current) {
          log(res.format, ...res.args);
        }
      } else {
        console.log("Unknown webworker message:", res);
      }
    };
    const urlParams = new URLSearchParams(window.location.search);
    const defaultMode = urlParams.get("mode") || "CHASE";
    recompile();
    setMessage(defaultMode);
    req({ type: "message", message: defaultMode });

    const ctx = canvas.current.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.current.width, canvas.current.height);

    return () => {
      worker.current.terminate();
      worker.current = null;
    };
  }, []);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
      }}
    >
      <Head>
        <title>Weblight</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Split
        direction="horizontal"
        elementStyle={(dimension, size, gutterSize) => ({
          "flex-basis": `calc(${size}% - ${gutterSize}px)`,
        })}
        gutterStyle={(dimension, gutterSize) => ({
          "flex-basis": `${gutterSize}px`,
          cursor: "ew-resize",
        })}
        style={{ width: "100%", height: "100%", display: "flex" }}
      >
        <div>
          <MonacoEditor
            value={source}
            onChange={setSource}
            language="cpp"
            theme="vs-dark"
            editorDidMount={() => {
              (window as any).MonacoEnvironment.getWorkerUrl = (
                moduleId,
                label
              ) => {
                if (label === "json") return "_next/static/json.worker.js";
                if (label === "css") return "_next/static/css.worker.js";
                if (label === "html") return "_next/static/html.worker.js";
                if (label === "typescript" || label === "javascript")
                  return "_next/static/ts.worker.js";
                return "_next/static/editor.worker.js";
              };
            }}
          />
        </div>

        <Split
          direction="vertical"
          elementStyle={(dimension, size, gutterSize) => ({
            "flex-basis": `calc(${size}% - ${gutterSize}px)`,
          })}
          gutterStyle={(dimension, gutterSize) => ({
            "flex-basis": `${gutterSize}px`,
            cursor: "ns-resize",
          })}
          style={{
            flexDirection: "column",
            height: "100%",
            display: "flex",

            backgroundColor: "#000",
          }}
          sizes={[70, 0, 30]}
          minSize={[150, 20, 60]}
        >
          <canvas ref={canvas}></canvas>
          <input
            type="text"
            id="message"
            value={message}
            onChange={updateMessage}
            onKeyDown={(evt) => {
              if (evt.keyCode === 13) {
                req({
                  type: "message",
                  message,
                });
              }
            }}
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              maxWidth: "200px",
            }}
          ></input>
          <div
            style={{
              paddingTop: "5px",
              height: "100%",
              overflow: "auto",
              backgroundColor: "#111",
            }}
          >
            <div
              id="compileOutput"
              style={{
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                padding: "5px",
                color: "#fff",
                height: "100%",
              }}
            >
              {logs.current}
            </div>
          </div>
        </Split>
      </Split>
    </main>
  );
}
