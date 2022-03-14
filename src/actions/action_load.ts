import { Action } from "./action";

export class ActionLoad implements Action {

    private fileReader : FileReader;
    private file_input : HTMLInputElement;

    constructor( onFileReaded: (data: string) => void){

        this.fileReader = new FileReader();

        let d = document.createElement("div");
        d.style.display = "none";
        d.style.width = "0px";
        d.style.height = "0px";
        d.style.overflow = "hidden";

        this.file_input = document.createElement("input");
        this.file_input.type = "file";
        this.file_input.accept = ".py";

        d.append(this.file_input);

        this.file_input.addEventListener("input", () => this.openFile());

        this.fileReader.onload = () => onFileReaded(this.fileReader.result as string);
        this.fileReader.onerror = (evt) => console.error("Failed to read file.", evt);
    }

    openFile(){
        this.fileReader.readAsText((this.file_input.files as FileList)[0], "UTF-8");
    }

    async run(): Promise<boolean> {
        this.file_input.click();
        return true;
    }
}