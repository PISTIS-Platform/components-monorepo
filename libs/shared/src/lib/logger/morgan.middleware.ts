import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HttpRequest');

    public use(req: Request, res: Response, next: NextFunction) {
        morgan(
            function (tokens: any, req: Request, res: Response) {
                return JSON.stringify({
                    level: 'http', // To separate http requests from the application logs. Use status to identify errors
                    method: tokens.method(req, res),
                    message: tokens.url(req, res),
                    status: +tokens.status(req, res),
                    contentLength: +tokens.res(req, res, 'content-length'),
                    responseTime: +tokens['response-time'](req, res),
                });
            },
            {
                stream: {
                    write: (value: string) => {
                        this.logger.log(JSON.parse(value));
                    },
                },
            },
        )(req, res, next);
    }
}
