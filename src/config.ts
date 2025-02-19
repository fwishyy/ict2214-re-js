export default class Config {
    public unpackArrays: boolean;
    public decodeStrings: boolean;
    public removeProxyFunctions: boolean;

    constructor(options: ConfigOptions) {
        this.unpackArrays = options.unpackArrays;
        this.decodeStrings = options.decodeStrings;
        this.removeProxyFunctions = options.removeProxyFunctions;
    }
}

export interface ConfigOptions {
    unpackArrays: boolean;
    decodeStrings: boolean;
    removeProxyFunctions: boolean;
}