import { Transformation } from './transformation';
import * as types from '@babel/types';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import generate from '@babel/generator';

export class ProxyFunctionRemover extends Transformation {
    execute(ast: types.File): void {
        const proxyFunctions: ProxyFunction[] = [];
        traverse(ast, {
            VariableDeclarator(path: any) {
                const { node } = path;
                const binding = path.scope.getBinding(node.id.name);
                const references = binding.referencePaths;
                const { init } = node;
                if (types.isFunctionExpression(init) && isProxyFunction(init)) {
                    const proxy = new ProxyFunction(node.id.name, init.body, init.params, references);
                    proxyFunctions.push(proxy);
                }
            }
        });

        traverse(ast, {
            Identifier(path: any) {
                if (path.key === 'callee') {
                    const proxy = proxyFunctions.find((proxy) => proxy.name === path.node.name);
                    if (proxy && proxy.isValidReturn()) {
                        // get the calling parameters
                        const calling_args = path.parentPath.node.arguments;
                        console.log(calling_args);

                        // create param map with current proxy function
                        const paramMap: any = {};
                        proxy.params.forEach((param, index) => {
                            paramMap[param.name] = calling_args[index];
                        });

                        const expression = parse(generate(proxy.body.body[0].argument).code);
                        traverse(expression, {
                            Identifier(path: any) {
                                if (paramMap[path.node.name]) {
                                    path.replaceWith(paramMap[path.node.name]);
                                }
                            }
                        });

                        // replace the proxy function call with the evaluated expression
                        path.parentPath.replaceWith(expression.program.body[0]);
                    }
                }
            }
        });
    }
}

function isProxyFunction(node: any): boolean {
    return node.body.body.length === 1 && types.isReturnStatement(node.body.body[0]);
}

// generic class to store function information
// proxy functions are defined as functions that have a single return statement
class ProxyFunction {
    public name: string;
    public body: any;
    public params: (types.Identifier)[];
    public references: any;
    constructor(name: string, body: any, params: any, references: any) {
        this.name = name;
        this.body = body;
        this.params = params;
        this.references = references;
    }

    public isValidReturn(): boolean {
        return !types.isCallExpression(this.body);
    }

    public replaceParams(path: any) {

        // this.body is the original function body
        // we have to create a parameter map
    }
}