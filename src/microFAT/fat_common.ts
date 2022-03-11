export class FatUtils {
    static convertString(str: String, field_size: number): number[]{
        let res : number[] = [];

        for(let i = 0; i < field_size; ++i){
            res[i] = (i >= str.length) ? 0x20 : str.charCodeAt(i);
        }

        return res;
    }

    static convertToHex(num: number, field_size: number) : number[]{
        let res : number[] = [];

        for(let i = 0; i < field_size; ++i){
            let shift = 8 * i;
            res[i] = ( num >> shift ) & 0x00FF
        }

        return res;
    }
}