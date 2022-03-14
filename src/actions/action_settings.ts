import { Action } from "./action";

export class ActionSettings implements Action {
    constructor(){

    }

    async run(): Promise<boolean> {
        return true;
    }
}