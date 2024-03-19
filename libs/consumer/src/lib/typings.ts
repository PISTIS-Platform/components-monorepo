import { Column } from '@pistis/data-storage';

export interface IResults {
    data: {
        rows: Record<string, any>[];
    };
    columns?: Column[];
    metadata?: {
        name: string;
    };
}
