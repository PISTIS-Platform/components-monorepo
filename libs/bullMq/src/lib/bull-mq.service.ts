import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BullMqService {
    constructor(@InjectQueue('default') private defaultQueue: Queue) {}

    async addJob<T>(queueName: string, name: string, data: T, opts?: any) {
        // A more generic way to get a queue if not injecting specific ones
        // const queue = new Queue(queueName, { connection: /* Redis connection from config */ });
        // This example assumes 'default' queue is always available or you inject dynamically
        console.log(`Adding job "${name}" to queue "${queueName}" with data:`, data);
        return this.defaultQueue.add(name, data, opts);
    }
}
