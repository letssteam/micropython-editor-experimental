import { Action } from "../actions/action";
import { ActionConnection } from "../actions/action_connection";
import { Button } from "./button";

export class ButtonDropdownElement {
    /**
     * The hexadecimal font awesome icon
     */
    icon?: string;

    /**
     * Text show in dropdown
     */
    name: string;

    /**
     * Function to execute on click
     */
    fct: () => void;

    /**
     * @param name Text show in dropdown
     * @param fct Function to execute on click
     * @param icon [optionnal] The hexadecimal font awesome icon
     */
    constructor(name: string, fct: () => void, icon?: string){
        this.name = name;
        this.fct = fct;
        this.icon = icon;
    }
}

export class ButtonDropdown extends Button {
    private dropdown: HTMLDivElement;

    constructor(parent: HTMLElement, icon: string, dropdownElements: ButtonDropdownElement[], title: string = ""){
        let action: Action = { 
            run: async () => this.internalAction() 
        };

        super(parent, icon, action, title);

        let button_bounds = this.button.getBoundingClientRect();

        this.dropdown = document.createElement("div");
        this.dropdown.classList.add("menu_button_dropdown");
        this.dropdown.style.display = "none";
        this.dropdown.style.top = button_bounds.top + 4 + button_bounds.height + "px";
        this.dropdown.style.left = button_bounds.left + "px";

        this.populateDorpdown(dropdownElements);

        document.body.append(this.dropdown);
        document.body.addEventListener("mousedown", (evt) => this.click_outside(evt) );
    }

    private internalAction() {

        if( this.dropdown.style.display == "none" ){
            this.dropdown.style.display = "block";
        }
        else{
            this.dropdown.style.display = "none";
        }

        return true;
    }

    private click_outside(event: any){

        if( (event.path as []).findIndex( (value) => value == this.button || value == this.dropdown ) == -1 ){
            this.close();
        }
    }

    private populateDorpdown(items: ButtonDropdownElement[]){
        items.forEach( (item) => {

            let entry = document.createElement("p");

            if( item.icon ){
                entry.innerHTML = `<span class="fa">&#x${item.icon};</span>`
            }

            entry.innerHTML += item.name;

            entry.addEventListener("click", () => { this.close(); item.fct();  } );

            this.dropdown.append(entry);
        });
    }

    private close(){
        this.dropdown.style.display = "none";
    }
};