import { initUI } from "./ui.js";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("Корневой элемент приложения не найден");
}

initUI(root);
