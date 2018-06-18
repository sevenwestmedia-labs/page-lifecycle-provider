// TODO should we pull this 'common logger' interface out

export interface LogObject {
    [key: string]: any
}

export interface ErrorObject extends LogObject {
    err?: Error
}

export interface Logger {
    trace(msg: string | LogObject): void
    trace(obj: LogObject, msg: string): void
    debug(msg: string | LogObject): void
    debug(obj: LogObject, msg: string): void
    info(msg: string | LogObject): void
    info(obj: LogObject, msg: string): void
    warn(msg: string): void
    warn(obj: LogObject, msg: string): void
    error(msg: string): void
    error(obj: ErrorObject, msg: string): void
    fatal(msg: string): void
    fatal(obj: ErrorObject, msg: string): void

    child(childObj: LogObject): Logger
}
