export class FlashAlgo_Syscall {
    // Break point address (usually: start of blob + 1)
    public breakpoint: number = 0;

    // blob start + header + rw data offset
    public static_base: number = 0;
    
    // Stack pointer address
    public stack_pointer: number = 0;
}