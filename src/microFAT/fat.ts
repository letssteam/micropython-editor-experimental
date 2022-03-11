import { saveAs } from "file-saver";
import { print_hex_data } from "../common";
import { FatBPB } from "./fat_BPB"
import { FatRootDirectory, FileAttribute } from "./fat_rootDir";
import { FatTable } from "./fat_table";

export class FatFS {
    private BPB: FatBPB;
    private table: FatTable;
    private root: FatRootDirectory;

    constructor(volume_name: string){
        this.BPB = new FatBPB();
        this.construct_pbp();

        this.table = new FatTable(this.BPB);
        
        this.root = new FatRootDirectory(this.BPB, this.table, volume_name);
    }

    private construct_pbp(){
        this.BPB.jump_inst = 0x90FEEB;
        this.BPB.oem_name = "MSDOS5.0";
        this.BPB.sector_size = 512;
        this.BPB.cluster_size = 1;
        this.BPB.reserved_sectors = 1;
        this.BPB.fats_number = 1;
        this.BPB.root_dir_size = 512;
        this.BPB.total_sectors = 1024;
        this.BPB.disk_type = 0xF8;
        this.BPB.fat_size = 4;
        this.BPB.sectors_per_track = 63;
        this.BPB.heads_number = 255;
        this.BPB.hidden_sectors = 256;
        this.BPB.total_32bits_sectors = 0;

        this.BPB.disk_identifier = 0x80;
        this.BPB.signature = 0x29;
        this.BPB.disk_serial = 0x46210000;
        this.BPB.disk_name = "NO NAME";
        this.BPB.file_system_type = "FAT";

        this.BPB.physical_drive_number = 0;
        this.BPB.boot_sector_signature = 0xAA55;
    }


    addFile(filename: string, extension: string, content: string){
        let enc = new TextEncoder();
        this.root.addFile(filename, extension, FileAttribute.ARCHIVE, enc.encode(content));
    }

    generate_hex(){
        return          this.BPB.generateBPB()
                .concat(this.table.generateTable())
                .concat(this.root.generateRootDirectory());
    }
}
