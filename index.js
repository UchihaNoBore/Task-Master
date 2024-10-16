document.querySelector('#insert').onclick = async function(){
    if(document.querySelector('#new input').value.length == 0){
        alert("Please Enter a Task")
    }
    else{
        const taskName = document.querySelector('#new input').value;
        
        try {
            const response = await fetch('http://localhost:3000/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ task_name: taskName }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to create task');
            }
            
            const result = await response.json();
            console.log(result.message);
            
            // Add task to UI with the returned ID
            document.querySelector('#current').innerHTML += `
                <div class="task" data-id="${result.id}">
                    <span id="taskname">
                        ${taskName}
                    </span>
                    <button class="delete">
                        <i class="fa fa-check"></i>
                    </button>
                </div>
            `;
            
            attachEventListeners();
            document.querySelector("#new input").value = "";
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to add task. Please try again.');
        }
    }
}

function attachEventListeners() {
    var current_tasks = document.querySelectorAll(".delete");
    for(var i=0; i<current_tasks.length; i++){
        current_tasks[i].onclick = async function(){
            var taskElement = this.parentNode;
            var taskId = taskElement.getAttribute('data-id');
            var taskName = taskElement.querySelector('#taskname').innerText;
            
            try {
                const response = await fetch(`http://localhost:3000/tasks/${taskId}/complete`, {
                    method: 'PUT',
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update task');
                }
                
                document.querySelector('#newcurrent').innerHTML += `
                    <div class="completedtask">
                        <span id="taskname completed">
                            ${taskName}
                        </span>
                    </div>
                `;
                taskElement.remove();
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to complete task. Please try again.');
            }
        }
    }

    var tasks = document.querySelectorAll(".task");
    for(var i=0; i<tasks.length; i++){
        tasks[i].onclick = function(){
            this.classList.toggle('completed');
        }
    }
}

async function deleteCompletedTasks() {
    try {
        const response = await fetch('http://localhost:3000/tasks/completed', {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete completed tasks');
        }
        
        const result = await response.json();
        console.log(result.message);
        
        // Clear the completed tasks from the UI
        document.querySelector('#newcurrent').innerHTML = '';
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete completed tasks. Please try again.');
    }
}

// Load tasks on page load
window.onload = async function() {
    try {
        const response = await fetch('http://localhost:3000/tasks');
        const tasks = await response.json();
        
        tasks.forEach(task => {
            if (task.status === 'pending') {
                document.querySelector('#current').innerHTML += `
                    <div class="task" data-id="${task.id}">
                        <span id="taskname">
                            ${task.task_name}
                        </span>
                        <button class="delete">
                            <i class="fa fa-check"></i>
                        </button>
                    </div>
                `;
            } else if (task.status === 'completed') {
                document.querySelector('#newcurrent').innerHTML += `
                    <div class="completedtask">
                        <span id="taskname completed">
                            ${task.task_name}
                        </span>
                    </div>
                `;
            }
        });
        
        attachEventListeners();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
    document.querySelector('#deleteCompleted').addEventListener('click', deleteCompletedTasks);
}