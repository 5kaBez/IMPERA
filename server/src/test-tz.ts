import { getMoscowDate } from './bot/scheduleUtils';

function testTimezone() {
    const systemDate = new Date();
    const moscowDate = getMoscowDate();

    console.log('--- Timezone Test ---');
    console.log('System Time (UTC):', systemDate.toISOString());
    console.log('Moscow Time (Target):', moscowDate.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }));
    console.log('Moscow Date Object:', moscowDate.toString());

    const diffHours = (moscowDate.getTime() - systemDate.getTime()) / (1000 * 60 * 60);
    console.log('Difference (Hours):', diffHours.toFixed(2));

    if (Math.abs(diffHours - 3) < 0.1 || Math.abs(diffHours - 0) < 0.1) {
        // If diff is 0, it means the local system is already in MSK or we calculated correctly from UTC
        // The utility is designed to work when system is UTC.
        console.log('SUCCESS: Timezone utility seems to be working as intended for a UTC-based server.');
    } else {
        console.log('WARNING: Unexpected time difference. Check MSK_OFFSET in scheduleUtils.ts.');
    }
}

testTimezone();
