const video = document.getElementById("camera");
const status = document.getElementById("status");
const button = document.getElementById("capture");
const order = document.getElementById("order");
const categoriesEl = document.getElementById("categories");
const progress = document.getElementById("progress");
const title = document.getElementById("title");

let items = [];
let focusedIndex = 0;
let stream;

const categories = [
  {
    name: "Pão",
    words: ["pao", "pão", "brioche", "bolacha", "pão brioche"]
  },
  {
    name: "Carne",
    words: ["carne", "hamburguer", "hambúrguer", "burger", " Angus", "vaca", "frango", "peru"]
  },
  {
    name: "Queijo",
    words: ["queijo", "cheddar", "mussarela", "mozzarella", "queijo da serra"]
  },
  {
    name: "Vegetais",
    words: ["tomate", "alface", "cebola", "pepino", "pickles", "pepinos", "rúcula", "couve", "espinafres"]
  },
  {
    name: "Molhos",
    words: ["molho", "ketchup", "maionese", "mostarda", "barbecue", "bbq", "burger sauce", "sriracha"]
  },
  {
    name: "Extras",
    words: ["bacon", "ovo", "cogumelos", "jalapeño", "jalapenos", "cebola caramelizada", "batata", "batatas", "bebida", "refrigerante"]
  }
];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectCategory(line) {
  const clean = normalize(line);

  for (const category of categories) {
    if (category.words.some(word => clean.includes(normalize(word)))) {
      return category.name;
    }
  }

  return "Outros";
}

function parseOrder(text) {
  const lines = text
    .split(/\r?\n|,|;|\+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length > 2);

  const parsed = [];
  const seen = new Set();

  lines.forEach(line => {
    const category = detectCategory(line);
    const key = normalize(line);

    if (!seen.has(key)) {
      seen.add(key);
      parsed.push({
        text: line,
        category,
        done: false
      });
    }
  });

  return parsed.slice(0, 30);
}

function render() {
  categoriesEl.innerHTML = "";
  items = items.map(item => ({ ...item }));

  const grouped = {};

  items.forEach((item, index) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ ...item, index });
  });

  Object.keys(grouped).forEach(categoryName => {
    const section = document.createElement("div");
    section.className = "category";

    const heading = document.createElement("h2");
    heading.textContent = categoryName;
    section.appendChild(heading);

    grouped[categoryName].forEach(item => {
      const row = document.createElement("button");
      row.className = "item" + (item.done ? " done" : "");
      row.type = "button";
      row.dataset.index = item.index;
      row.tabIndex = -1;

      const check = document.createElement("span");
      check.className = "check";

      const label = document.createElement("span");
      label.textContent = item.text;

      row.appendChild(check);
      row.appendChild(label);

      row.addEventListener("click", () => toggleItem(item.index));
      section.appendChild(row);
    });

    categoriesEl.appendChild(section);
  });

  updateProgress();
  updateFocus();
}

function toggleItem(index) {
  items[index].done = !items[index].done;
  render();
}

function updateProgress() {
  const done = items.filter(item => item.done).length;
  progress.textContent = `${done} / ${items.length}`;
}

function updateFocus() {
  const rows = [...document.querySelectorAll(".item")];

  rows.forEach(row => row.classList.remove("focused"));
  if (rows[focusedIndex]) {
    rows[focusedIndex].focus();
    rows[focusedIndex].classList.add("focused");
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
    status.textContent = "Aponta para o pedido.";
  } catch {
    status.textContent = "Não foi possível aceder à câmara.";
  }
}

async function readOrder() {
  if (!stream) {
    status.textContent = "A câmara ainda não está pronta.";
    return;
  }

  button.disabled = true;
  status.textContent = "A ler o pedido…";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  canvas.getContext("2d").drawImage(video, 0, 0);

  try {
    const worker = await Tesseract.createWorker("por+eng");
    const { data } = await worker.recognize(canvas.toDataURL("image/png"));
    await worker.terminate();

    items = parseOrder(data.text);

    if (items.length === 0) {
      status.textContent = "Não encontrei ingredientes. Aproxima a câmara.";
    } else {
      title.textContent = "Checklist do pedido";
      order.hidden = false;
      status.textContent = "Navega e confirma cada ingrediente.";
      focusedIndex = 0;
      render();
    }
  } catch {
    status.textContent = "Erro ao ler a imagem.";
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("keydown", event => {
  const rows = [...document.querySelectorAll(".item")];

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusedIndex = Math.min(focusedIndex + 1, rows.length - 1);
    updateFocus();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusedIndex = Math.max(focusedIndex - 1, 0);
    updateFocus();
  }

  if (event.key === "Enter" && items[focusedIndex]) {
    event.preventDefault();
    toggleItem(focusedIndex);
  }
});

button.addEventListener("click", readOrder);
startCamera();
