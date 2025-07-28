import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process } from '@nestjs/bull';
import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { FactoriesRegistrantService } from './factories-registrant.service';
import dayjs from 'dayjs';

// Assuming 'default' is the queue name your jobs are being added to
@Processor('default') // Decorator to specify which queue this worker processes
export class MyProcessor {
    private readonly logger = new Logger(MyProcessor.name);

    constructor(private readonly factoryRegistrantService: FactoriesRegistrantService) {}

    @Process('retrieveFactory')
    async handleJobPcap(job: Job<any>) {
        console.log(job);
        // fetch data and anonymize pcap-data
        await this.factoryRegistrantService.retrieveFactory(job);
    }

    private getNow() {
        return dayjs(new Date()).format('DD/MM/YYYY HH:mm:ss');
    }

    @OnQueueActive()
    async onActive(job: Job) {
        await job.log(`📦 Job Active! (Date: ${this.getNow()} UTC)`);
    }

    @OnQueueCompleted()
    async onCompleted(job: Job) {
        await job.log(`✅ Job Completed! (Date: ${this.getNow()} UTC)`);
    }

    @OnQueueFailed()
    async onFailed(job: Job) {
        await job.log(`❌ Job Failed (Date: ${this.getNow()} UTC) :`);
        await job.log(job.failedReason || 'Unknown error');
    }
}
