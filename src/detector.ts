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

        const detectedMethods: string[] = [];

        if (detectJSFuck(this.code)) {
            vscode.window.showErrorMessage("It looks like the code is obfuscated with JSFuck, please use a suitable decoder");
            return generatedConfig;
        }

        if (detectObfuscatorIO(this.code)) {
            vscode.window.showErrorMessage("It looks like the code is obfuscated with Obfuscator.io, please use a suitable decoder");
            return generatedConfig;
        }

        if (detectPackedArrays(this.ast)) {
            detectedMethods.push('Packed Arrays');
            generatedConfig.unpackArrays = true;
        }

        if (detectProxyFunction(this.ast)) {
            detectedMethods.push('Proxy Functions');
            generatedConfig.removeProxyFunctions = true;
        }

        if (detectEncodedString(this.ast)) {
            detectedMethods.push('Encoded Strings');
            generatedConfig.decodeStrings = true;
        }

        if (detectedMethods.length > 0) {
            vscode.window.showInformationMessage(`Detected the following obfuscation techniques: ${detectedMethods.join(', ')}`);
        }
        // display notification if no classical techniques are detected
        if (!Object.values(generatedConfig).some((value) => value === true)) {
            vscode.window.showErrorMessage('No classical techniques detected, check if the file is obfuscated');
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

function detectObfuscatorIO(code: string): boolean {
    if (code.length === 0) {
        return false;
    }
    return /_0x[0-9e-f]+/.test(code);
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

function detectPackedArrays(ast: types.File): boolean {
    let test = false;
    traverse(ast, {
        ["MemberExpression"](path: any) {
            const { object, property } = path.node;

            let binding = path.scope.getBinding(object.name);

            if (!binding) {
                return;
            }

            if (types.isArrayExpression(binding.path.node.init)) {
                const { elements } = binding.path.node.init;
                // check if htey are all stringliterals
                if (elements.every((element: any) => types.isStringLiteral(element))) {
                    test = true;
                    return;
                }
            }
        }
    });

    return test;
}