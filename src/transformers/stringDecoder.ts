import { Transformation } from "./transformation";
import * as types from '@babel/types';
import traverse from '@babel/traverse';

export class StringDecoder extends Transformation {
    execute(ast: types.File) {
        traverse(ast, {
            StringLiteral(path: any) {
                if (path.node.extra) {
                    delete path.node.extra;
                }
            }
        });
    }
}