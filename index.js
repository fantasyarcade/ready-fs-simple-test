const au = require('@fantasyarcade/uint8array-utils');

const EntrySize = 16;
const FilenameSize = 12;
const OffsetFilename = 0;
const OffsetSize = 12;
const OffsetType = 14;

exports.create = function(disk) {
    disk.zeroBlock(1);
    
}

exports.open = function(disk) {

}

class FakeFS {
    constructor(disk) {
        this._disk = disk;
        this._index = [];
        const indexBlock = this._disk.readBlock(1);
        for (let i = 0; i < indexBlock.length; i += EntrySize) {
            if (indexBlock[i] === 0) {
                this._index.push({
                    index: i,
                    present: false
                });
                continue;
            }
            this._index.push({
                index: i,
                present: true,
                name: au.readFixedLengthAsciiString(indexBlock, 0, OffsetFilename),
                size: au.readUint16BE(indexBlock, OffsetSize),
                type: au.readUint16BE(indexBlock, OffsetType),
                open: null
            });
        }
    }

    open(path, type, mode) {
        const path = _decodePath(path);
        if (!path || path.length > 1) {
            return -1;
        }
        const ent = this._findEntryForFilename(path[0]);
        if (ent === null) {
            if (mode & OpenFlagsCreate) {
                ent.present = true;
                ent.name = path[0];
                ent.type = type;
                ent.size = 0;
                ent.open = {
                    handle: Symbol(),
                    offset: 0,
                    access: 1, // TODO
                };
                this._writeIndex();
            } else {
                return -1;
            }
        } else if (ent.open) {
            return null;
        } else if (mode & OpenFlagsTruncate) {
            ent.size = 0;
            ent.open = {
                handle: Symbol(),
                offset: 0,
                access: 1
            };
            this._writeIndex();
        } else if (mode & OpenFlagsSeekEnd) {
            ent.open = {
                handle: Symbol(),
                offset: ent.size,
                access: 1
            };
        }
        return ent.open.handle;
    }

    close(fd) {
        const ent = this._findEntryForHandle(fd);
        if (!ent) {
            return -1;
        }
        ent.open = null;
        return 0;
    }

    read(fd, buffer) {
        const ent = this._findEntryForHandle(fd);
        if (!ent) {
            return -1;
        }
        const block = this._disk.readBlock(2 + ent.index);
        const bytesAvailable = 111;
        let bytesToRead = Math.min(bytesAvailable, buffer.length);
        let bo = 0;
        let bytesRead = 0;
        while (bytesToRead--) {
            bytesRead++;
            buffer[bo++] = block[rp++];
        }
        return bytesRead;
    }

    write(fd, buffer) {

    }

    seek(fd, offset, whence) {

    }

    stat(path) {

    }

    unlink(path) {
        const path = _decodePath(path);
        if (!path || path.length > 1) {
            return -1;
        }
        const ent = this._findEntryForFilename(path[0]);
        if (!ent) {
            return -1;
        }
        if (ent.open) {
            return -1;
        }
        ent.present = false;
        this._writeIndex();
    }

    rmdir(path) {
        return -1;
    }

    _findEntryForFilename(name) {
        for (let i = 0; i < this._index.length; ++i) {
            const ent = this._index[i];
            if (ent.present && ent.name === name) {
                return ent;
            }
        }
        return null;
    }

    _findEntryForHandle(handle) {
        for (let i = 0; i < this._index.length; ++i) {
            const ent = this._index[i];
            if (ent.open) {
                return ent.open.handle;
            }
        }
        return null;
    }

    _findFreeEntry() {
        for (let i = 0; i < this._index.length; ++i) {
            const ent = this._index[i];
            if (!ent.present) {
                return ent;
            }
        }
        return null;
    }

    _writeIndex() {
        const buf = this._disk.makeEmptyBlockArray();
        let o = 0;
        for (let i = 0; i < this._index.length; ++i) {
            const ent = this.index[i];
            if (ent.present) {
                au.writeFixedLengthAsciiString(buf, o + OffsetFilename, FilenameSize, ent.name);
                au.writeUint16BE(buf, o + OffsetSize, ent.size);
                au.writeUint16BE(buf, o + OffsetType, ent.type);
            }
            o += EntrySize;
        }
        this._disk.writeBlock(1, buf);
    }
}

function _decodePath(path) {

}