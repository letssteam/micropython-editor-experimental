export type GetDataCallback = () => string;
export type OnProgressCallback = (progress: number) => void;
export type OnErrorCallback = (error: string) => void;
export type OnConnectionChangeCallback = (is_connected: boolean) => void;


export function print_hex_data( values : number[] ){

    let str = "";

    values.forEach( (value, idx) => {

        str += toHexString(value, 2);

        if( (idx + 1) % 4 == 0){
            str += " ";
        }

    });

    console.log(str);
}

export function toHexString(value: number, nb_digit: number ) : string{
    let s = value.toString(16).toUpperCase();

    if( s.length > nb_digit )
        console.warn(`[TRUNCATE WARN] : Need to represent ${s} on ${nb_digit} digits...`);

    return "0".repeat( Math.max(0, nb_digit - s.length) ) + s;
}

export async function wait(ms: number): Promise<void>{

    return new Promise( (resolve) => {
        setTimeout( () => resolve(), ms);
    });
}
