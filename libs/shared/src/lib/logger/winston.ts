import colors from '@colors/colors/safe';
import { format, transports } from 'winston';

const { combine, timestamp, printf } = format;

const formatDate = (value: string) => value.slice(11).slice(0, -1);
const formatLevel = (value: string) => {
    switch (value) {
        case 'info':
            return `${colors.brightGreen(value.toUpperCase())}`;
        case 'error':
            return `${colors.brightRed(value.toUpperCase())}`;
        case 'warn':
            return `${colors.brightYellow(value.toUpperCase())}`;
        case 'debug':
            return `${colors.brightBlue(value.toUpperCase())}`;
        case 'http':
            return `${colors.brightMagenta(value.toUpperCase())}`;
        default:
            return `${value.toUpperCase()}:`;
    }
};
const formatArgs = (args: any) => colors.gray(JSON.stringify(args));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const myFormat = printf(({ level, message, timestamp, ...args }) => {
    return `${formatDate(timestamp as any)} ${formatLevel(level)}: ${colors.brightCyan(message as any)} ${formatArgs(
        args,
    )}`;
});

export const consoleTransport = new transports.Console({
    format: combine(timestamp(), myFormat),
    level: 'http',
});
