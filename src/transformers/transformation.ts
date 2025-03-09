import * as types from '@babel/types';
export abstract class Transformation {
    abstract execute(ast: types.File): void;
}