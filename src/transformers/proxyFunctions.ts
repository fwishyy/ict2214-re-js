// proxyFunctions.ts

import { Transformation } from "./transformation";

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");

/**
 * Helper function to evaluate simple numeric expressions using
 * - NumericLiteral
 * - Function parameter identifiers (mapped to numbers)
 * - Basic binary operations (+, -, *, /, %)
 *
 * Returns a number or undefined if it can't be computed.
 */
function evaluateExpression(expr: any, paramMap: Record<string, number>): number | undefined {
  // Case 1: Numeric literal
  if (types.isNumericLiteral(expr)) {
    return expr.value;
  }

  // Case 2: Identifier (function parameter reference)
  if (types.isIdentifier(expr) && paramMap.hasOwnProperty(expr.name)) {
    return paramMap[expr.name];
  }

  // Case 3: Binary expression (e.g., a + b, a - 2, etc.)
  if (types.isBinaryExpression(expr)) {
    const leftVal = evaluateExpression(expr.left, paramMap);
    const rightVal = evaluateExpression(expr.right, paramMap);

    if (leftVal === undefined || rightVal === undefined) {
      return undefined;
    }

    switch (expr.operator) {
      case "+":
        return leftVal + rightVal;
      case "-":
        return leftVal - rightVal;
      case "*":
        return leftVal * rightVal;
      case "/":
        // Avoid division by zero
        if (rightVal === 0) return undefined;
        return leftVal / rightVal;
      case "%":
        // Avoid modulus by zero
        if (rightVal === 0) return undefined;
        return leftVal % rightVal;
    }
  }

  // Not a simple numeric expression we can handle
  return undefined;
}

/**
 * A Transformation that detects "proxy functions" which simply return
 * an array element, with the index derived from the function parameters
 * via a simple arithmetic expression.
 *
 * Example:
 *   var arr = ["Hello", "World"];
 *   function proxy(a, b) {
 *     return arr[a + b];
 *   }
 *   console.log(proxy(0,1)); // => "World"
 */
export class ProxyFunctions extends Transformation {
  public execute(code: string): string {
    // 1. Parse code into an AST
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"], // Adjust plugins as needed
    });

    // A map of functionName -> path for the function definition
    const proxyFunctions: Record<string, any> = {};

    // 2. Identify candidate proxy functions
    traverse(ast, {
      FunctionDeclaration(path: any) {
        const { id, params, body } = path.node;
        // We only handle a single return statement
        if (body.body.length === 1 && types.isReturnStatement(body.body[0])) {
          // e.g. function f(a, b) { return arr[a + b]; }
          proxyFunctions[id.name] = path;
        }
      },
    });

    // 3. Inline calls to these proxy functions
    traverse(ast, {
      CallExpression(path: any) {
        const callee = path.node.callee;
        if (!types.isIdentifier(callee)) return; // Only direct calls, e.g. myFunc(...)
        const fnName = callee.name;

        // Check if this is one of our recorded proxy functions
        const proxyPath = proxyFunctions[fnName];
        if (!proxyPath) return;

        // Ensure the call's arg count matches the function's param count
        const { params, body } = proxyPath.node;
        if (path.node.arguments.length !== params.length) return;

        // Build a param -> arg value map, but only if all args are numeric
        const paramMap: Record<string, number> = {};
        for (let i = 0; i < params.length; i++) {
          const param = params[i];
          const arg = path.node.arguments[i];
          if (types.isIdentifier(param) && types.isNumericLiteral(arg)) {
            paramMap[param.name] = arg.value;
          } else {
            // If we can't handle the argument, give up
            return;
          }
        }

        // The function body should have exactly one return statement
        const returnStmt = body.body[0];
        if (!types.isReturnStatement(returnStmt)) return;

        const returnExpr = returnStmt.argument;
        // We expect: return arr[ expression ]
        if (!types.isMemberExpression(returnExpr)) return;

        const arrayObj = returnExpr.object;
        const indexNode = returnExpr.property;
        if (!types.isIdentifier(arrayObj)) return;

        // Look up the array definition in the function's scope
        const arrayBinding = proxyPath.scope.getBinding(arrayObj.name);
        if (!arrayBinding) return;

        // Must be a variable: var arr = [...];
        const declNode = arrayBinding.path.node;
        if (
          !types.isVariableDeclarator(declNode) ||
          !types.isArrayExpression(declNode.init)
        ) {
          return;
        }

        // Evaluate the index expression
        const indexValue = evaluateExpression(indexNode, paramMap);
        if (indexValue === undefined) return;

        // Get the array element at that index
        const arrayElements = declNode.init.elements;
        if (indexValue < 0 || indexValue >= arrayElements.length) return;
        const elementNode = arrayElements[indexValue];

        // If it's a literal (string/number), just replace
        // Otherwise, you can replace with the entire node if needed
        if (types.isStringLiteral(elementNode) || types.isNumericLiteral(elementNode)) {
          path.replaceWith(elementNode);
        } else {
          // Optionally replace with the array element as-is
          path.replaceWith(elementNode);
        }
      },
    });

    // 4. Generate the transformed code
    return generate(ast).code;
  }
}
