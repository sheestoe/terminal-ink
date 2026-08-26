export let batteryPercentage = 0;

export function updateBattery(voltage: number) {
    batteryPercentage = calcBattery(voltage);
}

function calcBattery(voltage: number) {
    const minVoltage = 0.45;
    const maxVoltage = 4.05;
    const minPercentage = 10;
    const maxPercentage = 90;
    if (voltage <= minVoltage) return minPercentage;
    if (voltage > maxVoltage) return 100;
    const percentage = (voltage - minVoltage) / (maxVoltage - minVoltage) *
        (maxPercentage - minPercentage) + minPercentage;
    return Math.round(percentage);
}
