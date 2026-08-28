const today = new Date();
today.setHours(0, 0, 0, 0);

const days = [];
const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    let name = '';
    if (i === 0) name = 'HOJE';
    else if (i === 1) name = 'AMANHÃ';
    else name = dayNames[d.getDay()];

    days.push({ date: dateStr, dayName: name, tasks: [] });
}
console.log(days);
