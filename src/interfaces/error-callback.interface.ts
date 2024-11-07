import ErrnoException = NodeJS.ErrnoException;

export type IErrorCallback = (error?: ErrnoException) => void;
