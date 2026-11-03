const video = document.getElementById("camera");
const status = document.getElementById("status");
const button = document.getElementById("capture");
const result = document.getElementById("result");
const ingredients = document.getElementById("ingredients");

let stream;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
    status.textContent = "Aponta para a lista de ingredientes.";
  } catch (error) {
    status.textContent = "Não foi possível aceder à câmara.";
  }
}

function extractIngredientLines(text) {
  return text
    .split(/\r?\n|;|,|\./)
    .map(line => line.trim())
    .filter(line => line.length > 2)
    .slice(0, 20);
}

async function readIngredients() {
  if (!stream) {
    status.textContent = "A câmara ainda não está pronta.";
    return;
  }

  button.disabled = true;
  status.textContent = "A ler…";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL("image/png");

  try {
    const worker = await Tesseract.createWorker("por+eng");
    const { data } = await worker.recognize(imageData);
    await worker.terminate();

    const lines = extractIngredientLines(data.text);

    ingredients.innerHTML = "";

    if (lines.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Nenhum ingrediente detetado.";
      ingredients.appendChild(item);
    } else {
      lines.forEach(line => {
        const item = document.createElement("li");
        item.textContent = line;
        ingredients.appendChild(item);
      });
    }

    result.hidden = false;
    status.textContent = "Leitura concluída.";
  } catch (error) {
    status.textContent = "Erro ao ler a imagem.";
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", readIngredients);
startCamera();
