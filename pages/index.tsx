import Head from "next/head";
import styles from "../styles/Home.module.css";
import { useEffect, useState } from "react";
import { Controller, compile, sourceArrow } from "../src/parse";
import { generateCoords } from "../src/points";
import { SAMPLE } from "../src/sample";
import Split from "react-split";

let controller: Controller;
let compiledSource: string = "";

export default function Home() {
  const [source, setSource] = useState(SAMPLE);
  const [message, setMessage] = useState("CHASE");
  const [compileOutput, setCompileOutput] = useState("Compiling...");

  function recompile() {
    setCompileOutput("Compiling...");
    compiledSource = source;
    try {
      controller = compile(source);
      controller.message(message);
      setCompileOutput("Compilation successful!");
    } catch (err) {
      let message = err.stack;
      if (err.location) {
        message =
          "Error on line " +
          err.location.start.line +
          "\n" +
          sourceArrow(source, err.location) +
          "\n\n" +
          message;
      }
      setCompileOutput(message);
    }
  }

  if (!controller || compiledSource !== source) {
    recompile();
  }

  function updateSource(evt) {
    setSource(evt.target.value);
  }

  function sendMessage() {
    message.split(" ").map((word) => {
      controller.message(word.toUpperCase());
    });
  }
  function updateMessage(evt) {
    setMessage(evt.target.value);
  }

  useEffect(() => {
    recompile();

    const canvas: HTMLCanvasElement = document.getElementById(
      "canvas"
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const interval = setInterval(() => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const { xCoord, yCoord } = generateCoords(canvas.width, canvas.height);

      controller.step();

      for (let pixel = 0; pixel < controller.size; pixel++) {
        const color = `rgb(${controller.ledBuffer[pixel * 3 + 1]},${
          controller.ledBuffer[pixel * 3 + 0]
        },${controller.ledBuffer[pixel * 3 + 2]})`;
        ctx.fillStyle = color;
        ctx.fillRect(xCoord[pixel] - 2, yCoord[pixel] - 2, 4, 4);
      }
    }, 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className={styles.main}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Split
        direction="horizontal"
        elementStyle={(dimension, size, gutterSize) => ({
          "flex-basis": `calc(${size}% - ${gutterSize}px)`,
        })}
        gutterStyle={(dimension, gutterSize) => ({
          "flex-basis": `${gutterSize}px`,
        })}
        style={{ width: "100%", height: "100%" }}
      >
        <Split
          direction="vertical"
          elementStyle={(dimension, size, gutterSize) => ({
            "flex-basis": `calc(${size}% - ${gutterSize}px)`,
          })}
          gutterStyle={(dimension, gutterSize) => ({
            "flex-basis": `${gutterSize}px`,
          })}
          style={{ flexDirection: "column", height: "100%" }}
          sizes={[70, 30, 0]}
          minSize={[150, 60, 20]}
        >
          <textarea
            id="source"
            value={source}
            onChange={updateSource}
            style={{ flexGrow: 1 }}
          ></textarea>
          <div
            id="compileOutput"
            style={{ whiteSpace: "pre", flexBasis: "20%" }}
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
                sendMessage();
              }
            }}
          ></input>
        </Split>
        <canvas id="canvas"></canvas>
      </Split>
    </main>
  );
}
