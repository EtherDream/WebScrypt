interface IMod {
    onload?: () => void;
    onerror?: (err: string) => void;
    onready?: () => void;
    onprogress?: (percent: number) => void;
    oncomplete?: (dkHex: Bytes) => void;

    check() : boolean;
    load(path: string) : void;
    config(N: number, r: number, P: number, thread: number, maxPassLen, maxSaltLen, maxDkLen) : void;
    hash(pass: Bytes, salt: Bytes, dkLen: number);
    stop() : void;
    free() : void;
    unload() : void;
}