function invariant(test: any, message: string): asserts test is true {
  if (!test) {
    throw new Error(message);
  }
}

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
  transpile() {
    return "return " + (this.expr ? this.expr.transpile() : "");
  }
}
export class Cast {
  constructor(
    readonly type: string,
    readonly expr: Expr,
    readonly location: Location
  ) {}
  transpile() {
    return `cast(${JSON.stringify(this.type)}, ${this.expr.transpile()})`;
  }
}

export class Define {
  constructor(
    readonly id: string,
    readonly expr: Expr,
    readonly location: Location
  ) {}
  transpile() {
    return `const ${this.id} = ${this.expr.transpile()};`;
  }
}

export class Switch {
  constructor(
    readonly expr: Expr,
    readonly cases: SwitchCase[],
    readonly location: Location
  ) {}

  transpile() {
    return (
      `switch(${this.expr.transpile()}){` +
      this.cases.map((c) => c.transpile()).join("\n") +
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

  transpile() {
    return `case (${this.expr.transpile()}): ${this.statements
      .map((s) => s.transpile() + ";")
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

  transpile() {
    return "(" + this.left.transpile() + this.op + this.right.transpile() + ")";
  }
}

export class ConditionalOp {
  constructor(
    readonly test: Expr,
    readonly truthy: Expr,
    readonly falsy: Expr,
    readonly location: Location
  ) {}

  transpile() {
    return (
      "(" +
      this.test.transpile() +
      "?" +
      this.truthy.transpile() +
      ":" +
      this.falsy.transpile() +
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

  transpile() {
    let init: string | null = null;
    if (this.values) {
      init = this.values
        .map((val) => {
          return val.transpile();
        })
        .join(",");
    }

    let value: string;
    if (this.type === "uint8_t") {
      if (this.values) {
        value = `new Uint8Array([${init}])`;
      } else {
        value = `new Uint8Array(${this.size.transpile()})`;
      }
    } else if (this.values) {
      value = `[${init}]`;
    } else {
      value = `new Array(${this.size.transpile()})`;
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

  transpile() {
    return (
      `function ${this.id}(` +
      this.args.map((arg) => arg.transpile()).join(",") +
      `) ${this.block.transpile()}`
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

  transpile() {
    const keyword = this.constant ? "const" : "let";
    return (
      `${keyword} ${this.id}` +
      (this.value ? `= ${this.value.transpile()}` : "")
    );
  }
}

export class Struct {
  constructor(
    readonly name: string,
    readonly assignments: Assign[],
    readonly location: Location
  ) {}

  transpile() {
    return "";
  }
}

export class Enum {
  constructor(
    readonly name: string,
    readonly assignments: Assign[],
    readonly location: Location
  ) {}

  transpile() {
    return this.assignments
      .map((a) => {
        return `const ${a.var_.transpile()} = ${a.expr.transpile()};`;
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

  transpile() {
    return (
      this.id + (this.defaultExpr ? " = " + this.defaultExpr.transpile() : "")
    );
  }
}

export class UnaryOp {
  constructor(
    readonly expr: Expr,
    readonly op: "X++" | "X--" | "++X" | "--X" | "!X",
    readonly location: Location
  ) {}

  transpile() {
    return "(" + this.op.replace("X", `(${this.expr.transpile()})`) + ")";
  }
}

export class Call {
  constructor(
    readonly func: string,
    readonly args: Expr[],
    readonly location: Location
  ) {}

  transpile() {
    return (
      this.func + "(" + this.args.map((a) => a.transpile()).join(",") + ")"
    );
  }
}

export class Assign {
  constructor(
    readonly var_: Variable,
    readonly expr: Expr,
    readonly location: Location
  ) {}

  transpile() {
    return this.var_.transpile() + "=" + this.expr.transpile();
  }
}

export type Expr = UnaryOp | BoolOp | Variable | Constant;

export class Variable {
  constructor(
    readonly id: string,
    readonly accessors: Accessor[],
    readonly location: Location
  ) {}

  transpile() {
    return this.id + this.accessors.map((a) => a.transpile()).join("");
  }
}

export type Accessor = ObjectAccessor | ArrayAccessor;
export class ObjectAccessor {
  constructor(readonly id: string, readonly location: Location) {}

  transpile() {
    return `.${this.id}`;
  }
}
export class ArrayAccessor {
  constructor(readonly expr: Expr, readonly location: Location) {}

  transpile() {
    return `[${this.expr.transpile()}]`;
  }
}

export class Constant {
  constructor(readonly value: any, readonly location: Location) {}
  transpile() {
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

  transpile() {
    return (
      `for(` +
      [this.init, this.test, this.step]
        .map((e) => (e ? e.transpile() : ""))
        .join(";") +
      `${this.block.transpile()}`
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

  transpile() {
    return (
      `if ` +
      `(${this.test.transpile()})` +
      `${this.block.transpile()}` +
      (this.elseStatement ? " else " + this.elseStatement.transpile() : "")
    );
  }
}

export class Block {
  constructor(readonly statements: Statement[], readonly location: Location) {}

  transpile() {
    console.log(this.statements);
    return (
      "{" +
      this.statements.map((stmt) => stmt.transpile() + ";").join("\n") +
      "}"
    );
  }
}

export type Statement = Assign | For;
