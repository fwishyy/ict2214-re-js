import { Transformation } from "./transformation";
import * as types from "@babel/types";
import traverse from "@babel/traverse";

export class ExpressionSimplifier extends Transformation {
    execute(ast: types.File): void {
        // replace obfuscated constants with their actual values
        traverse(ast, {
            NumericLiteral(path: any) {
                // Check if the raw value contains a 0x
                if (path.node.extra.raw.includes("0x")) {
                    delete path.node.extra.raw;
                }
            }
        });

        // traverse one more time to evaluate and simplify them
        traverse(ast, {
            BinaryExpression(path: any) {
                const evaluated = path.evaluate();
                if (!evaluated || !evaluated.confident) {
                    return;
                }

                let value = evaluated.value;
                let valueNode = types.valueToNode(value);
                if (types.isLiteral(valueNode)) {
                    path.replaceWith(valueNode);
                }
                if (typeof value === "string") {
                    path.replaceWith(types.stringLiteral(value)); // Substitute the simplified value
                }
            }
        })
    }
}