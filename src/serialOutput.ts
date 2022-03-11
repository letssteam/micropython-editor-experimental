export class SerialOutput {

    private output : HTMLElement;

    constructor(parent: HTMLElement){
        this.output = document.createElement("div");
        this.output.classList.add("serial_output");

        parent.append(this.output);
    }

    write(str: string){
        //this.output.innerText += `[${this.generate_time_prefix()}] ${str}`;
        this.output.innerText += str;
        this.output.scrollTop = this.output.scrollHeight;
    }

    clear(){
        this.output.innerText = "";
    }

    // generate_time_prefix(){
    //     var d = new Date();
    //     return `${this.zero_padding(d.getHours(), 2)}:${this.zero_padding(d.getMinutes(), 2)}:${this.zero_padding(d.getSeconds(), 2)}.${this.zero_padding(d.getMilliseconds(), 3)}`;
    // }

    // zero_padding(num: number, nb_zeros: number){
    //     let s = num.toString();

    //     return `${"0".repeat(Math.max(0, nb_zeros - s.length))}${s}`;
    // }
}