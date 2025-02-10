let serverOnline = false;
let selectedImage = null;
let useFullContext = false;
let selectedContextMessages = [];
let conversationHistory = [];
import ollama from 'ollama'

console.log(ollama);

//192.168.0.36:11434, localhost:11434
const server_url = 'localhost:11434';

// Auto-resize textarea
const textarea = document.getElementById('prompt');
textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Temperature slider
const temperatureSlider = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
temperatureSlider.addEventListener('input', function() {
    updateTemperatureValue(this.value);
});

// Add click handler to make temperature value editable
temperatureValue.addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '2';
    input.step = '0.1';
    input.value = this.textContent;
    input.style.width = '50px';
    
    input.addEventListener('blur', function() {
        const newValue = Math.min(Math.max(parseFloat(this.value) || 0, 0), 2);
        updateTemperatureValue(newValue);
        temperatureSlider.value = newValue;
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur();
        }
    });

    this.textContent = '';
    this.appendChild(input);
    input.focus();
});

function updateTemperatureValue(value) {
    const formattedValue = parseFloat(value).toFixed(1);
    temperatureValue.textContent = formattedValue;
}

async function checkServerStatus() {
    const statusIndicator = document.getElementById('serverStatus');
    const statusText = document.getElementById('serverStatusText');
    const generateButton = document.getElementById('generate');

    try {
        //const response = await fetch(`http://${server_url}/api/tags`);
		const response = await fetch(`http://${server_url}/api/tags`, {
		  mode: 'no-cors'
		});
		console.log(`http://${server_url}/api/tags`, response);

        if (response.ok) {
            statusIndicator.className = 'status-indicator status-online';
            statusText.textContent = 'Server Online';
            generateButton.disabled = false;
            serverOnline = true;
            return true;
        }
    } catch (error) {
        console.error('Server check failed:', error);
    }

    statusIndicator.className = 'status-indicator status-offline';
    statusText.textContent = 'Server Offline';
    generateButton.disabled = true;
    serverOnline = false;
    return false;
}

async function fetchModels() {
    const isOnline = await checkServerStatus();
    if (!isOnline) {
        document.getElementById('modelList').innerHTML = 
            '<option value="">Server offline</option>';
        const modelGrid = document.getElementById('modelGrid');
        if (modelGrid) {
            modelGrid.innerHTML = '<div>Server offline</div>';
        }
        return;
    }

    try {
		alert(2);
        const response = await fetch(`http://${server_url}/api/tags`);
		alert('fetchModels: ' + response);
		
        const data = await response.json();
        
        // Update dropdown list
        const modelSelect = document.getElementById('modelList');
        modelSelect.innerHTML = '';
        
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });

        // Add event listener for model changes
        modelSelect.addEventListener('change', handleModelChange);
        // Initial check for current model
        handleModelChange();

        // Update model grid in settings
        const modelGrid = document.getElementById('modelGrid');
        if (modelGrid) {
            modelGrid.innerHTML = '';
            data.models.forEach(model => {
                const card = document.createElement('div');
                card.className = 'model-card';
                card.innerHTML = `
                    <h3>${model.name}</h3>
                    <div class="model-meta">
                        <span class="tag">Size: ${formatSize(model.size)}</span>
                        <span class="tag">Modified: ${formatDate(model.modified_at)}</span>
                    </div>
                    <div class="model-actions">
                        <button class="btn btn-danger" onclick="deleteModel('${model.name}')">
                            <span class="material-icons">delete</span>
                            Delete
                        </button>
                    </div>
                `;
                modelGrid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        document.getElementById('modelList').innerHTML = 
            '<option value="">Error loading models</option>';
        const modelGrid = document.getElementById('modelGrid');
        if (modelGrid) {
            modelGrid.innerHTML = '<div>Error loading models</div>';
        }
    }
}

async function generateResponse() {
    if (!serverOnline) {
        alert('Server is offline. Please check your Ollama server.');
        return;
    }

    const promptInput = document.getElementById('prompt');
    const prompt = promptInput.value;
    const model = document.getElementById('modelList').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const button = document.getElementById('generate');
    const responseDiv = document.getElementById('response');

    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    // Create contextPrompt before adding the latest user message
    let contextMessages = [];

    if (useFullContext) {
        contextMessages = [...conversationHistory];
    } else if (selectedContextMessages.length > 0) {
        selectedContextMessages.forEach(index => {
            const userMsg = conversationHistory[index * 2];
            const assistantMsg = conversationHistory[index * 2 + 1];
            if (userMsg && assistantMsg) {
                contextMessages.push(userMsg);
                contextMessages.push(assistantMsg);
            }
        });
    }

    let contextPrompt = contextMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    // Then, construct the full prompt
    const fullPrompt = (contextPrompt ? contextPrompt + '\n' : '') + 'user: ' + prompt + '\nassistant:';

    // Store the user message
    conversationHistory.push({ role: 'user', content: prompt });

    // Add user's prompt to the response area
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.textContent = prompt;
    responseDiv.appendChild(userMessage);

    // Add system message
    const systemMessage = document.createElement('div');
    systemMessage.className = 'message system-message';
    systemMessage.textContent = 'Generating response...';
    responseDiv.appendChild(systemMessage);

    // Create a new div for the AI response
    const aiResponse = document.createElement('div');
    aiResponse.className = 'message ai-message';
    responseDiv.appendChild(aiResponse);

    // Clear input field and reset height
    promptInput.value = '';
    promptInput.style.height = 'auto';

    button.disabled = true;

    try {
        const requestBody = {
            model: model,
            prompt: fullPrompt,
            temperature: temperature
        };

        // Add image data if present
        if (selectedImage) {
            requestBody.images = [selectedImage];
        }

		alert(3);
        const response = await fetch(`http://${server_url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

		alert('generateResponse: ' + response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let fullResponse = '';

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const jsonResponse = JSON.parse(line);
                        if (jsonResponse.response) {
                            fullResponse += jsonResponse.response;
                            aiResponse.innerHTML = marked.parse(fullResponse);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }

        // After generation is complete
        systemMessage.textContent = 'Generation complete!';
        setTimeout(() => systemMessage.remove(), 1000);
    } catch (error) {
        console.error('Error:', error);
        systemMessage.textContent = 'Error generating response: ' + error.message;
    } finally {
        button.disabled = false;
        selectedImage = null;
        document.getElementById('imagePreview').innerHTML = '';
    }

    // After getting the AI response, store it
    conversationHistory.push({ role: 'assistant', content: fullResponse });
}

// Enter key to submit
textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateResponse();
    }
});

setInterval(checkServerStatus, 5000);
fetchModels();

// Add this near the top of the file
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Set initial theme icon
    const themeIcon = document.querySelector('.theme-toggle .material-icons');
    themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme icon
    const themeIcon = document.querySelector('.theme-toggle .material-icons');
    themeIcon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
}

// Add this to your initialization code
document.getElementById('darkModeToggle').addEventListener('click', toggleTheme);
initTheme();

// Add these functions to your existing script.js
function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'block';
    fetchModels(); // Refresh the model list when opening settings
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Add these event listeners to your initialization code
document.getElementById('settingsButton').addEventListener('click', openSettingsModal);
document.querySelector('.close-button').addEventListener('click', closeSettingsModal);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
        closeSettingsModal();
    }
});

// Add the model management functions from settings.html
function formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

async function deleteModel(modelName) {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) {
        return;
    }

    try {
		alert(4);
        const response = await fetch(`http://${server_url}/api/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: modelName })
        });

		alert('deleteModel: ' + response);

        if (response.ok) {
            fetchModels();
        } else {
            throw new Error('Failed to delete model');
        }
    } catch (error) {
        console.error('Error deleting model:', error);
        alert('Error deleting model: ' + error.message);
    }
}

async function pullModel() {
    // Copy the pullModel function from settings.html
    // It's the same implementation as shown in the settings file
}

function setupImageUpload() {
    const imageUploadBtn = document.getElementById('imageUpload');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Set initial visibility to none
    imageUploadBtn.style.display = 'none';

    imageUploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleImageUpload);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImage = e.target.result;
            displayImagePreview(selectedImage);
        };
        reader.readAsDataURL(file);
    }
}

function displayImagePreview(imageData) {
    const previewArea = document.getElementById('imagePreview');
    previewArea.innerHTML = '';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';

    const img = document.createElement('img');
    img.src = imageData;
    img.className = 'preview-image';

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-image';
    removeButton.innerHTML = '<span class="material-icons">close</span>';
    removeButton.onclick = () => {
        selectedImage = null;
        previewArea.innerHTML = '';
    };

    previewContainer.appendChild(img);
    previewContainer.appendChild(removeButton);
    previewArea.appendChild(previewContainer);
}

// Add this to your initialization code
setupImageUpload();

// Add this function to handle model selection changes
function handleModelChange() {
    const modelSelect = document.getElementById('modelList');
    const imageUploadBtn = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    
    // Show image upload button only for llama3.2-vision model
    if (modelSelect.value === 'llama3.2-vision:latest') {
        imageUploadBtn.style.display = 'block';
    } else {
        // Hide button and clear any selected image for other models
        imageUploadBtn.style.display = 'none';
        selectedImage = null;
        imagePreview.innerHTML = '';
    }
}

function openContextSelectionModal() {
    // Check if there's any conversation history
    if (conversationHistory.length === 0) {
        document.getElementById('selectContextButton').classList.remove('active');
        return;
    }

    // Toggle selection mode
    const isSelectionMode = document.querySelector('.context-checkbox') !== null;
    if (isSelectionMode) {
        // If already in selection mode, save and exit
        document.querySelectorAll('.context-checkbox').forEach(el => el.remove());
        document.querySelectorAll('.conversation-pair').forEach(el => {
            el.classList.remove('conversation-pair');
        });
        
        document.getElementById('selectContextButton').classList.toggle('active', selectedContextMessages.length > 0);
        return;
    }

    // Add deselect all button if it doesn't exist
    const controlsRow = document.querySelector('.controls-row');
    const existingDeselectButton = document.querySelector('.deselect-all-button');
    if (!existingDeselectButton) {
        const deselectButton = document.createElement('button');
        deselectButton.className = 'deselect-all-button';
        deselectButton.innerHTML = '<span class="material-icons">clear_all</span>';
        deselectButton.title = "Deselect All";
        deselectButton.onclick = function() {
            document.querySelectorAll('.context-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            selectedContextMessages = [];
        };
        controlsRow.querySelector('.context-controls').appendChild(deselectButton);
    }

    // Add checkboxes and create conversation pairs
    const messages = document.querySelectorAll('.message');
    let currentPair = null;
    let pairIndex = 0;

    messages.forEach((message, index) => {
        if (message.classList.contains('user-message')) {
            currentPair = document.createElement('div');
            currentPair.className = 'conversation-pair';
            message.parentNode.insertBefore(currentPair, message);
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'context-checkbox';
            checkbox.value = pairIndex;
            checkbox.checked = selectedContextMessages.includes(pairIndex);
            
            checkbox.addEventListener('change', function() {
                const pairIndex = parseInt(this.value);
                if (this.checked) {
                    if (!selectedContextMessages.includes(pairIndex)) {
                        selectedContextMessages.push(pairIndex);
                    }
                } else {
                    selectedContextMessages = selectedContextMessages.filter(i => i !== pairIndex);
                }
            });
            
            currentPair.appendChild(checkbox);
            currentPair.appendChild(message);
            
            const nextMessage = messages[index + 1];
            if (nextMessage && nextMessage.classList.contains('ai-message')) {
                currentPair.appendChild(nextMessage);
            }
            
            pairIndex++;
        }
    });

    document.getElementById('selectContextButton').classList.add('active');
}

function clearConversation() {
    if (confirm('Are you sure you want to clear the conversation?')) {
        const responseDiv = document.getElementById('response');
        responseDiv.innerHTML = '';
        conversationHistory = [];
        selectedContextMessages = [];
        useFullContext = false;
        
        // Reset context buttons
        document.getElementById('fullContextButton').classList.remove('active');
        document.getElementById('selectContextButton').classList.remove('active');
    }
}

// Add event listeners for context buttons
document.addEventListener('DOMContentLoaded', function() {
    const fullContextButton = document.getElementById('fullContextButton');
    fullContextButton.addEventListener('click', function() {
        useFullContext = !useFullContext;
        this.classList.toggle('active', useFullContext);
        if (useFullContext) {
            selectedContextMessages = [];
            document.getElementById('selectContextButton').classList.remove('active');
        }
    });

    const selectContextButton = document.getElementById('selectContextButton');
    selectContextButton.addEventListener('click', function() {
        openContextSelectionModal();
        useFullContext = false;
        fullContextButton.classList.remove('active');
    });

    document.getElementById('clearConversationButton').addEventListener('click', clearConversation);
}); 