import { Transformation } from "./transformation";

const fs = require('fs');

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

/*
    * Unpacks string elements that were moved out into arrays
    * eg. var _0xc48f=["hello world","log"];
    * console[_0xc48f[1]](_0xc48f[0]);
    * @param {string} code - The code to be transformed
*/

export class ArrayUnpacker extends Transformation {
    execute(code: string): string {

        const ast = parser.parse(code);

        traverse(ast, {
            enter(path: any) {
                if (!path.node.property) { return; }
                if (!types.isNumericLiteral(path.node.property)) { return; }

                let idx = path.node.property.value;

                let binding = path.scope.getBinding(path.node.object.name);
                if (!binding) { return; }

                if (types.isVariableDeclarator(binding.path.node)) {
                    let array = binding.path.node.init;
                    if (idx >= array.length) { return; }

                    let member = array.elements[idx];

                    if (types.isStringLiteral(member)) {
                        path.replaceWith(member);
                    }
                }
            }
        });

        return generate(ast).code;
    }
}