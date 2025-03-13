require('dotenv').config();
const fetch = require("node-fetch");

const API_KEY = process.env.EVENLABS_API_KEY;

if (!API_KEY) {
    console.error("❌ Erreur : Clé API ElevenLabs manquante !");
    process.exit(1);
}

async function getFrenchVoices() {
    try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            method: "GET",
            headers: { "xi-api-key": API_KEY }
        });

        if (!response.ok) throw new Error(`Erreur API ElevenLabs : ${response.statusText}`);

        const data = await response.json();

        // 🔥 Filtre uniquement les voix qui ont "fr" ou "french" dans labels ou verified_languages
        const frenchVoices = data.voices.filter(voice => 
            (voice.labels && Object.values(voice.labels).some(label => label.toLowerCase().includes("french") || label.toLowerCase().includes("fr"))) ||
            (voice.verified_languages && voice.verified_languages.some(lang => lang.language === "fr"))
        );

        // 🎤 Affiche les résultats
        console.log("🔍 Voix françaises disponibles :");
        frenchVoices.forEach(voice => {
            console.log(`🗣️ Nom: ${voice.name} | ID: ${voice.voice_id}`);
            console.log(`🎧 Pré-écoute : ${voice.preview_url}`);
            console.log("----------------------");
        });

    } catch (error) {
        console.error("❌ Erreur :", error);
    }
}

getFrenchVoices();
