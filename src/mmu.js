export default class MMU {
  constructor(GPU, input, interrupt) {
    this.GPU = GPU;
    this.input = input;
    this.interrupt = interrupt;

    this.ROM = []; // 0x0000 - 0x3fff (bank 0) / 0x4000 - 0x7fff (other banks)
    this.reset();
  }
  reset() {
    this.isInBIOS = true;

    this.BIOS = [
      0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
      0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
      0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
      0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
      0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
      0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
      0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
      0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
      0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
      0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
      0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
      0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
      0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
      0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
      0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
      0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
    ]; // 0x0000 - 0x00ff
    // Video RAM: 0x8000 - 0x9fff
    this.cartridgeRAM = []; // 0xa000 - 0xbfff
    for (let i=0; i<8192; i+=1) {
      this.cartridgeRAM.push(0);
    }
    this.workingRAM = []; // 0xc000 - 0xdfff / 0xe000 - 0xfdff (shadow)
    for (let i=0; i<8192; i+=1) {
      this.workingRAM.push(0);
    }
    // Sprite Attribute Memory (OAM): 0xfe00 - 0xfea0
    // Memory-mapped I/O: 0xff00 - 0xff7f
    this.zeroPageRAM = []; // 0xff80 - 0xffff
    for (let i=0; i<128; i+=1) {
      this.zeroPageRAM.push(0);
    }
  }
  loadROM(rom) {
    this.ROM = rom;
  }
  readByte(addr) {
    switch (addr & 0xf000) {
      case 0x0000:
      case 0x1000:
      case 0x2000:
      case 0x3000:
        if (this.isInBIOS) {
          if (addr < 0x0100) {
            return this.BIOS[addr];
          }
        }

        return this.ROM[addr];
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        return this.ROM[addr];
      case 0x8000:
      case 0x9000:
        return this.GPU.videoRAM[addr & 0x1fff];
      case 0xa000:
      case 0xb000:
        return this.cartridgeRAM[addr & 0x1fff];
      case 0xc000:
      case 0xd000:
        return this.workingRAM[addr & 0x1fff];
      case 0xe000:
        return this.workingRAM[addr & 0x1fff];
      case 0xf000:
        switch (addr & 0x0f00) {
          case 0x0000:
          case 0x0100:
          case 0x0200:
          case 0x0300:
          case 0x0400:
          case 0x0500:
          case 0x0600:
          case 0x0700:
          case 0x0800:
          case 0x0900:
          case 0x0a00:
          case 0x0b00:
          case 0x0c00:
          case 0x0d00:
            return this.workingRAM[addr & 0x1fff];
          case 0x0e00:
            if (addr < 0xfea0) {
              return this.GPU.OAM[addr & 0xff];
            }

            return 0;
          case 0x0f00:
            if (addr === 0xffff) {
              return this.interrupt.getIE();
            }
            if (addr >= 0xff80) {
              return this.zeroPageRAM[addr & 0x7f];
            }

            if (addr === 0xff0f) {
              return this.interrupt.getIF();
            } else if (addr === 0xff00) {
              return this.input.readByte();
            } else {
              switch (addr & 0x00f0) {
                case 0x40:
                case 0x50:
                case 0x60:
                case 0x70:
                  return this.GPU.readByte(addr);
              }
            }

            return 0;
        }
    }
  }
  writeByte(addr, value) {
    switch (addr & 0xf000) {
      case 0x0000:
      case 0x1000:
      case 0x2000:
      case 0x3000:
        if (this.isInBIOS) {
          if (addr < 0x0100) {
            return this.BIOS[addr];
          }
        }

        return this.ROM[addr];
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        return this.ROM[addr];
      case 0x8000:
      case 0x9000:
        this.GPU.videoRAM[addr & 0x1fff] = value;
        if (addr < 0x9800) {
          this.GPU.updateTile(addr, value);
        }

        return this.GPU.videoRAM[addr & 0x1fff];
      case 0xa000:
      case 0xb000:
        return this.cartridgeRAM[addr & 0x1fff] = value;
      case 0xc000:
      case 0xd000:
        return this.workingRAM[addr & 0x1fff] = value;
      case 0xe000:
        return this.workingRAM[addr & 0x1fff] = value;
      case 0xf000:
        switch (addr & 0x0f00) {
          case 0x0000:
          case 0x0100:
          case 0x0200:
          case 0x0300:
          case 0x0400:
          case 0x0500:
          case 0x0600:
          case 0x0700:
          case 0x0800:
          case 0x0900:
          case 0x0a00:
          case 0x0b00:
          case 0x0c00:
          case 0x0d00:
            return this.workingRAM[addr & 0x1fff] = value;
          case 0x0e00:
            if (addr < 0xfea0) {
              this.GPU.OAM[addr & 0xff] = value;
              this.GPU.updateSprite(addr, value);

              return this.GPU.OAM[addr & 0xff];
            }

            return 0;
          case 0x0f00:
            if (addr === 0xffff) {
              return this.interrupt.setIE(value);
            }
            if (addr >= 0xff80) {
              return this.zeroPageRAM[addr & 0x7f] = value;
            }

            if (addr === 0xff0f) { // IF
              return this.interrupt.setIF(value);
            } else if (addr === 0xff00) {
              return this.input.writeByte(value);
            } else if (addr === 0xff46) { // DMA
              const base = 0xfe00;
              for (let i=0; i<0xa0; i+=1) {
                const val = this.readByte((value << 8) + i);

                this.GPU.OAM[i] = val;
                this.GPU.updateSprite(base + i, val);
              }
            } else {
              switch (addr & 0x00f0) {
                case 0x40:
                case 0x50:
                case 0x60:
                case 0x70:
                  return this.GPU.writeByte(addr, value);
              }
            }

            return 0;
        }
    }
  }
  readWord(addr) {
    return this.readByte(addr + 1) << 8 | this.readByte(addr);
  }
  writeWord(addr, value) {
    this.writeByte(addr, value & 0xff);
    this.writeByte(addr + 1, (value >> 8) & 0xff);
  }
}