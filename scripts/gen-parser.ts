import * as pegjs from "pegjs";
import * as tspegjs from "ts-pegjs";
import * as fs from "fs";

const source = fs.readFileSync(__dirname + "/../src/lang.pegjs", {
  encoding: "utf8",
});
var parser = pegjs.generate(source, {
  output: "source",
  format: "commonjs",
  cache: true,
  plugins: [tspegjs],
  tspegjs: {
    noTslint: false,
    tslintIgnores: "rule1,rule2",
    customHeader:
      'import { ArrayAccessor,ConditionalOp,ObjectAccessor,Define,Struct,Switch,SwitchCase,Block, Cast,Enum, If, DefineArray, Return, DefineFunc, DefineVar, Arg, For, Assign, UnaryOp, BoolOp, Call, Variable, Constant } from "./ast";',
  },
});

fs.writeFileSync(__dirname + "/../src/lang.ts", parser);
