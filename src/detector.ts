import * as types from '@babel/types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import vscode from 'vscode';

import Config from './config';

export default class Detector {
    private code: string;
    private ast: types.File;

    constructor(code: string) {
        this.ast = parse(code);
        this.code = code;
    }

    // TODO: Add more detection techniques
    execute(): Config | null {
        // detect common obfusctors first


        const generatedConfig: Config = new Config({
            unpackArrays: false,
            decodeStrings: false,
            removeProxyFunctions: false,
            simplifyExpressions: false,
            removeDeadCode: false,
            stringProxyFunctions: false
        });

        if (detectJSFuck(this.code)) {
            vscode.window.showErrorMessage("It looks like the code is obfuscated with JSFuck, please use a suitable decoder");
            return generatedConfig;
        }

        if (detectProxyFunction(this.ast)) {
            vscode.window.showInformationMessage("Proxy functions detected");
            generatedConfig.removeProxyFunctions = true;
        }

        if (detectEncodedString(this.ast)) {
            vscode.window.showInformationMessage("Encoded strings detected");
            generatedConfig.decodeStrings = true;
        }

        // display notification if no classical techniques are detected
        if (!Object.values(generatedConfig).some((value) => value === true)) {
            vscode.window.showInformationMessage('No classical techniques detected, check if the file is obfuscated');
        }

        return generatedConfig;
    }
}

function detectJSFuck(code: string): boolean {
    // check that code contains only []()!+
    if (code.length === 0) {
        return false;
    };
    const regex = /[^[\]()!+]/g;
    return !regex.test(code);
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

// TODO: Maybe change this detection, it's a little scuffed
function detectEncodedString(ast: types.File): boolean {
    let test = false;
    traverse(ast, {
        StringLiteral(path: any) {
            let { raw, rawValue } = path.node.extra;
            raw = raw.replaceAll('"', '');
            if (rawValue !== raw) {
                test = true;
                return;
            }
        }
    });

    return test;
}