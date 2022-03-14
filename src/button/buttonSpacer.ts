
export class ButtonSpacer{
    constructor(parent: HTMLElement){
        let button = document.createElement("div");
        button.classList.add("menu_button_space")
        parent.append(button);
    }
}