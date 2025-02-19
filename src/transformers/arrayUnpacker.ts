import { Transformation } from "./transformation";
import * as types from '@babel/types';
import traverse from '@babel/traverse';

/*
    * Unpacks string elements that were moved out into arrays
    * eg. var _0xc48f=["hello world","log"];
    * console[_0xc48f[1]](_0xc48f[0]);
    * @param {string} code - The code to be transformed
*/

export class ArrayUnpacker extends Transformation {
    execute(ast: types.File): void {

        const nodesToRemove: string[] = [];

        traverse(ast, {
            MemberExpression(path: any) {
                const { object, property } = path.node;

                let idx = property.value;
                let binding = path.scope.getBinding(object.name);

                if (!binding) {
                    return;
                }

                if (types.isVariableDeclarator(binding.path.node)) {
                    let array = binding.path.node.init;
                    nodesToRemove.push(object.name);
                    if (idx >= array.length) {
                        return;
                    }

                    let value = array.elements[idx];

                    if (types.isStringLiteral(value)) {
                        path.replaceWith(value);
                    }
                }
            },
        });

        // traverse one more time to cleanup calling conventions and the useless array declarations
        traverse(ast, {
            VariableDeclarator(path: any) {
                const { id } = path.node;
                if (types.isIdentifier(id) && nodesToRemove.includes(id.name)) {
                    path.remove();
                }
            },
            CallExpression(path: any) {
                const property = path.node.callee.property;
                if (types.isStringLiteral(property)) {
                    path.node.callee.property = types.identifier(property.value);
                    path.node.callee.computed = false;
                }
            }
        });
    }
}