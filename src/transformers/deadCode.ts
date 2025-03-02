import { Transformation } from './transformation';
import * as types from '@babel/types';
import traverse from '@babel/traverse';

/**
 * A Transformation that removes dead code from a function body.
 */
export class DeadCodeRemover extends Transformation {
    execute(ast: types.File): void {
        traverse(ast, {
            // remove functions that have no references
            "VariableDeclarator|FunctionDeclaration"(path: any) {
                const { node, scope } = path;
                const binding = scope.getBinding(node.id.name);

                if (!binding) {
                    return;
                }

                const isReferenced = binding.referenced;
                if (!isReferenced) {
                    path.remove();
                }
            },
            // remove dead branches
            "IfStatement"(path: any) {
                const { node } = path;
                const isTruthy = path.get("test").evaluateTruthy();
                if (isTruthy) {
                    if (types.isBlockStatement(node.consequent)) {
                        path.replaceWithMultiple(node.consequent.body);
                    } else {
                        path.replaceWith(node.consequent);
                    }
                } else if (node.alternate) {
                    if (types.isBlockStatement(node.alternate)) {
                        path.replaceWithMultiple(node.alternate.body);
                    } else {
                        path.replaceWith(node.alternate);
                    }
                } else {
                    path.remove();
                }
            },
        });
    }
}