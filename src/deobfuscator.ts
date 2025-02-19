import Config from './config';
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as types from '@babel/types';
import { ArrayUnpacker } from './transformers/arrayUnpacker';
import { StringDecoder } from './transformers/stringDecoder';
import { ProxyFunctions } from './transformers/proxyFunctions';

/*
    * Executes various transformations on the code based on the configuration
    * @param {string} src - The code to be deobfuscated
*/

export default class Deobfuscator {
    private config: Config;
    private ast: types.File;

    constructor(config: Config, code: string) {
        this.config = config;
        this.ast = parse(code);
    }

    execute(): string {
        const transformations = [];
        if (this.config.removeProxyFunctions) {
            transformations.push(new ProxyFunctions());
        }
        if (this.config.unpackArrays) {
            transformations.push(new ArrayUnpacker());
        }
        if (this.config.decodeStrings) {
            transformations.push(new StringDecoder());
        }

        transformations.forEach((transformation) => {
            try {
                transformation.execute(this.ast);
            } catch (e) {
                console.error(e);
            }
        });

        return generate(this.ast).code;
    }
}