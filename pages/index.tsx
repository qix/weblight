import Head from "next/head";
import dynamic from "next/dynamic";

import styles from "../styles/Home.module.css";
import { useEffect, useState, useRef } from "react";
import { generateCoords } from "../src/points";
import { SAMPLE } from "../src/sample";
import { Request, Response } from "../workers/compile";

import Split from "react-split";
import { invariant } from "../src/invariant";
const MonacoEditor = dynamic(import("react-monaco-editor"), { ssr: false });

export default function Home() {
  const worker = useRef<Worker>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastSource = useRef<string>(null);

  const [source, setSource] = useState(SAMPLE);
  const [message, setMessage] = useState("");
  const [compileOutput, setCompileOutput] = useState("Compiling...");

  function recompile() {
    setCompileOutput("Compiling...");
    lastSource.current = source;
    req({ type: "compile", source });
  }

  if (lastSource.current !== source && worker.current) {
    recompile();
  }

  function updateMessage(evt) {
    setMessage(evt.target.value);
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
      const color = `rgb(${buffer[pixel * 3 + 1]},${buffer[pixel * 3 + 0]},${
        buffer[pixel * 3 + 2]
      })`;
      ctx.fillStyle = color;
      ctx.fillRect(xCoord[pixel] - 2, yCoord[pixel] - 2, 4, 4);
    }
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
          setCompileOutput("Compile successful!");
        }
      } else if (res.type === "compileError") {
        if (res.source === lastSource.current) {
          setCompileOutput(res.message);
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
        <Split
          direction="vertical"
          elementStyle={(dimension, size, gutterSize) => ({
            "flex-basis": `calc(${size}% - ${gutterSize}px)`,
          })}
          gutterStyle={(dimension, gutterSize) => ({
            "flex-basis": `${gutterSize}px`,
            cursor: "ns-resize",
          })}
          style={{ flexDirection: "column", height: "100%", display: "flex" }}
          sizes={[70, 30, 0]}
          minSize={[150, 60, 20]}
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
          <div
            id="compileOutput"
            style={{
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              padding: "5px",
            }}
          >
            {compileOutput}
          </div>
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
          ></input>
        </Split>
        <canvas ref={canvas}></canvas>
      </Split>
    </main>
  );
}
