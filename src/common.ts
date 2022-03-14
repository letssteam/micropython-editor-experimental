export type GetDataCallback = () => string;
export type OnProgressCallback = (progress: number) => void;


export function print_hex_data( values : number[] ){

    let str = "";

    values.forEach( (value, idx) => {

        let s = value.toString(16).toUpperCase();
        
        try{
            str += "0".repeat(2 - s.length) + s + " ";
        }
        catch(e){
            console.error(e);
            console.warn(str);
        }

        if( (idx + 1) % 4 == 0){
            str += " ";
        }

    });

    console.log(str);
}

export async function wait(ms: number): Promise<void>{

    return new Promise( (resolve) => {
        setTimeout( () => resolve(), ms);
    });
}
