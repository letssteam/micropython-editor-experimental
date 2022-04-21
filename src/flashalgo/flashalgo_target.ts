import { FlashAlgo_Syscall } from "./flashalgo_syscall";

export class FlashAlgo_Target {
    /**
     * Init function address
     */ 
    public init: number = 0;

    /**
     * unInit function address
     */ 
    public unInit: number = 0;

    /**
     * EraseChip function address
     */ 
    public erase_chip: number = 0;

    /**
     * EraseSector function address
     */ 
    public erase_sector: number = 0;

    /**
     * ProgramPage function address
     */ 
    public program_page: number = 0;

    /**
     * Verify function address
     */ 
    public verify: number = 0;

    /**
     * System call object
     */ 
    public syscall: FlashAlgo_Syscall = new FlashAlgo_Syscall();

    /**
     * Mem buffer Location
     */ 
    public program_buffer: number = 0;

    /**
     * Address to write the blob
     */ 
    public algo_start: number = 0;

    /**
     * Blob size
     */ 
    public algo_size: number = 0;

    /**
     * Blob
     */ 
    public algo_blob: Uint32Array = new Uint32Array();

    /**
     * RAM to flash bytes to be written
     */ 
    public program_buffer_size: number = 0;

    /**
     * Flags
     */ 
    public algo_flags: number = 0;
}