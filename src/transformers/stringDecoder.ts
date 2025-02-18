import { Transformation } from "./transformation";

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

export class StringDecoder extends Transformation {
    execute(code: string): string {
        const ast = parser.parse(code);

        traverse(ast, {
            StringLiteral(path: any) {
                if (path.node.extra) {
                    delete path.node.extra;
                }
            }
        });

        return generate(ast).code;
    }
}