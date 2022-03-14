export interface Action {
    run() : Promise<boolean>;
}