// C Parser heavily based on:
//
//  Parsing Expression Grammar of C for Mouse 1.1 - 1.5.
//  Based on standard ISO/IEC 9899.1999:TC2, without preprocessor.
//  Requires semantics class to process Typedefs.
//
//---------------------------------------------------------------------------
//
//  Copyright (C) 2007, 2009, 2010 by Roman R Redziejowski (www.romanredz.se).
//
//  The author gives unlimited permission to copy and distribute
//  this file, with or without modifications, as long as this notice
//  is preserved, and any changes are properly documented.
//
//  This file is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
//


Script = statements:BlockStatement* _? {
    return new Block(statements, location());
}

BlockStatement = _? statement:(Define / For / While / If / Switch / DefineFunc / PredefineFunc / ClosedStatement) {
    return statement;
};

ClosedStatement = _? statement:Statement _? ";" {
    return statement;
}

Statement = Return / Assignment / Enum / Struct / DefineArray / DefineVar / Expr;

Enum = "enum" _ name:Id _? "{" _? first:Assignment rest:(_? "," _? Assignment)* _? ","? _? "}" {
    return new Enum(name, [first, ...rest.map(r => r[3])], location());
}

Struct = "struct" _ name:Id _? "{" _? first:DefineVar _? ";" rest:(_? DefineVar _? ";")* _? "}" {
    return new Struct(name, [first, ...rest.map(r => r[1])], location());
}

DefineArray = ("const" _)? type:Type _ id:Id "[" _? size:Expr? _? "]" values:(_? "=" _? "{" _? ExprList _? "}")? {
    return new DefineArray(
      type,
      id,
      size ?? null,
      values ? values[5] : null,
      location()
    );
}

DefineVar = constant:("const" _)? type:Type _ id:Id assign:(_? "=" _? Expr)? {
    return new DefineVar(!!constant, type, id, assign ? assign[3] : null, location());
}

PredefineFunc = returnType:Type _ name:Id _? "(" _? args:(ArgList/NoArgs) _? ")" _? ";" {
    return new DefineFunc(name, args, returnType, null, location());
}

DefineFunc = returnType:Type _ name:Id _? "(" _? args:(ArgList/NoArgs) _? ")" _? block:Block {
    return new DefineFunc(name, args, returnType, block, location());
}

Return = "return" expr:(_ Expr)? {
    return new Return(expr ? expr[1] : null, location());
}

NoArgs = "void" {
    return [];
}
ArgList = first:Arg rest:(_? "," _? Arg)* {
  return [first, ...rest.map(item => item[3])];
}

Arg = type:Type _ star:"*"? id:Id defaultExpr:(_? "=" _? expr:Expr)? {
    return new Arg(type + (star ?? ''), id, defaultExpr ? defaultExpr[3] : null, location());
}

Type = "char" / "void" / "uint8_t" / "float" / "int" / Id;

Define = "#define" _ id:Id _ expr:Expr [\n] {
    return new Define(id, expr, location());
}

For = "for" _? "(" _? initial:Statement? _? ";" _? test:Expr? _? ";" _? step:Statement? _? ")" _? block:Block {
    return new For(initial, test, step, block, location());
};

While = "while" _? "(" _? test:Expr _? ")" _? block:Block {
    return new For(null, test, null, block, location());
};

If = "if" _? "(" _? test:Expr _? ")" _? block:Block otherwise:(_? "else" _ ElseStatement)? {
    return new If(test, block, otherwise ? otherwise[3] : null, location());
};

ElseStatement = If / Block;

Switch = "switch" _? "(" _? expr:Expr _? ")" _? "{" cases:SwitchCase+ _? "}" {
    return new Switch(expr, cases, location());
};

SwitchCase = _? "case" _ expr:Expr _? ":" statements:BlockStatement* {
    return new SwitchCase(expr, statements, location());
}

Assignment = v:Variable _? "=" ?_ expr:Expr {
    return new Assign(v, expr, location());
};

PrimaryExpr
   = Id
    / Literal
    / "(" Expr ")"

PostfixExpr
   = ( PrimaryExpr
      // @TODO / "(" TypeName ")" "{" InitializerList ","? "}"
      )
      ( "[" _? Expr _? "]"
      / "(" _? ExprList? _? ")"
      / "." Id
      / "->" Id
      / "++"
      / "--"
      )*

UnaryExpr
  = PostfixExpr
  / "++" UnaryExpr
  / "--" UnaryExpr
  / ("&" / "*" / "+" / "-" / "~" / "!") CastExpr
  / "sizeof" (UnaryExpr / "(" TypeName ")" )


CastExpr = Cast / UnaryExpr
Cast = "(" _? type:Type _? ")" _? expr:CastExpr {
  return new Cast(type, expr, location());
}

MultiplicativeExpr = first:CastExpr rest:(_? ("*" / "/" / "%") _? CastExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

AdditiveExpr = first:MultiplicativeExpr rest:(_? ("+" / "-") _? MultiplicativeExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

ShiftExpr = first:AdditiveExpr rest:(_? ("<<" / ">>") _? AdditiveExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

RelationalExpr = first:ShiftExpr rest:(_? ("<=" / ">=" / "<" / ">") _? ShiftExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

EqualityExpr = first:RelationalExpr rest:(_? ("==" / "!=") _? RelationalExpr)* {
  let rv = first;
  rest.forEach(parts => {
      rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

BinAndExpr = first:EqualityExpr rest:(_? "&" _? EqualityExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

ExclOrExpr = first:BinAndExpr rest:(_? "^" _? BinAndExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

InclOrExpr = first:ExclOrExpr rest:(_? "|" _? ExclOrExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

LogicAndExpr = first:InclOrExpr rest:(_? "&&" _? InclOrExpr)*{
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

LogicOrExpr = first:LogicAndExpr rest:(_? "||" _? LogicAndExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new BoolOp(rv, parts[1], parts[3], location());
  });
  return rv;
}

ConditionalExpr = first:LogicOrExpr rest:(_? "?" _? Expr _? ":" _? LogicOrExpr)* {
  let rv = first;
  rest.forEach(parts => {
    rv = new ConditionalOp(rv, parts[3], parts[7], location());
  });
  return rv;
}

Assigment = left:UnaryExpr _? op:(
    "=" / "*=" / "/=" / "%=" / "+=" / "-=" / "<<=" / ">>=" / "&=" / "^=" / "|="
) _? right:AssignmentExpr {
  return new BoolOp(left, op, right, location());
}
AssignmentExpr = Assigment / ConditionalExpr;


// @TODO
TypeName = Id

Expr = AssignmentExpr

Conditional = ConditionalOp / BoolExpr;

ConditionalOp = test:BoolExpr _? "?" _? truthy:Expr _? ":" _? falsy:Expr {
  return new ConditionalOp(test, truthy, falsy, location());
}

BoolExpr = BinaryBoolExpr / UnaryBoolExpr;
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
BinaryArithmeticExpr = left:ArithmeticTerm _? op:("<<" / ">>" / "+" / "-") _? right:ArithmeticExpr {
  return new BoolOp(left, op, right, location());
}
ArithmeticTerm = HighArithmeticExpr

HighArithmeticExpr = BinaryHighArithmeticExpr / HighArithmeticTerm
BinaryHighArithmeticExpr = left:HighArithmeticTerm _? op:("*" / "/" / "%") _? right:HighArithmeticExpr {
  return new BoolOp(left, op, right, location());
}
HighArithmeticTerm = CallExpr / SubExpr / Literal / Variable
CallExpr = "call()";

Variable = id:Id accessors:(Accessor*) {
    return new Variable(id, accessors, location());
}

Accessor = ObjectAccessor / ArrayAccessor;

ObjectAccessor = "." id:Id {
    return new ObjectAccessor(id, location());
}

ArrayAccessor = "[" _? expr:Expr _? "]" {
    return new ArrayAccessor(expr, location());
}

ExprList = first:Expr rest:(_? "," _? Expr)* {
  return [first, ...rest.map(item => item[3])];
}

SubExpr = "(" _? expr: Expr _? ")" {
    return expr;
}


Block = "{" statements:BlockStatement* _? "}" {
    return new Block(statements, location());
}


Id = [A-Za-z0-9_]+ {
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

Int = Zero / [-+]?[1-9][0-9]* {
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
