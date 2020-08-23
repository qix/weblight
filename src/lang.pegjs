Script = statements:BlockStatement* _? {
    return new Block(statements, location());
}

BlockStatement = _? statement:(For / ClosedStatement) {
    return statement;
};

ClosedStatement = _? statement:Statement _? ";" {
    return statement;
}

Statement = Assignment / PreUnaryOp / PostUnaryOp / CallExpr;
For = "for" _? "(" _? initial:Statement? _? ";" _? test:Expr? _? ";" _? step:Statement? _? ")" _? block:Block {
    return new For(initial, test, step, block);
};

Assignment = id:Identifier _? "=" ?_ expr:Expr {
    return new Assign(id, expr, location());
};

Expr = BoolExpr

BoolExpr = BinaryBoolExpr / UnaryBoolExpr / BoolTerm
BinaryBoolExpr = left:UnaryBoolExpr _ op:("&&"i / "||"i) _ right:BoolExpr {
    return new BoolOp(left, op, right, location());
}

UnaryBoolExpr = PostUnaryOp / BoolTerm;

PostUnaryOp = expr:PreUnary _? op:("++" / "--") {
  return new UnaryOp(expr, ('X' + op) as ("X++" | "X--"), location());
}

PreUnary = PreUnaryOp / BoolTerm;

PreUnaryOp = op:("!" / "++" / "--") _? expr:BoolTerm {
  return new UnaryOp(expr, (op + 'X') as ("!X" | "++X" | "--X"), location());
}

BoolTerm = BinaryLogicalExpr / LogicalTerm

BinaryLogicalExpr = left:LogicalTerm _? op:("==" / "!=" / ">=" / "<=" / ">" / "<") _? right:LogicalTerm {
  return new BoolOp(left, op, right, location());
}

LogicalTerm = BinaryArithmeticExpr / ArithmeticTerm

ArithmeticExpr = BinaryArithmeticExpr / ArithmeticTerm
BinaryArithmeticExpr = left:ArithmeticTerm _? op:("+" / "-") _? right:ArithmeticExpr {
  return new BoolOp(left, op, right, location());
}
ArithmeticTerm = HighArithmeticExpr

HighArithmeticExpr = BinaryHighArithmeticExpr / HighArithmeticTerm
BinaryHighArithmeticExpr = left:HighArithmeticTerm _? op:("*" / "/" / "%") _? right:HighArithmeticExpr {
  return new BoolOp(left, op, right, location());
}
HighArithmeticTerm = CallExpr / SubExpr / Literal / Variable

Variable = id:Identifier {
    return new Variable(id, location());
}

CallExpr = func:Identifier _? "(" _? args:ExprList? _? ")" {
  return new Call(func, args || [], location());
}

ExprList = first:Expr rest:(_? "," _? Expr)* {
  return [first, ...rest.map(item => item[3])];
}

SubExpr = "(sub)"


Block = "{" statements:BlockStatement* _? "}" {
    return new Block(statements, location());
}


Identifier = [A-Za-z0-9_]+ {
  return text();
}

Literal = value:(Number / String / True / False / Null) {
  return new Constant(value, location());
}

String = '"' chars:StringChar* '"' { return chars.join(""); }

StringChar = StringCharUnescaped / StringEscapedChar;
StringEscapedChar
  = "\\"
    sequence:(
        '"'
      / "'"
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "x" digits:$(HexDigit HexDigit) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
{
  return sequence;
}
StringCharUnescaped = [^\0-\x1F\x22\x5C]
HexDigit = [0-9a-f]i

Null "null" = "null" {
  return null;
}

True "true" = "true" {
  return true;
}

False "false" = "false" {
  return false;
}

Number "number" = Float / Int

Int = Zero / [-]?[1-9][0-9]* {
  return parseInt(text(), 10);
}

Zero = "0" {
  return 0;
}

Float = [-]?([0-9]+)? "." [0-9]+ {
  return parseFloat(text());
}

_ "whitespace" = (Whitespace / Comment)+ {
  return text();
}

Whitespace = [ \t\n\r]
Comment = LineComment / LongComment
LineComment = "//" ([^\n])* [\n]
LongComment = "/*" (!"*/" .)* "*/"
