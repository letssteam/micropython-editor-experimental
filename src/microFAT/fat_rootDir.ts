import { FatBPB } from "./fat_BPB";
import { FatUtils } from "./fat_common";
import { FatTable } from "./fat_table";

class Sector {
    data: Uint8Array;

    constructor(sector_size: number){
        this.data = new Uint8Array(sector_size);

        this.erase();
    }

    erase(){
        this.data.fill(0xFF);
    }

    set(source: Uint8Array){
        for( let i = 0; i < this.data.length; i++ ){
            this.data[i] = (i >= source.length) ? 0x00 : source[i];
        }
    }
};

class FatRootDirectory_File{
    filename: string = "";
    extension: string = "";
    attribute: FileAttribute = 0x00;
    create_ms: number = 0;
    create_time: number = 0;
    create_date: number = 0;
    last_access_date: number = 0;
    modification_time: number = 0;
    modification_date: number = 0;
    cluster_number: number = 0;
    file_size: number = 0;

    constructor(){}

    generate_file() : number[] {
        return          FatUtils.convertString(this.filename, 8)
                .concat(FatUtils.convertString(this.extension, 3))
                .concat(FatUtils.convertToHex(this.attribute, 1))
                .concat([0x00])
                .concat(FatUtils.convertToHex(Math.floor(this.create_ms/10), 1))
                .concat(FatUtils.convertToHex(this.create_time, 2))
                .concat(FatUtils.convertToHex(this.create_date, 2))
                .concat(FatUtils.convertToHex(this.last_access_date, 2))
                .concat([0x00, 0x00])
                .concat(FatUtils.convertToHex(this.modification_time, 2))
                .concat(FatUtils.convertToHex(this.modification_date, 2))
                .concat(FatUtils.convertToHex(this.cluster_number, 2))
                .concat(FatUtils.convertToHex(this.file_size, 4));
    }
};

export enum FileAttribute {
    READONLY = 0x01,
    HIDDEN = 0x02,
    SYSTEM = 0x03,
    VOLUME_NAME = 0x08,
    SUBDIRECTORY = 0x10,
    ARCHIVE = 0x20,
    DEVICE = 0x40,
    RESERVED = 0x80
};

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!   THIS CLASS ONLY WORKS FOR 1 SECTOR PER CLUSTER  !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export class FatRootDirectory{

    static readonly FILE_NOT_SET = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];

    private sector_size: number;
    private files: (null | FatRootDirectory_File)[];
    private sectors: Sector[]
    private fat_table: FatTable;

    constructor(bpb: FatBPB, fat_table: FatTable, volume_name: string){
        this.sector_size = bpb.sector_size;
        this.fat_table = fat_table;
        this.files = new Array(bpb.root_dir_size);
        this.sectors = new Array( Math.floor( ( (bpb.total_sectors * bpb.sector_size) - 512 - fat_table.getSize() - (bpb.root_dir_size * 32) ) / bpb.sector_size ) ); // total data sector size (octets) = Total_size - boot_sector - FAT_Table - RootDirectory

        for( let i = 0; i < this.files.length; ++i){
            this.files[i] = null;
        }

        for( let i = 0; i < this.sectors.length; ++i ){
            this.sectors[i] = new Sector(this.sector_size);
        }

        
        let file = new FatRootDirectory_File();

        file.filename = volume_name;
        file.attribute = FileAttribute.VOLUME_NAME;

        this.files[0] = file;
    }

    addFile(filename: string, extension: string, attribute: FileAttribute, content: Uint8Array){
        let file = new FatRootDirectory_File();
        let date = new Date();
        let nb_cluster = Math.ceil( content.length / this.sector_size );

        file.filename = filename;
        file.extension = extension;
        file.attribute = attribute;
        file.create_ms = date.getMilliseconds();
        file.create_time = this.timeField(date);
        file.create_date = this.dateField(date);
        file.last_access_date = this.dateField(date);
        file.modification_time = this.timeField(date);
        file.modification_date = this.dateField(date);
        file.cluster_number = this.fat_table.find_free_cluster();
        file.file_size = content.length;


        let next_cluster = file.cluster_number;
        let cluster = 0;

        for( let i = 0; i < nb_cluster; i++ ){

            cluster = next_cluster;

            this.sectors[ cluster - 2 ].set( content.slice( i * this.sector_size, i * this.sector_size + this.sector_size ) );


            next_cluster = this.fat_table.find_free_cluster(cluster);
            this.fat_table.set_next_cluster(cluster, next_cluster);
        }

        this.fat_table.set_next_cluster(cluster, FatTable.END_OF_FILE);
        
        this.files[this.getAvailableFileIndex()] = file;

    }

    generateRootDirectory() : number[]{
        let result: number[] = [];


        this.files.forEach( (file) => {
            if( file == null ){
                result = result.concat( FatRootDirectory.FILE_NOT_SET )
            }
            else{
                result = result.concat( file.generate_file() );
            }
        });

        this.sectors.forEach( (sector) => {
            result = result.concat( Array.from(sector.data) );
        })

        return result;
    }

    private getAvailableFileIndex() : number{
        for(let i = 0; i < this.files.length; ++i){
            if( this.files[i] == null ){
                return i;
            }
        }

        return -1;
    }

    private dateField(date: Date) : number{
        let res: number = 0x0000;

        res  = (date.getFullYear() & 0x7F) << 9;
        res += (date.getMonth() & 0x0F) << 5;
        res += date.getDay() & 0x1F;

        return res;
        
    }

    private timeField(date: Date) : number{
        let res: number = 0x0000;

        res  = (date.getHours() & 0x1F) << 11;
        res += (date.getMinutes() & 0x3F) << 5;
        res += Math.floor(date.getSeconds() / 2) & 0x1F;

        return res;
    }
}