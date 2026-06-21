import { initUI } from "./ui.js";

const appRoot = document.querySelector("#app");

if (!appRoot) {
  throw new Error("Корневой элемент приложения не найден");
}

initUI(appRoot);
