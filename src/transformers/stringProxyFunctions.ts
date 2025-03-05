import { Transformation } from './transformation';
import * as types from '@babel/types';
import traverse from '@babel/traverse';

export class StringProxyFunctions extends Transformation {
    execute(ast: types.File): void {

        traverse(ast, {
            CallExpression(path: any) {
                const { node } = path;
                const { callee } = node;
                const binding = path.scope.getBinding(callee.name);

                const callee_path = binding.path;
                const callee_node = callee_path.node;

                if (types.isFunctionDeclaration(callee_node)) {
                    const { body } = callee_node.body;
                    if (body.length === 1 && types.isExpressionStatement(body[0])) {
                        // replace the call expression with the function body
                        path.replaceWith(body[0]);
                        callee_path.remove();
                    }
                }
            }
        });
    }
}