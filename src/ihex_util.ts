export class IHex {

    private base_address: number;

    constructor(base_address: number){
        this.base_address = base_address;
    }

    parseBin(bin_file: Uint8Array){
        let ihex = this.addressLine(this.base_address);
        let nb_lines = Math.ceil(bin_file.length / 16); // 16 octects par line
        let offset = 0;

        console.log(`nb_lines: ${nb_lines}`);

        for(let i = 0; i < nb_lines; i++ ){
            let crc = 0x10;
            let part = bin_file.slice(i * 16, (i+1) * 16);
            let address = i*16;
            let line = `:${this.toHexString(part.length, 2)}`;

            if( address - offset > 0xFFFF ){
                offset += 0x10000
                ihex += this.addressLine(this.base_address + offset);
                //ihex += this.offsetLine(offset);
            }

            // Address
            line += this.toHexString(address - offset, 4);
            crc += ((address - offset) & 0xFF00) >> 8 ;
            crc += (address - offset) & 0x00FF;

            // Field
            line += "00";
            crc += 0x00;

            // Data
            let only_00 = true;
            let only_FF = true;
            part.forEach( (value) => {
                line += this.toHexString(value, 2);
                crc += value;

                if( value != 0x00 ){ only_00 = false; }
                if( value != 0xFF ){ only_FF = false; }
            });

            //if data are only 00 skip the line
            //if( only_00 ){ continue; }

            // if data are only FF and offset < 0x0808_0000
            if( only_FF && offset < 0x080800000 ){ continue; }

            // Checksum
            line += this.computeCRC(crc);

            // Add line
            ihex += `${line}\n`
        }

        ihex += ":00000001FF";

        console.log(ihex);

        return ihex;
    }

    private offsetLine( offset: number ){
        let shift_addr = (offset & 0xFFFF0000) >> 4;
        return `:02000002${this.toHexString(shift_addr, 4)}${this.computeCRC( 0x04 + ((shift_addr & 0xFF00) >> 8) + (shift_addr & 0x00FF) )}\n`;
    }

    private addressLine( memory_address: number ){
        let shift_addr = (memory_address & 0xFFFF0000) >> 16;
        return `:02000004${this.toHexString(shift_addr, 4)}${this.computeCRC( 0x06 + ((shift_addr & 0xFF00) >> 8) + (shift_addr & 0x00FF) )}\n`;
    }

    private computeCRC(sum: number): string{
        return this.toHexString( (~(sum & 0xFF) + 1) & 0xFF, 2)
    }

    private toHexString(value: number, nb_digit: number ) : string{
        let s = value.toString(16).toUpperCase();

        if( s.length > nb_digit )
            console.warn(`[TRUNCATE WARN] : Need to represent ${s} on ${nb_digit} digits...`);

        return "0".repeat( Math.max(0, nb_digit - s.length) ) + s;
    }
}