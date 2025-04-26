let tasks = [];
let links = [];
let isTaskChanged = false;

// انتخاب گراف و تنظیم ابعاد آن
const svg = d3.select("#graph");
const width = window.innerWidth;
const height = window.innerHeight;

// تعریف متغیرهای مربوط به زوم
let zoomFactor = 1; // برای تنظیم سرعت پیمایش و زوم

// ایجاد یک تابع که پیمایش را فقط در زوم اوت غیرفعال کند
const zoom = d3.zoom()
  .scaleExtent([0.5, 2])  // محدود کردن زوم به بین 0.5 و 2
  .on("zoom", zoomed);

// اضافه کردن زوم به سطح کل گراف
svg.call(zoom);

// زمانی که زوم شروع می‌شود
function zoomStart(event) {
  const scale = event.transform.k;
  // اگر زوم اوت هستیم، پیمایش غیرفعال شود
  if (scale < 1) {
    svg.style("pointer-events", "none"); // غیرفعال کردن پیمایش در زوم اوت
  } else {
    svg.style("pointer-events", "auto"); // فعال کردن پیمایش در زوم این
  }
}

// زمانی که زوم به پایان می‌رسد
function zoomEnd(event) {
  const scale = event.transform.k;
  // وقتی که زوم اوت است، پیمایش غیرفعال می‌شود
  if (scale < 1) {
    svg.style("pointer-events", "none"); // غیرفعال کردن پیمایش در زوم اوت
  } else {
    svg.style("pointer-events", "auto"); // فعال کردن پیمایش در زوم این
  }
}

// تابع برای تنظیم سرعت زوم و پیمایش
function zoomed(event) {
  const scale = event.transform.k;

  // اعمال تغییرات به گراف و همه نودها و لینک‌ها و برچسب‌ها
  svg.attr("transform", event.transform);
  svg.selectAll("line.link").attr("transform", event.transform);
  svg.selectAll("circle.node").attr("transform", event.transform);
  svg.selectAll("text.label").attr("transform", event.transform);
}

async function fetchTasks() {
  const res = await fetch('/data');
  const data = await res.json();
  tasks = data.tasks;
  links = data.links;
  renderGraph(tasks, links);
}

function renderGraph(tasks, links) {
  // ایجاد شبیه‌سازی برای حرکت نودها و لینک‌ها
  const simulation = d3.forceSimulation(tasks)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // لینک‌ها
  const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link");

  // نودها
  const node = svg.append("g")
    .selectAll("circle")
    .data(tasks)
    .join("circle")
    .attr("r", 15)
    .attr("fill", "#007acc")
    .attr("class", "node")
    .on("click", (event, d) => {
      const detailWindow = window.open("", "_blank", "width=400,height=600");
      detailWindow.document.write(`
        <html><head><title>Task Details</title></head>
        <body style="font-family:sans-serif; padding:20px; background:#1e1e2f; color:#fff;">
          <h2>Task: <input type="text" id="title" value="${d.title}" /></h2>
          <p><strong>ID:</strong> <input type="text" id="id" value="${d.id}" /></p>
          <p><strong>Description:</strong> <textarea id="description">${d.description}</textarea></p>
          <button id="saveTaskBtn">Save Changes</button>
        </body></html>
      `);

      detailWindow.document.getElementById('saveTaskBtn').addEventListener('click', () => {
        const newTitle = detailWindow.document.getElementById('title').value;
        const newId = detailWindow.document.getElementById('id').value;
        const newDescription = detailWindow.document.getElementById('description').value;

        const updatedTask = { ...d, title: newTitle, id: newId, description: newDescription };
        fetch('/update-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_id: d.id,
            new_id: newId,
            title: newTitle,
            description: newDescription
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === "updated") {
            alert("Task updated successfully!");
            fetchTasks();
            detailWindow.close();
            isTaskChanged = false;
          }
        });
      });
      isTaskChanged = true;
    })
    .on("mouseover", (event, d) => {
      link.classed("highlighted", (l) => l.source.id === d.id || l.target.id === d.id);
    })
    .on("mouseout", () => {
      link.classed("highlighted", false);
    })
    .call(drag(simulation));

  // برچسب‌ها
  const label = svg.append("g")
    .selectAll("text")
    .data(tasks)
    .join("text")
    .text(d => d.title)
    .attr("class", "label")
    .attr("text-anchor", "middle")
    .attr("dy", -20);

  // اجرای شبیه‌سازی و به‌روزرسانی موقعیت‌ها در هر بار tick
  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);

    label.attr("x", d => d.x)
         .attr("y", d => d.y);
  });
}

function drag(simulation) {
  return d3.drag()
    .on("start", event => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on("drag", event => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on("end", event => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });
}

window.addEventListener("beforeunload", (event) => {
  if (isTaskChanged) {
    const message = "تغییرات ذخیره نشده‌اند. آیا می‌خواهید بدون ذخیره تغییرات از این صفحه خارج شوید؟";
    event.returnValue = message;
    return message;
  }
});

document.getElementById('addNodeBtn').addEventListener('click', () => {
  const title = prompt("عنوان تسک جدید:");
  const newId = prompt("آیدی تسک (عدد وارد کنید):");
  if (!title || !newId || tasks.find(t => t.id === newId)) return alert("آیدی تکراری یا نادرست است.");
  const targetId = prompt("این نود به کدام نود قبلی متصل شود؟ (ID عددی وارد کن)");
  const newNode = { id: newId, title };
  tasks.push(newNode);
  if (targetId && tasks.find(t => t.id === targetId)) {
    links.push({ source: targetId, target: newId });
  }
  d3.selectAll("svg > *").remove();
  renderGraph(tasks, links);
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks, links })
  });
  alert("تغییرات ذخیره شد ✅");
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  const deleteId = prompt("آیدی تسکی که می‌خواهید حذف شود:");
  if (!deleteId) return;
  tasks = tasks.filter(t => t.id !== deleteId);
  links = links.filter(l => l.source.id !== deleteId && l.target.id !== deleteId);
  d3.selectAll("svg > *").remove();
  renderGraph(tasks, links);
});

document.getElementById('editLinksBtn').addEventListener('click', () => {
  const nodeId = prompt("آیدی نودی که می‌خوای لینک‌هاشو تنظیم کنی:");
  if (!nodeId || !tasks.find(t => t.id === nodeId)) return;
  const newTargets = prompt("آیدی تسک‌هایی که باید به این نود وصل باشند، با کاما جدا کن (مثلاً: 2,3):");
  links = links.filter(l => l.source.id !== nodeId);
  newTargets.split(',').map(t => t.trim()).forEach(targetId => {
    if (tasks.find(t => t.id === targetId)) {
      links.push({ source: nodeId, target: targetId });
    }
  });
  d3.selectAll("svg > *").remove();
  renderGraph(tasks, links);
});

document.getElementById('arrangeBtn').addEventListener('click', () => {
  const xOffset = 100;
  const yOffset = 100;
  tasks.forEach((task, index) => {
    task.x = xOffset + (index * 150);
    task.y = yOffset + (index * 100);
  });
  d3.selectAll("svg > *").remove();
  renderGraph(tasks, links);
});

fetchTasks();

