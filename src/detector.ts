import * as types from '@babel/types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import vscode from 'vscode';

export default class Detector {
    private code: string;
    private ast: types.File;

    constructor(code: string) {
        this.ast = parse(code);
        this.code = code;
    }
    execute() {
        if (detectProxyFunction(this.ast)) {
            vscode.window.showInformationMessage('Proxy Function Detected');
        }
    }
}

function detectProxyFunction(ast: types.File): boolean {
    let test = false;
    traverse(ast, {
        FunctionExpression(path: any) {
            const { body } = path.node.body;
            if (body.length === 1 &&
                types.isReturnStatement(body[0]) &&
                types.isMemberExpression(body[0].argument)) {
                test = true;
                return;
            }
        }
    });

    return test;
}