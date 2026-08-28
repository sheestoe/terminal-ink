const token = 'cf13351a86a46d58e3ebfd6a88755bc8674c5a73';

async function testTodoist() {
    const res = await fetch('https://api.todoist.com/api/v1/tasks', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    if (!res.ok) {
        console.error("Failed:", await res.text());
        return [];
    }
    const data = await res.json();
    return data;
}

async function run() {
    console.log("Tasks:", await testTodoist());
}
run();
