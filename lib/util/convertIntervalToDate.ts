export type TimeInterval = 'monthly' | 'daily' | 'hourly';


export const convertIntervalToDate = (interval: TimeInterval) => {
    const startDate = new Date();
    const endDate = new Date();
    switch (interval) {
        case 'monthly':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'daily':
            startDate.setDate(startDate.getDate() - 1);
            break;
        case 'hourly':
            startDate.setHours(startDate.getHours() - 1);
            break;
    }
    return  { startDate, endDate };
}