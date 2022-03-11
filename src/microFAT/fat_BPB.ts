import { FatUtils } from "./fat_common";

export class FatBPB {

    jump_inst: number = 0;
    oem_name: string = "";
    sector_size: number = 0;
    cluster_size: number = 0;
    reserved_sectors: number = 0;
    fats_number: number = 0;
    root_dir_size: number = 0;
    total_sectors: number = 0;
    disk_type: number = 0;
    fat_size: number = 0;
    sectors_per_track: number = 0;
    heads_number: number = 0;
    hidden_sectors: number = 0;
    total_32bits_sectors: number = 0;

    disk_identifier: number = 0;
    signature: number = 0;
    disk_serial: number = 0;
    disk_name: string = "";
    file_system_type: string = "";

    physical_drive_number: number = 0;
    boot_sector_signature: number = 0;

    constructor(){}

    generateBPB() : number[] {
        return          FatUtils.convertToHex(this.jump_inst, 3)
                .concat(FatUtils.convertString(this.oem_name, 8))
                .concat(FatUtils.convertToHex(this.sector_size, 2))
                .concat(FatUtils.convertToHex(this.cluster_size, 1))
                .concat(FatUtils.convertToHex(this.reserved_sectors, 2))
                .concat(FatUtils.convertToHex(this.fats_number, 1))
                .concat(FatUtils.convertToHex(this.root_dir_size, 2))
                .concat(FatUtils.convertToHex(this.total_sectors, 2))
                .concat(FatUtils.convertToHex(this.disk_type, 1))
                .concat(FatUtils.convertToHex(this.fat_size, 2))
                .concat(FatUtils.convertToHex(this.sectors_per_track, 2))
                .concat(FatUtils.convertToHex(this.heads_number, 2))
                .concat(FatUtils.convertToHex(this.hidden_sectors, 4))
                .concat(FatUtils.convertToHex(this.total_32bits_sectors, 4))

                .concat(FatUtils.convertToHex(this.disk_identifier, 1))
                .concat([0x01])
                .concat(FatUtils.convertToHex(this.signature, 1))
                .concat(FatUtils.convertToHex(this.disk_serial, 4))
                .concat(FatUtils.convertString(this.disk_name, 11))
                .concat(FatUtils.convertString(this.file_system_type, 8))
                .concat(FatUtils.convertToHex( 0, 447))
                .concat(FatUtils.convertToHex(this.physical_drive_number, 1))
                .concat(FatUtils.convertToHex(this.boot_sector_signature, 2));
    }
}