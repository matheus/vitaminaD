document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    const uvIndexSpan = document.getElementById('uvIndex');
    const vitaminDRateSpan = document.getElementById('vitaminDRate');
    const burnTimeSpan = document.getElementById('burnTime');
    const winterWarning = document.getElementById('winterWarning');

    // Load saved user preferences
    const savedSkinType = localStorage.getItem('skinType');
    const savedClothing = localStorage.getItem('clothing');
    const savedAge = localStorage.getItem('age');
    if (savedSkinType) document.getElementById('skinType').value = savedSkinType;
    if (savedClothing) document.getElementById('clothing').value = savedClothing;
    if (savedAge) document.getElementById('age').value = savedAge;

    // Request geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => fetchUVData(position.coords.latitude, position.coords.longitude),
            error => showError('Erro ao obter geolocalização. Por favor, permita o acesso à localização.')
        );
    } else {
        showError('Geolocalização não é suportada pelo seu navegador.');
    }

    // Fetch UV Index from Open-Meteo API
    async function fetchUVData(latitude, longitude) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=uv_index`);
            const data = await response.json();
            const uvIndex = data.hourly.uv_index[new Date().getHours()];
            loading.classList.add('d-none');
            processForm(uvIndex, latitude);
        } catch (error) {
            showError('Erro ao obter dados de UV. Tente novamente mais tarde.');
        }
    }

    // Form submission handler
    userForm.addEventListener('submit', event => {
        event.preventDefault();
        const skinType = document.getElementById('skinType').value;
        const clothing = document.getElementById('clothing').value;
        const age = parseInt(document.getElementById('age').value);

        // Save preferences
        localStorage.setItem('skinType', skinType);
        localStorage.setItem('clothing', clothing);
        localStorage.setItem('age', age);

        // Re-fetch UV data if needed
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => fetchUVData(position.coords.latitude, position.coords.longitude),
                error => showError('Erro ao obter geolocalização.')
            );
        }
    });

    // Process form and calculate results
    function processForm(uvIndex, latitude) {
        const skinType = parseInt(document.getElementById('skinType').value);
        const clothing = parseFloat(document.getElementById('clothing').value);
        const age = parseInt(document.getElementById('age').value);

        if (!skinType || !clothing || !age) {
            showError('Por favor, preencha todos os campos.');
            return;
        }

        // Calculate Vitamin D Rate
        const baseRate = 21000; // IU/hr
        const uvFactor = (uvIndex * 3.0) / (4.0 + uvIndex);
        const skinTypeFactor = [1.25, 1.10, 1.00, 0.70, 0.40, 0.20][skinType - 1];
        const ageFactor = age <= 20 ? 1.0 : age >= 70 ? 0.25 : 1.0 - ((age - 20) * 0.01);
        const qualityFactor = getQualityFactor(); // Simplified for web app
        const adaptationFactor = 1.0; // Placeholder (no HealthKit in web app)

        const vitaminDRate = baseRate * uvFactor * clothing * skinTypeFactor * ageFactor * qualityFactor * adaptationFactor;

        // Calculate Burn Time
        const medValues = [150, 250, 425, 600, 850, 1100]; // Minutes at UV 1
        const burnTime = (medValues[skinType - 1] / uvIndex) * 0.8; // 80% of MED for safety

        // Display Results
        uvIndexSpan.textContent = uvIndex.toFixed(1);
        vitaminDRateSpan.textContent = vitaminDRate.toFixed(0);
        burnTimeSpan.textContent = burnTime.toFixed(0);
        resultsDiv.classList.remove('d-none');

        // Winter Warning
        const month = new Date().getMonth(); // 0 = January, 10 = November
        if (Math.abs(latitude) > 35 && (month >= 10 || month <= 1)) {
            winterWarning.classList.remove('d-none');
        } else {
            winterWarning.classList.add('d-none');
        }
    }

    // Simplified Quality Factor based on time of day
    function getQualityFactor() {
        const hour = new Date().getHours();
        if (hour >= 10 && hour <= 15) return 1.0; // Peak UV-B around solar noon
        if (hour >= 8 && hour < 10 || hour > 15 && hour <= 18) return Math.exp(-0.2);
        return Math.exp(-0.3); // Morning/evening
    }

    // Show error message
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        loading.classList.add('d-none');
    }
});
