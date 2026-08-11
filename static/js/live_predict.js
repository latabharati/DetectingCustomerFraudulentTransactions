const apiModelSelect = document.getElementById('apiModelSelect');
const apiIndexInput = document.getElementById('apiIndexInput');
const generatePayloadBtn = document.getElementById('generatePayloadBtn');
const sendPayloadBtn = document.getElementById('sendPayloadBtn');
const apiPayloadBox = document.getElementById('apiPayloadBox');
const apiResponseBox = document.getElementById('apiResponseBox');
const apiDecisionCard = document.getElementById('apiDecisionCard');
const apiProbability = document.getElementById('apiProbability');
const apiVerdict = document.getElementById('apiVerdict');
const apiNote = document.getElementById('apiNote');

function hideDecisionCard() {
    apiDecisionCard.classList.add('hidden');
    apiProbability.textContent = '—';
    apiVerdict.textContent = '—';
    apiNote.textContent = '';
}

function showMessage(message) {
    apiResponseBox.textContent = message;
}

function updatePayloadModelFromDropdown() {
    if (!apiPayloadBox.value.trim()) {
        return;
    }

    try {
        const payload = JSON.parse(apiPayloadBox.value);
        payload.model = apiModelSelect.value;
        apiPayloadBox.value = JSON.stringify(payload, null, 2);
    } catch (error) {
        // Do nothing if the JSON box contains invalid JSON
    }
}

async function generateSamplePayload() {
    const index = apiIndexInput.value || 0;

    hideDecisionCard();
    showMessage('Generating sample payload...');

    try {
        const res = await fetch(`/api/live_predict/sample/${index}`);

        if (!res.ok) {
            const errorData = await res.json();
            showMessage(JSON.stringify(errorData, null, 2));
            return;
        }

        const payload = await res.json();

        // Always use the model selected in the dropdown
        payload.model = apiModelSelect.value;

        apiPayloadBox.value = JSON.stringify(payload, null, 2);

        showMessage(
            'Sample payload generated.\n\nClick "Send to /api/live_predict" to score this transaction.'
        );
    } catch (error) {
        showMessage(`Error generating sample payload:\n${error.message}`);
    }
}

async function sendPayload() {
    let payload;

    hideDecisionCard();

    try {
        payload = JSON.parse(apiPayloadBox.value);
    } catch (error) {
        showMessage('Invalid JSON. Please generate a sample payload or fix the JSON manually.');
        return;
    }

    // Always force the payload model to match the dropdown selection
    payload.model = apiModelSelect.value;

    // Update visible JSON box so the user sees the actual model being sent
    apiPayloadBox.value = JSON.stringify(payload, null, 2);

    showMessage('Sending request to /api/live_predict...');

    try {
        const res = await fetch('/api/live_predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        apiResponseBox.textContent = JSON.stringify(result, null, 2);

        if (!res.ok) {
            hideDecisionCard();
            return;
        }

        if (result.fraud_probability !== undefined) {
            apiDecisionCard.classList.remove('hidden');

            apiProbability.textContent =
                (result.fraud_probability * 100).toFixed(1) + '%';

            if (result.flagged) {
                apiVerdict.textContent = 'Flagged as fraud';
                apiVerdict.className = 'verdict-pill danger';
            } else {
                apiVerdict.textContent = 'Looks legitimate';
                apiVerdict.className = 'verdict-pill safe';
            }

            apiNote.textContent =
                `Model: ${result.model} · Threshold: ${(result.threshold * 100).toFixed(0)}%`;
        }
    } catch (error) {
        showMessage(`Error sending request:\n${error.message}`);
        hideDecisionCard();
    }
}

generatePayloadBtn.addEventListener('click', generateSamplePayload);

sendPayloadBtn.addEventListener('click', sendPayload);

apiModelSelect.addEventListener('change', () => {
    updatePayloadModelFromDropdown();
    showMessage('Model changed. Click "Send to /api/live_predict" again.');
    hideDecisionCard();
});

apiIndexInput.addEventListener('change', () => {
    hideDecisionCard();
    showMessage('Transaction index changed. Click "Generate sample JSON" again.');
});

// Generate one sample automatically when the page opens
generateSamplePayload();