import { Context } from "./context";
import { invariant } from "./invariant";

const STRUCT_JS_TYPES = {
  uint8_t: "Uint8Array",
};

const DEFAULTS = {
  int: 0,
  "char*": "",
  bool: false,
};

export interface Location {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export class Return {
  constructor(readonly expr: Expr | null, readonly location: Location) {}
  transpile(ctx: Context) {
    return "return " + (this.expr ? this.expr.transpile(ctx) : "");
  }
}
export class Cast {
  constructor(
    readonly type: string,
    readonly expr: Expr,
    readonly location: Location
  ) {}
  transpile(ctx: Context) {
    // @todo: Proper casting
    if (this.type === "int") {
      return `Math.floor(${this.expr.transpile(ctx)})`;
    } else if (this.type === "uint8_t") {
      return `uint8(${this.expr.transpile(ctx)})`;
    } else if (this.type === "uint16_t") {
      return `uint16(${this.expr.transpile(ctx)})`;
    } else {
      throw new Error("Unknown cast: " + this.type);
    }
  }
}

export class Define {
  constructor(
    readonly id: string,
    readonly expr: Expr,
    readonly location: Location
  ) {}
  transpile(ctx: Context) {
    return `const ${this.id} = ${this.expr.transpile(ctx)};`;
  }
}

export class Switch {
  constructor(
    readonly expr: Expr,
    readonly cases: SwitchCase[],
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      `switch(${this.expr.transpile(ctx)}){` +
      this.cases.map((c) => c.transpile(ctx)).join("\n") +
      `}`
    );
  }
}

export class SwitchCase {
  constructor(
    readonly expr: Expr,
    readonly statements: Statement[],
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return `case (${this.expr.transpile(ctx)}): ${this.statements
      .map((s) => s.transpile(ctx) + ";")
      .join("\n")}`;
  }
}

export class BoolOp {
  constructor(
    readonly left: Expr,
    readonly op:
      | "=="
      | "!="
      | "+"
      | "-"
      | "<"
      | ">"
      | "<="
      | ">="
      | "*"
      | "/"
      | "%"
      | "<<"
      | ">>",
    readonly right: Expr,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      "(" + this.left.transpile(ctx) + this.op + this.right.transpile(ctx) + ")"
    );
  }
}

export class ConditionalOp {
  constructor(
    readonly test: Expr,
    readonly truthy: Expr,
    readonly falsy: Expr,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      "(" +
      this.test.transpile(ctx) +
      "?" +
      this.truthy.transpile(ctx) +
      ":" +
      this.falsy.transpile(ctx) +
      ")"
    );
  }
}

export class DefineArray {
  constructor(
    readonly type: string,
    readonly id: string,
    readonly size: Expr | null,
    readonly values: Expr[] | null,
    readonly location: Location
  ) {
    invariant(size || values.length, "Either size or values must be provided");
  }

  transpile(ctx: Context) {
    let init: string | null = null;
    if (this.values) {
      init = this.values
        .map((val) => {
          return val.transpile(ctx);
        })
        .join(",");
    }

    let value: string;

    if (STRUCT_JS_TYPES.hasOwnProperty(this.type)) {
      const jsType = STRUCT_JS_TYPES[this.type];
      if (this.values) {
        value = `new ${jsType}([${init}])`;
      } else {
        value = `new ${jsType}(${this.size.transpile(ctx)})`;
      }
    } else if (this.values) {
      value = `[${init}]`;
    } else {
      invariant(
        ctx.structures.hasOwnProperty(this.type),
        "Unknown array type: " + this.type
      );

      const struct = ctx.structures[this.type].getDefault();
      value = `Array.from(Array(${this.size.transpile(
        ctx
      )}), () => (${JSON.stringify(struct)}))`;
    }
    return `const ${this.id} = ${value}`;
  }
}

export class DefineFunc {
  constructor(
    readonly id: string,
    readonly args: Arg[],
    readonly type: string,
    readonly block: Block,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    if (!this.block) {
      // pre-definition
      return "";
    }
    return (
      `function ${this.id}(` +
      this.args.map((arg) => arg.transpile(ctx)).join(",") +
      `) ${this.block.transpile(ctx)}`
    );
  }
}

export class DefineVar {
  constructor(
    readonly constant: boolean,
    readonly type: string,
    readonly id: string,
    readonly value: Expr | null,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    const keyword = this.constant ? "const" : "let";
    return (
      `${keyword} ${this.id}` +
      (this.value ? `= ${this.value.transpile(ctx)}` : "")
    );
  }
}

export type StructArgs = { [arg: string]: string };

export class Struct {
  constructor(
    readonly name: string,
    readonly vars: DefineVar[],
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    invariant(
      !ctx.structures.hasOwnProperty(this.name),
      "Duplicate struct: " + this.name
    );

    ctx.structures[this.name] = this;

    return "";
  }

  getDefault() {
    return Object.fromEntries(
      this.vars.map((v) => {
        invariant(
          DEFAULTS.hasOwnProperty(v.type),
          "Unknown struct type: " + v.type
        );
        return [v.id, DEFAULTS[v.type]];
      })
    );
  }
}

export class Enum {
  constructor(
    readonly name: string,
    readonly assignments: Assign[],
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return this.assignments
      .map((a) => {
        return `const ${a.var_.transpile(ctx)} = ${a.expr.transpile(ctx)};`;
      })
      .join("\n");
  }
}

export class Arg {
  constructor(
    readonly type: string,
    readonly id: string,
    readonly defaultExpr: Expr | null,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      this.id +
      (this.defaultExpr ? " = " + this.defaultExpr.transpile(ctx) : "")
    );
  }
}

export class UnaryOp {
  constructor(
    readonly expr: Expr,
    readonly op:
      | "X++"
      | "X--"
      | "++X"
      | "--X"
      | "!"
      | "&"
      | "*"
      | "+"
      | "-"
      | "~",
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    const opStr = this.op.includes("X") ? this.op : this.op + "X";
    return "(" + opStr.replace("X", `(${this.expr.transpile(ctx)})`) + ")";
  }
}

export class Call {
  constructor(
    readonly func: Expr,
    readonly args: Expr[],
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      this.func.transpile(ctx) +
      "(" +
      this.args.map((a) => a.transpile(ctx)).join(",") +
      ")"
    );
  }
}

export class Assign {
  constructor(
    readonly var_: Variable,
    readonly expr: Expr,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return this.var_.transpile(ctx) + "=" + this.expr.transpile(ctx);
  }
}

export type Expr = UnaryOp | BoolOp | Variable | Constant;

export class Variable {
  constructor(readonly id: string, readonly location: Location) {}

  transpile(ctx: Context) {
    return this.id;
  }
}

export type Accessor = ObjectAccessor | ArrayAccessor;
export class ObjectAccessor {
  constructor(
    readonly obj: Expr,
    readonly id: string,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return `${this.obj.transpile(ctx)}.${this.id}`;
  }
}
export class ArrayAccessor {
  constructor(
    readonly obj: Expr,
    readonly expr: Expr,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return `${this.obj.transpile(ctx)}[${this.expr.transpile(ctx)}]`;
  }
}

export class Constant {
  constructor(readonly value: any, readonly location: Location) {}
  transpile(ctx: Context) {
    return JSON.stringify(this.value);
  }
}

export class For {
  constructor(
    readonly init: Statement | null,
    readonly test: Expr,
    readonly step: Statement | null,
    readonly block: Block,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      `for(` +
      [this.init, this.test, this.step]
        .map((e) => (e ? e.transpile(ctx) : ""))
        .join(";") +
      `)${this.block.transpile(ctx)}`
    );
  }
}

export class If {
  constructor(
    readonly test: Expr,
    readonly block: Block,
    readonly elseStatement: Statement,
    readonly location: Location
  ) {}

  transpile(ctx: Context) {
    return (
      `if ` +
      `(${this.test.transpile(ctx)})` +
      `${this.block.transpile(ctx)}` +
      (this.elseStatement ? " else " + this.elseStatement.transpile(ctx) : "")
    );
  }
}

export class Block {
  constructor(readonly statements: Statement[], readonly location: Location) {}

  transpile(ctx: Context) {
    return (
      "{" +
      this.statements.map((stmt) => stmt.transpile(ctx) + ";").join("\n") +
      "}"
    );
  }
}

export type Statement = Assign | For;
