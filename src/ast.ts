export interface Location {}

export class BoolOp {
  constructor(
    private left: Expr,
    private op:
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
      | "%",
    private right: Expr,
    private location: Location
  ) {}

  execute() {
    console.log(this.left, this.op, this.right);
  }
}

export class UnaryOp {
  constructor(
    private expr: Expr,
    private op: "X++" | "X--" | "++X" | "--X" | "!X",
    private location: Location
  ) {}

  execute() {
    console.log(this.expr, this.op);
  }
}

export class Call {
  constructor(
    private func: string,
    private args: Expr[],
    private location: Location
  ) {}

  execute() {
    console.log(this.func, this.args);
  }
}

export class Assign {
  constructor(
    private id: string,
    private expr: Expr,
    private location: Location
  ) {}

  execute() {
    console.log(this.id, "=", this.expr);
  }
}

export type Expr = UnaryOp | BoolOp | Variable | Constant;

export class Variable {
  constructor(private id: string, private location: Location) {}
}

export class Constant {
  constructor(private value: any, private location: Location) {}
}

export class For {
  constructor(
    private init: Statement,
    private test: Expr,
    private step: Statement,
    private block: Block
  ) {}

  execute() {
    this.init.execute();
    // this.test.execute()
    this.step.execute();
    this.block.execute();
  }
}

export class Block {
  constructor(private statements: Statement[], private location: Location) {}

  execute() {
    for (const statement of this.statements) {
      statement.execute();
    }
  }
}

export type Statement = Assign | For;
