import Head from "next/head";
import styles from "../styles/Home.module.css";
import { useEffect } from "react";
import { compile } from "../src/parse";

export default function Home() {
  const controller = compile();
  controller.message("CHASE");

  useEffect(() => {
    const canvas: HTMLCanvasElement = document.getElementById(
      "canvas"
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    const interval = setInterval(() => {
      controller.step();

      let line = 0;
      let col = 0;
      for (let pixel = 0; pixel < controller.size; pixel++) {
        const color = `rgb(${controller.ledBuffer[pixel * 3 + 1]},${
          controller.ledBuffer[pixel * 3 + 0]
        },${controller.ledBuffer[pixel * 3 + 2]})`;
        ctx.fillStyle = color;
        ctx.fillRect(col * 5, line * 5, 5, 5);
        col += 1;

        if (col * 5 + 5 > canvas.width) {
          col = 0;
          line++;
        }
      }
      console.log("line", line, col);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        <canvas
          id="canvas"
          width="200"
          height="100"
          style={{ border: "1px solid #000" }}
        ></canvas>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
        </a>
      </footer>
    </div>
  );
}
