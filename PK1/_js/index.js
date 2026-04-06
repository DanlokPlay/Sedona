
/* Получение элементов */

const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const clearBtn = document.getElementById("clearCompleted");

const prioritySelect = document.getElementById("prioritySelect");
const filterSelect = document.getElementById("filter");
const sortSelect = document.getElementById("sort");


/* Данные */
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

/* Работа с localStorage */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}


/* Счётчик задач */
function updateCount() {
    const remaining = tasks.filter(t => !t.completed).length;
    taskCount.textContent = `${remaining} осталось`;
}


/* Рендер списка */
function render() {
    list.innerHTML = "";

    let filteredTasks = [...tasks];


    /*  Фильтрация  */
    if (filterSelect.value === "active") {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (filterSelect.value === "completed") {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }


    /*  Сортировка  */
    if (sortSelect.value === "new") {
        filteredTasks.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortSelect.value === "old") {
        filteredTasks.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortSelect.value === "az") {
        filteredTasks.sort((a, b) => a.text.localeCompare(b.text));
    }


    /*  Создание элементов  */
    filteredTasks.forEach((task) => {
        const realIndex = tasks.indexOf(task);

        const li = document.createElement("li");
        li.classList.add(task.priority);
        if (task.completed) li.classList.add("completed");

        li.draggable = true;


        /*  Drag & Drop  */
        li.addEventListener("dragstart", () => {
            li.classList.add("dragging");
        });

        li.addEventListener("dragend", () => {
            li.classList.remove("dragging");

            const items = [...list.children];
            tasks = items.map(item => {
                const text = item.querySelector("span").textContent;
                return tasks.find(t => t.text === text);
            });

            saveTasks();
        });


        /*  Левая часть  */
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "10px";


        /*  Чекбокс  */
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        checkbox.onchange = () => {
            task.completed = checkbox.checked;
            saveTasks();
            render();
        };


        /*  Текст  */
        const span = document.createElement("span");
        span.textContent = task.text;

        left.appendChild(checkbox);
        left.appendChild(span);


        /*  Кнопки  */
        const actions = document.createElement("div");
        actions.className = "actions";


        /*  Редактирование  */
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";

        editBtn.onclick = () => {
            const editInput = document.createElement("input");
            editInput.value = task.text;

            const saveBtn = document.createElement("button");
            saveBtn.textContent = "💾";

            li.innerHTML = "";
            li.appendChild(editInput);
            li.appendChild(saveBtn);

            editInput.focus();

            saveBtn.onclick = () => {
                if (!editInput.value.trim()) return;

                task.text = editInput.value;
                saveTasks();
                render();
            };

            editInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") saveBtn.onclick();
            });
        };


        /*  Удаление  */
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑";

        deleteBtn.onclick = () => {
            li.style.opacity = "0";

            setTimeout(() => {
                tasks.splice(realIndex, 1);
                saveTasks();
                render();
            }, 200);
        };


        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);


        /*  Сборка элемента  */
        li.appendChild(left);
        li.appendChild(actions);
        list.appendChild(li);
    });

    updateCount();
}


/* Добавление задачи */
function addTask() {
    const text = input.value.trim();

    if (!text) return;

    if (text.length > 100) {
        alert("Максимум 100 символов!");
        return;
    }

    tasks.push({
        id: Date.now(),
        text,
        completed: false,
        priority: prioritySelect.value,
        createdAt: Date.now()
    });

    input.value = "";

    saveTasks();
    render();
}


/* Drag & Drop логика */
list.addEventListener("dragover", (e) => {
    e.preventDefault();

    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(list, e.clientY);

    if (afterElement == null) {
        list.appendChild(dragging);
    } else {
        list.insertBefore(dragging, afterElement);
    }
});

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll("li:not(.dragging)")];

    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


/* События */
addBtn.onclick = addTask;

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
});

clearBtn.onclick = () => {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
};

filterSelect.onchange = render;
sortSelect.onchange = render;


/* Запуск */
render();