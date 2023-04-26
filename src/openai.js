import { Configuration, OpenAIApi } from "openai"
import { createReadStream } from "fs"
import config from "config"

class OpenAI {
    constructor(apiKey) {
        const configuration = new Configuration({
            apiKey,
        });
        this.openai = new OpenAIApi(configuration);
    }

    chat() { }

    async transcription(filepath) {
        try {
            const response = await this.openai.createTranscription(
                createReadStream(filepath),
                'whisper-1'
            )

            return response.data.text
        } catch (e) {
            console.log('Error while transcription', e.message);
        }
    }
}

export const openai = new OpenAI(config.get("OPENAI_KEY"))