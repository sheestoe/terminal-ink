async function run() {
    const token = "cf13351a86a46d58e3ebfd6a88755bc8674c5a73";
    const headers = { 'Authorization': 'Bearer ' + token };
    const res = await fetch('https://api.todoist.com/api/v1/tasks', { headers });
    const data = await res.json();
    const tasks = data.results || data || [];
    
    console.log("=== TODAS AS TAREFAS VINDAS DA API DO TODOIST ===");
    let count = 0;
    for (const t of tasks) {
        count++;
        console.log("- " + t.content + " (Data: " + (t.due ? t.due.date : 'Sem data') + ")");
    }
    console.log("Total recebido da API: " + count);
}
run();
