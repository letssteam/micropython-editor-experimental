import { Button } from "./button"

export class PlaceHolderButton extends Button{

    constructor(parent: HTMLElement){
        super(parent, "", {run: async () => true});
        this.button.style.display = "none";
        this.button.style.width = "0";
        this.button.style.height = "0";
    }
}