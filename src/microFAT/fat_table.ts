import { FatBPB } from "./fat_BPB";

export class FatTable {

    static END_OF_FILE : number = 0xFFF;
    static BAD_CLUSTER : number = 0xFF7;

    private table : Uint16Array;
    private size: number;

    constructor( bpb: FatBPB ){
        this.size = Math.floor( ( bpb.fat_size * bpb.sector_size ) / 1.5); // / 1.5 because we are using FAT12
        this.table = new Uint16Array( this.size );    
        
        // Magick number
        this.table[0] = bpb.disk_type | 0xF00;

        // Reserved cluster
        this.table[1] = 0xFFF;
    
        for( let i = 2; i < this.table.length; ++i ){
            this.table[i] = 0x000;   //Set cluster as available
        }
    }

    set_next_cluster(cluster: number, next: number){
        if( cluster >= this.table.length ){
            return;
        }

        this.table[cluster] = (next >= this.table.length && next != FatTable.END_OF_FILE) ? FatTable.BAD_CLUSTER : (next & 0xFFF);
    }

    find_free_cluster(): number{
        for( let i = 2; i < this.table.length ; ++i){
            if( this.table[i] == 0x000 ){
                return i;
            }
        }

        return -1;
    }

    generateTable() : number[]{
        /*
            two 12 bits numbers : 0xABC and 0xXYZ
            concatenat in 24 bits number: 0xABCXYZ
            should be stored like this : BC ZA XY
        */

        let result: number[] = [];

        for( let i = 0; i < this.table.length; i += 2 ){
            let tmp = 0;

            tmp = (this.table[i] & 0x0FFF) << 12;
            tmp |= this.table[i+1] & 0x0FFF;

            result.push(  (tmp & 0x0FF000) >> 12  );                             // BC
            result.push( ((tmp & 0xF00000) >> 20) | ((tmp & 0x00000F) << 4) );   // ZA = (A >> 40) + (Z << 8)
            result.push(  (tmp & 0x000FF0) >> 4 );                               // XY
        }

        result.pop();   // The last element is incomplet, so we removing it

        return result;
    }

    getSize() : number{
        return this.size;
    }

}