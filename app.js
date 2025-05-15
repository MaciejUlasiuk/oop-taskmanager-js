
class Task {
    constructor(id, content, userId, priority = 'medium', category = 'general', status = 'pending', createdAt = new Date(), order = Date.now()) { 
        this.id = id || `task_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
        this.content = content;
        this.userId = userId;
        this.status = status;
        this.createdAt = new Date(createdAt);
        this.priority = priority;
        this.category = category.trim() || 'general';
        this.order = order; 
    }

    toggleStatus() {
        this.status = this.status === 'pending' ? 'done' : 'pending';
    }

    updateDetails(newContent, newPriority, newCategory) {
        if (newContent) this.content = newContent;
        if (newPriority) this.priority = newPriority;
        if (newCategory !== undefined) this.category = newCategory.trim() || 'general';
    }

    static fromJSON(json) {
        return new Task(
            json.id,
            json.content,
            json.userId,
            json.priority,
            json.category,
            json.status,
            json.createdAt,
            json.order 
        );
    }
}

class TaskManager {
    constructor() {
        this.tasks = this.loadTasksFromLocalStorage();
        this.currentUserId = localStorage.getItem('currentUserId') || null;
        this.knownUsers = this.loadKnownUsersFromLocalStorage();
        this.currentFilterStatus = 'all';
        this.currentFilterCategory = '';
        this.currentSort = 'order_asc'; 

        this.tasks.forEach(task => {
            if (task.userId) {
                this.knownUsers.add(task.userId);
            }
            if (task.order === undefined) {
                task.order = new Date(task.createdAt).getTime();
            }
        });
        this.saveTasksToLocalStorage(); 
        this.saveKnownUsersToLocalStorage();
    }

    setCurrentUser(userId) {
        if (userId && userId.trim() !== "") {
            const trimmedUserId = userId.trim();
            this.currentUserId = trimmedUserId;
            localStorage.setItem('currentUserId', this.currentUserId);
            this.knownUsers.add(trimmedUserId);
            this.saveKnownUsersToLocalStorage();
        } else {
            this.currentUserId = null;
            localStorage.removeItem('currentUserId');
        }
        this.currentSort = 'order_asc';
    }

    getCurrentUser() {
        return this.currentUserId;
    }

    getKnownUsers() {
        return Array.from(this.knownUsers).sort();
    }

    addTask(content, priority, category) {
        if (!this.currentUserId) {
            alert("Proszę najpierw ustawić użytkownika.");
            return null;
        }
        if (!content.trim()) {
            alert("Treść zadania nie może być pusta.");
            return null;
        }
        const userTasks = this.tasks.filter(t => t.userId === this.currentUserId);
        const maxOrder = userTasks.reduce((max, t) => Math.max(max, t.order || 0), 0);
        const newOrder = (userTasks.length > 0 && maxOrder >= Date.now()) ? maxOrder + 1 : Date.now();


        const newTask = new Task(null, content, this.currentUserId, priority, category, 'pending', new Date(), newOrder);
        this.tasks.push(newTask);
        this.knownUsers.add(this.currentUserId);
        this.saveTasksToLocalStorage();
        this.saveKnownUsersToLocalStorage();
        return newTask;
    }

    updateTasksOrder(orderedTaskIds) {
        if (!this.currentUserId) return;

        orderedTaskIds.forEach((taskId, index) => {
            const task = this.tasks.find(t => t.id === taskId && t.userId === this.currentUserId);
            if (task) {
                task.order = index; 
            }
        });
        this.saveTasksToLocalStorage();
        this.currentSort = 'order_asc'; 
    }


    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasksToLocalStorage();
    }

    findTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }

    editTask(taskId, newContent, newPriority, newCategory) {
        const task = this.findTaskById(taskId);
        if (task) {
            task.updateDetails(newContent, newPriority, newCategory);
            this.saveTasksToLocalStorage();
            return task;
        }
        return null;
    }

    toggleTaskStatus(taskId) {
        const task = this.findTaskById(taskId);
        if (task) {
            task.toggleStatus();
            this.saveTasksToLocalStorage();
        }
    }

    getTasksForCurrentUser() {
        if (!this.currentUserId) return [];
        let filteredTasks = this.tasks.filter(task => task.userId === this.currentUserId);

        if (this.currentFilterStatus !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === this.currentFilterStatus);
        }
        if (this.currentFilterCategory && this.currentFilterCategory.trim() !== '') {
            const categoryQuery = this.currentFilterCategory.trim().toLowerCase();
            filteredTasks = filteredTasks.filter(task => task.category.toLowerCase().includes(categoryQuery));
        }
        
        const [sortBy, sortOrder] = this.currentSort.split('_');
        filteredTasks.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'createdAt') {
                comparison = new Date(a.createdAt) - new Date(b.createdAt);
            } else if (sortBy === 'priority') {
                const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
                comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
            } else if (sortBy === 'order') { 
                comparison = (a.order || 0) - (b.order || 0);
            }
            return sortOrder === 'desc' ? comparison * -1 : comparison;
        });
        return filteredTasks;
    }

    setFilterStatus(status) { this.currentFilterStatus = status; }
    setFilterCategory(category) { this.currentFilterCategory = category; }
    setSort(sortOption) { 
        this.currentSort = sortOption; 
    }

    saveTasksToLocalStorage() { localStorage.setItem('tasks', JSON.stringify(this.tasks)); }
    loadTasksFromLocalStorage() {
        const tasksJSON = localStorage.getItem('tasks');
        if (tasksJSON) {
            return JSON.parse(tasksJSON).map(taskData => Task.fromJSON(taskData));
        }
        return [];
    }

    saveKnownUsersToLocalStorage() {
        localStorage.setItem('knownUsers', JSON.stringify(Array.from(this.knownUsers)));
    }

    loadKnownUsersFromLocalStorage() {
        const knownUsersJSON = localStorage.getItem('knownUsers');
        if (knownUsersJSON) {
            return new Set(JSON.parse(knownUsersJSON));
        }
        return new Set();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();

    const userInput = document.getElementById('userInput');
    const switchUserBtn = document.getElementById('switchUserBtn');
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    const knownUsersListDiv = document.getElementById('knownUsersList');

    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskPrioritySelect = document.getElementById('taskPriority');
    const taskCategoryInput = document.getElementById('taskCategory');

    const taskListUL = document.getElementById('taskList');
    const taskCountSpan = document.getElementById('taskCount');

    const filterStatusSelect = document.getElementById('filterStatus');
    const filterCategoryInput = document.getElementById('filterCategoryInput');
    const sortTasksSelect = document.getElementById('sortTasks');

    const customEditTaskModal = document.getElementById('customEditTaskModal');
    const editTaskIdInput = document.getElementById('editTaskId');
    const editTaskContentInput = document.getElementById('editTaskContent');
    const editTaskPrioritySelect = document.getElementById('editTaskPriority');
    const editTaskCategoryInput = document.getElementById('editTaskCategory');
    const saveEditTaskBtn = document.getElementById('saveEditTaskBtn');
    const cancelEditTaskBtn = document.getElementById('cancelEditTaskBtn');
    const closeCustomModalBtn = customEditTaskModal.querySelector('.close-custom-modal');

    function openCustomModal() {
        customEditTaskModal.style.display = 'flex';
    }

    function closeCustomModal() {
        customEditTaskModal.style.display = 'none';
    }

    function renderKnownUsers() {
        knownUsersListDiv.innerHTML = '';
        const users = taskManager.getKnownUsers();
        const currentActiveUser = taskManager.getCurrentUser();

        if (users.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-muted mb-0 small';
            p.textContent = 'Brak.';
            knownUsersListDiv.appendChild(p);
            return;
        }
        
        users.forEach(user => {
            const userTag = document.createElement('span');
            userTag.className = 'badge user-tag';
            if (user === currentActiveUser) {
                userTag.classList.add('active');
            }
            userTag.textContent = user;
            userTag.dataset.username = user;
            knownUsersListDiv.appendChild(userTag);
        });
    }

    function renderTasks() {
        taskListUL.innerHTML = '';
        const currentUser = taskManager.getCurrentUser();

        if (!currentUser) {
            currentUserDisplay.textContent = 'Nikt';
            taskCountSpan.textContent = '0';
            taskInput.disabled = true;
            taskPrioritySelect.disabled = true;
            taskCategoryInput.disabled = true;
            taskForm.querySelector('button[type="submit"]').disabled = true;
        } else {
            currentUserDisplay.textContent = currentUser;
            taskInput.disabled = false;
            taskPrioritySelect.disabled = false;
            taskCategoryInput.disabled = false;
            taskForm.querySelector('button[type="submit"]').disabled = false;

            const tasksToDisplay = taskManager.getTasksForCurrentUser();
            taskCountSpan.textContent = tasksToDisplay.length;

            if (tasksToDisplay.length === 0) {
                const li = document.createElement('li');
                li.className = 'list-group-item text-muted text-center';
                li.textContent = 'Brak zadań do wyświetlenia.';
                taskListUL.appendChild(li);

            } else {
                tasksToDisplay.forEach(task => {
                    const li = document.createElement('li');
                    li.className = `list-group-item task-item ${task.status === 'done' ? 'done' : ''}`;
                    li.dataset.taskId = task.id;
                    li.draggable = true; 
                    const priorityClass = `priority-${task.priority}`;

                    li.innerHTML = `
                        <input type="checkbox" class="form-check-input task-status-checkbox" ${task.status === 'done' ? 'checked' : ''}>
                        <div class="task-info">
                            <span class="task-content">${task.content}</span>
                            <div class="task-meta">
                                <span class="badge">${task.category || 'brak'}</span>
                                <span class="badge ${priorityClass}">${task.priority}</span>
                                <span>${new Date(task.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-sm btn-warning edit-task-btn">Edytuj</button>
                            <button class="btn btn-sm btn-danger delete-task-btn">Usuń</button>
                        </div>
                    `;
                    taskListUL.appendChild(li);
                });
            }
        }
        renderKnownUsers();
        sortTasksSelect.value = taskManager.currentSort;
    }

    let draggedItem = null;

    taskListUL.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        }
    });

    taskListUL.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            document.querySelectorAll('.drag-over-placeholder').forEach(el => el.classList.remove('drag-over-placeholder'));
        }
    });

    taskListUL.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        const targetItem = e.target.closest('.task-item');
        
        document.querySelectorAll('.drag-over-placeholder').forEach(el => el.classList.remove('drag-over-placeholder'));

        if (targetItem && targetItem !== draggedItem) {
            const rect = targetItem.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const isAfter = offsetY > rect.height / 2;

            if (isAfter) {
                targetItem.classList.add('drag-over-placeholder-after'); 
            } else {
                targetItem.classList.add('drag-over-placeholder-before'); 
            }
        } else if (!targetItem && taskListUL.children.length > 0 && draggedItem) {
        }
    });
    
    taskListUL.addEventListener('dragleave', (e) => {
        const relatedTarget = e.relatedTarget;
        const currentTarget = e.currentTarget;
        if (e.target.classList && e.target.classList.contains('task-item')) {
             if (!e.target.contains(relatedTarget)) { 
                e.target.classList.remove('drag-over-placeholder-before', 'drag-over-placeholder-after');
            }
        } else if (currentTarget === taskListUL && !currentTarget.contains(relatedTarget)) {
             document.querySelectorAll('.drag-over-placeholder-before, .drag-over-placeholder-after').forEach(el => 
                el.classList.remove('drag-over-placeholder-before', 'drag-over-placeholder-after')
            );
        }
    });


    taskListUL.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const targetItem = e.target.closest('.task-item');
        
        document.querySelectorAll('.drag-over-placeholder-before, .drag-over-placeholder-after').forEach(el => 
            el.classList.remove('drag-over-placeholder-before', 'drag-over-placeholder-after')
        );

        const children = Array.from(taskListUL.querySelectorAll('.task-item:not(.dragging)'));
        let newOrderedIds = [];

        if (targetItem && targetItem !== draggedItem) {
            const rect = targetItem.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const isAfter = offsetY > rect.height / 2;

            let draggedIdx = -1;
            children.forEach((child, idx) => {
                if (child === draggedItem) draggedIdx = idx; 
            });
            
            let inserted = false;
            children.forEach(child => {
                if (child === targetItem) {
                    if (!isAfter) {
                        newOrderedIds.push(draggedItem.dataset.taskId);
                        inserted = true;
                    }
                    newOrderedIds.push(child.dataset.taskId);
                    if (isAfter) {
                        newOrderedIds.push(draggedItem.dataset.taskId);
                        inserted = true;
                    }
                } else {
                    newOrderedIds.push(child.dataset.taskId);
                }
            });
           
            if (!inserted && children.length > 0 && targetItem === children[children.length -1] && isAfter) {
                 
            } else if (!inserted) { 
                newOrderedIds.push(draggedItem.dataset.taskId);
            }


        } else { 
            children.forEach(child => newOrderedIds.push(child.dataset.taskId));
            newOrderedIds.push(draggedItem.dataset.taskId);
        }
        
        const uniqueOrderedIds = [];
        const seenIds = new Set();
        for (const id of newOrderedIds) {
            if (!seenIds.has(id)) {
                uniqueOrderedIds.push(id);
                seenIds.add(id);
            }
        }
        if (!uniqueOrderedIds.includes(draggedItem.dataset.taskId) && (!targetItem || targetItem === draggedItem)) {
            if (taskListUL.children.length === 1 && taskListUL.firstChild === draggedItem) { 
                 uniqueOrderedIds.push(draggedItem.dataset.taskId);
            } else if (taskListUL.children.length > 0) {
                if (!targetItem) uniqueOrderedIds.push(draggedItem.dataset.taskId);
            } else { 
                 uniqueOrderedIds.push(draggedItem.dataset.taskId);
            }
        }


        if (uniqueOrderedIds.length > 0) {
             taskManager.updateTasksOrder(uniqueOrderedIds);
             renderTasks(); 
        }

        draggedItem.classList.remove('dragging');
        draggedItem = null;
    });


    switchUserBtn.addEventListener('click', () => {
        const newUserId = userInput.value.trim();
        if (newUserId) {
            taskManager.setCurrentUser(newUserId);
            userInput.value = '';
            renderTasks();
        } else {
            alert("Nazwa użytkownika nie może być pusta.");
        }
    });

    knownUsersListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('user-tag')) {
            const username = e.target.dataset.username;
            if (username) {
                taskManager.setCurrentUser(username);
                userInput.value = '';
                renderTasks();
            }
        }
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = taskInput.value;
        const priority = taskPrioritySelect.value;
        const category = taskCategoryInput.value;

        if (taskManager.addTask(content, priority, category)) {
            taskInput.value = '';
            taskCategoryInput.value = '';
            taskPrioritySelect.value = 'medium';
            renderTasks();
        }
    });

    taskListUL.addEventListener('click', (e) => {
        const target = e.target;
        const taskLi = target.closest('.task-item');
        if (!taskLi) return;
        const taskId = taskLi.dataset.taskId;

        if (target.classList.contains('delete-task-btn')) {
            if (confirm("Czy na pewno chcesz usunąć to zadanie?")) {
                taskManager.deleteTask(taskId);
                renderTasks();
            }
        } else if (target.classList.contains('task-status-checkbox')) {
            taskManager.toggleTaskStatus(taskId);
            renderTasks();
        } else if (target.classList.contains('edit-task-btn')) {
            const task = taskManager.findTaskById(taskId);
            if (task) {
                editTaskIdInput.value = task.id;
                editTaskContentInput.value = task.content;
                editTaskPrioritySelect.value = task.priority;
                editTaskCategoryInput.value = task.category;
                openCustomModal();
            }
        }
    });

    saveEditTaskBtn.addEventListener('click', () => {
        const id = editTaskIdInput.value;
        const content = editTaskContentInput.value;
        const priority = editTaskPrioritySelect.value;
        const category = editTaskCategoryInput.value;

        if (!content.trim()) {
            alert("Treść zadania nie może być pusta.");
            return;
        }
        taskManager.editTask(id, content, priority, category);
        closeCustomModal();
        renderTasks();
    });

    cancelEditTaskBtn.addEventListener('click', closeCustomModal);
    closeCustomModalBtn.addEventListener('click', closeCustomModal);
    customEditTaskModal.addEventListener('click', (event) => {
        if (event.target === customEditTaskModal) {
            closeCustomModal();
        }
    });

    filterStatusSelect.addEventListener('change', (e) => { taskManager.setFilterStatus(e.target.value); renderTasks(); });
    filterCategoryInput.addEventListener('input', (e) => { taskManager.setFilterCategory(e.target.value); renderTasks(); });
    sortTasksSelect.addEventListener('change', (e) => { 
        taskManager.setSort(e.target.value); 
        renderTasks(); 
    });

    function initializeApp() {
        const storedUser = taskManager.getCurrentUser();
        if (storedUser) {
            currentUserDisplay.textContent = storedUser;
        } else {
            currentUserDisplay.textContent = "Nikt";
        }
        if (!sortTasksSelect.querySelector('option[value="order_asc"]')) {
            const manualSortOption = document.createElement('option');
            manualSortOption.value = 'order_asc';
            manualSortOption.textContent = 'Ręczna kolejność';
            sortTasksSelect.insertBefore(manualSortOption, sortTasksSelect.firstChild);
        }
        
        sortTasksSelect.value = taskManager.currentSort;
        filterStatusSelect.value = taskManager.currentFilterStatus;
        filterCategoryInput.value = taskManager.currentFilterCategory;
        renderTasks();
    }

    initializeApp();
});