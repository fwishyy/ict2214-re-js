export default class Config {
    public unpackArrays: boolean;
    public decodeStrings: boolean;
    public removeProxyFunctions: boolean;
    public simplifyExpressions: boolean;
    public removeDeadCode: boolean;
    public stringProxyFunctions: boolean;

    constructor(options: ConfigOptions) {
        this.unpackArrays = options.unpackArrays;
        this.decodeStrings = options.decodeStrings;
        this.removeProxyFunctions = options.removeProxyFunctions;
        this.simplifyExpressions = options.simplifyExpressions;
        this.removeDeadCode = options.removeDeadCode;
        this.stringProxyFunctions = options.stringProxyFunctions;
    }
}

export interface ConfigOptions {
    unpackArrays: boolean;
    decodeStrings: boolean;
    removeProxyFunctions: boolean;
    simplifyExpressions: boolean;
    removeDeadCode: boolean;
    stringProxyFunctions: boolean;
}