import * as fs from "fs";

import { parse } from "./lang";

const ast = parse(`
  for (x = 1; x < 10; x++) {
        println("hello!\\n");
  }
`);
ast.execute();
